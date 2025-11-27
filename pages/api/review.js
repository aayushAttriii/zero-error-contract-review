/**
 * Main Contract Review API Endpoint
 * Handles file uploads, text processing, redaction, and flagging
 */

import formidable from 'formidable';
import fs from 'fs';
import { redactText } from '../../lib/redact';
import { flagSensitiveContent } from '../../lib/flagging';
import { performFullAnalysis } from '../../lib/aiAnalyzer';
import { extractText, validateExtractedText, cleanExtractedText } from '../../lib/pdfExtractor';
import { generateHIPAAReport, generateHIPAAReportText, quickHIPAACheck } from '../../lib/hipaaReport';
import { generateRedactedPDF, generateHIPAAReportPDF } from '../../lib/pdfExport';

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '10mb'
  }
};

/**
 * Parse multipart form data
 */
function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only POST requests are supported'
    });
  }

  try {
    const startTime = Date.now();

    // Parse form data
    const { fields, files } = await parseForm(req);

    // Get options
    const options = fields.options ? JSON.parse(fields.options) : {};
    const {
      redactPII = true,
      redactPHI = true,
      flagPrivilege = true,
      flagConfidentiality = true,
      useAI = false,
      generateHIPAA = false,
      exportPDF = false,
      documentName = 'Untitled Document'
    } = options;

    let text = '';
    let extractionMetadata = null;

    // Extract text from file or use provided text
    if (files.file) {
      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      const buffer = fs.readFileSync(file.filepath);
      
      try {
        const extracted = await extractText(buffer, file.originalFilename || 'document.txt');
        text = cleanExtractedText(extracted.text);
        extractionMetadata = {
          filename: file.originalFilename,
          size: file.size,
          pages: extracted.pages,
          metadata: extracted.metadata
        };

        // Validate extracted text
        const validation = validateExtractedText(text);
        if (!validation.valid) {
          return res.status(400).json({
            error: 'Text extraction failed',
            message: validation.error,
            details: validation
          });
        }
      } finally {
        // Clean up temp file
        fs.unlinkSync(file.filepath);
      }
    } else if (fields.text) {
      text = Array.isArray(fields.text) ? fields.text[0] : fields.text;
    } else {
      return res.status(400).json({
        error: 'No input provided',
        message: 'Please provide either a file or text'
      });
    }

    // Validate text length
    if (text.length > 500000) {
      return res.status(400).json({
        error: 'Text too long',
        message: 'Maximum text length is 500,000 characters'
      });
    }

    // Perform redaction
    console.log('Starting redaction...');
    const redactionResult = redactText(text, {
      redactPII,
      redactPHI
    });

    // Perform flagging
    console.log('Starting flagging...');
    const flaggingResult = flagSensitiveContent(text, {
      flagPrivilege,
      flagConfidentiality
    });

    // Prepare base response
    const response = {
      originalText: text,
      redactedText: redactionResult.redactedText,
      redactions: redactionResult.redactions,
      flags: flaggingResult.flags,
      summary: {
        ...redactionResult.summary,
        flags: flaggingResult.flags.length,
        totalRedactions: redactionResult.redactions.length,
        riskLevel: flaggingResult.summary.riskLevel
      },
      extractionMetadata,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    // Perform AI analysis if requested
    if (useAI) {
      try {
        console.log('Starting AI analysis...');
        const aiStartTime = Date.now();

        const aiAnalysis = await performFullAnalysis(text, {
          includeEntities: true,
          includeObligations: true,
          includeRisks: true,
          includeCompliance: true,
          includeSummary: true,
          includeRedactionSuggestions: true,
          existingRedactions: redactionResult.redactions
        });

        response.aiAnalysis = aiAnalysis;
        response.aiProcessingTime = Date.now() - aiStartTime;
      } catch (aiError) {
        console.error('AI analysis failed:', aiError);
        response.aiAnalysis = {
          error: 'AI analysis failed',
          message: aiError.message
        };
      }
    }

    // Generate HIPAA Compliance Report if requested
    if (generateHIPAA) {
      try {
        console.log('Generating HIPAA compliance report...');
        const hipaaReport = generateHIPAAReport(
          text,
          redactionResult.redactions,
          flaggingResult.flags,
          {
            documentName: extractionMetadata?.filename || documentName,
            documentType: 'Healthcare Document',
            includeFullDetails: true
          }
        );

        response.hipaaReport = hipaaReport;
        response.hipaaReportText = generateHIPAAReportText(hipaaReport);
        response.hipaaQuickCheck = quickHIPAACheck(
          redactionResult.redactions,
          flaggingResult.flags
        );
      } catch (hipaaError) {
        console.error('HIPAA report generation failed:', hipaaError);
        response.hipaaReport = {
          error: 'HIPAA report generation failed',
          message: hipaaError.message
        };
      }
    }

    // Generate PDF exports if requested
    if (exportPDF) {
      try {
        console.log('Generating PDF exports...');

        // Generate redacted document PDF
        const redactedPDF = await generateRedactedPDF({
          originalText: text,
          redactedText: redactionResult.redactedText,
          redactions: redactionResult.redactions,
          flags: flaggingResult.flags,
          documentName: extractionMetadata?.filename || documentName,
          includeOriginal: false,
          includeMetadata: true
        });

        response.redactedPDF = redactedPDF.toString('base64');

        // Generate HIPAA report PDF if HIPAA report was generated
        if (response.hipaaReport && !response.hipaaReport.error) {
          const hipaaReportPDF = await generateHIPAAReportPDF(response.hipaaReport);
          response.hipaaReportPDF = hipaaReportPDF.toString('base64');
        }
      } catch (pdfError) {
        console.error('PDF generation failed:', pdfError);
        response.pdfExport = {
          error: 'PDF generation failed',
          message: pdfError.message
        };
      }
    }

    // Return response
    return res.status(200).json(response);

  } catch (error) {
    console.error('Review endpoint error:', error);
    
    return res.status(500).json({
      error: 'Processing failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Health check endpoint
 */
export async function healthCheck(req, res) {
  const azureOpenAIConfigured = !!(process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT);

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    features: {
      redaction: true,
      flagging: true,
      pdfExtraction: true,
      aiAnalysis: azureOpenAIConfigured
    }
  });
}