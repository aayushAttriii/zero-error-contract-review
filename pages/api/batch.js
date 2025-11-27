/**
 * Batch Processing API Endpoint
 * Handles multiple contract uploads and returns aggregate analysis
 */

import formidable from 'formidable';
import fs from 'fs';
import { redactText } from '../../lib/redact';
import { flagSensitiveContent } from '../../lib/flagging';
import { extractText, cleanExtractedText } from '../../lib/pdfExtractor';
import { quickHIPAACheck } from '../../lib/hipaaReport';

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '50mb'
  }
};

/**
 * Parse multipart form data with multiple files
 */
function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB per file
      maxFiles: 20, // Max 20 files
      keepExtensions: true,
      multiples: true
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

/**
 * Process a single document
 */
async function processDocument(file, options) {
  const startTime = Date.now();

  try {
    const buffer = fs.readFileSync(file.filepath);
    const extracted = await extractText(buffer, file.originalFilename || 'document.txt');
    const text = cleanExtractedText(extracted.text);

    // Perform redaction
    const redactionResult = redactText(text, {
      redactPII: options.redactPII !== false,
      redactPHI: options.redactPHI !== false
    });

    // Perform flagging
    const flaggingResult = flagSensitiveContent(text, {
      flagPrivilege: options.flagPrivilege !== false,
      flagConfidentiality: options.flagConfidentiality !== false
    });

    // Quick HIPAA check
    const hipaaCheck = quickHIPAACheck(redactionResult.redactions, flaggingResult.flags);

    return {
      success: true,
      filename: file.originalFilename,
      size: file.size,
      pages: extracted.pages,
      processingTime: Date.now() - startTime,
      summary: {
        totalRedactions: redactionResult.redactions.length,
        redactionsByType: redactionResult.summary,
        totalFlags: flaggingResult.flags.length,
        flagsByType: groupByType(flaggingResult.flags),
        riskLevel: flaggingResult.summary.riskLevel,
        hipaaRiskLevel: hipaaCheck.riskLevel
      },
      redactions: redactionResult.redactions,
      flags: flaggingResult.flags,
      hipaaCheck
    };
  } catch (error) {
    return {
      success: false,
      filename: file.originalFilename,
      error: error.message,
      processingTime: Date.now() - startTime
    };
  } finally {
    // Clean up temp file
    try {
      fs.unlinkSync(file.filepath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Group flags by type
 */
function groupByType(flags) {
  const grouped = {};
  for (const flag of flags) {
    grouped[flag.type] = (grouped[flag.type] || 0) + 1;
  }
  return grouped;
}

/**
 * Calculate aggregate statistics
 */
function calculateAggregateStats(results) {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  // Aggregate redaction counts
  const redactionTotals = {};
  let totalRedactions = 0;

  // Aggregate flag counts
  const flagTotals = {};
  let totalFlags = 0;

  // Risk distribution
  const riskDistribution = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  const hipaaRiskDistribution = { HIGH: 0, MEDIUM: 0, LOW: 0 };

  // Top issues
  const allFlags = [];

  for (const result of successful) {
    // Count redactions
    totalRedactions += result.summary.totalRedactions;
    for (const [type, count] of Object.entries(result.summary.redactionsByType)) {
      if (type !== 'totalRedactions') {
        redactionTotals[type] = (redactionTotals[type] || 0) + count;
      }
    }

    // Count flags
    totalFlags += result.summary.totalFlags;
    for (const [type, count] of Object.entries(result.summary.flagsByType)) {
      flagTotals[type] = (flagTotals[type] || 0) + count;
    }

    // Risk distribution
    const risk = result.summary.riskLevel || 'LOW';
    riskDistribution[risk] = (riskDistribution[risk] || 0) + 1;

    const hipaaRisk = result.summary.hipaaRiskLevel || 'LOW';
    hipaaRiskDistribution[hipaaRisk] = (hipaaRiskDistribution[hipaaRisk] || 0) + 1;

    // Collect all flags with document context
    for (const flag of result.flags) {
      allFlags.push({
        ...flag,
        document: result.filename
      });
    }
  }

  // Sort flags by severity
  const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  allFlags.sort((a, b) => (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2));

  return {
    totalDocuments: results.length,
    successfulDocuments: successful.length,
    failedDocuments: failed.length,
    totalProcessingTime: results.reduce((sum, r) => sum + (r.processingTime || 0), 0),

    redactions: {
      total: totalRedactions,
      byType: redactionTotals,
      averagePerDocument: successful.length > 0 ? Math.round(totalRedactions / successful.length) : 0
    },

    flags: {
      total: totalFlags,
      byType: flagTotals,
      averagePerDocument: successful.length > 0 ? Math.round(totalFlags / successful.length) : 0
    },

    riskDistribution,
    hipaaRiskDistribution,

    topIssues: allFlags.slice(0, 10),

    documentsAtRisk: {
      high: successful.filter(r => r.summary.riskLevel === 'HIGH').map(r => r.filename),
      medium: successful.filter(r => r.summary.riskLevel === 'MEDIUM').map(r => r.filename)
    }
  };
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are supported'
    });
  }

  try {
    const batchStartTime = Date.now();

    // Parse form data
    const { fields, files } = await parseForm(req);

    // Get options
    const options = fields.options ? JSON.parse(Array.isArray(fields.options) ? fields.options[0] : fields.options) : {};

    // Get all uploaded files
    let uploadedFiles = files.files || files.file || [];
    if (!Array.isArray(uploadedFiles)) {
      uploadedFiles = [uploadedFiles];
    }

    if (uploadedFiles.length === 0) {
      return res.status(400).json({
        error: 'No files provided',
        message: 'Please upload at least one file'
      });
    }

    // Process all documents
    const results = await Promise.all(
      uploadedFiles.map(file => processDocument(file, options))
    );

    // Calculate aggregate statistics
    const aggregateStats = calculateAggregateStats(results);

    // Return response
    return res.status(200).json({
      success: true,
      batchId: `batch_${Date.now()}`,
      timestamp: new Date().toISOString(),
      totalProcessingTime: Date.now() - batchStartTime,
      aggregate: aggregateStats,
      documents: results
    });

  } catch (error) {
    console.error('Batch processing error:', error);

    return res.status(500).json({
      error: 'Batch processing failed',
      message: error.message
    });
  }
}
