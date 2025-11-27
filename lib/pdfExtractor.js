/**
 * PDF Text Extraction with error handling
 * Supports both pdf-parse and fallback methods
 */

import pdf from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Extract text from PDF buffer
 */
export async function extractFromPDF(buffer) {
  try {
    const data = await pdf(buffer);
    
    return {
      text: data.text,
      pages: data.numpages,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
        creator: data.info?.Creator,
        producer: data.info?.Producer,
        creationDate: data.info?.CreationDate,
        modificationDate: data.info?.ModDate
      },
      success: true
    };
  } catch (error) {
    console.error('PDF extraction failed:', error);
    throw new Error(`Failed to extract PDF: ${error.message}`);
  }
}

/**
 * Extract text from DOCX buffer
 */
export async function extractFromDOCX(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    
    return {
      text: result.value,
      messages: result.messages,
      success: true
    };
  } catch (error) {
    console.error('DOCX extraction failed:', error);
    throw new Error(`Failed to extract DOCX: ${error.message}`);
  }
}

/**
 * Extract text from TXT buffer
 */
export function extractFromTXT(buffer) {
  try {
    const text = buffer.toString('utf-8');
    
    return {
      text,
      success: true
    };
  } catch (error) {
    console.error('TXT extraction failed:', error);
    throw new Error(`Failed to extract TXT: ${error.message}`);
  }
}

/**
 * Auto-detect file type and extract text
 */
export async function extractText(buffer, filename) {
  const extension = filename.split('.').pop().toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return await extractFromPDF(buffer);
    
    case 'docx':
    case 'doc':
      return await extractFromDOCX(buffer);
    
    case 'txt':
      return extractFromTXT(buffer);
    
    default:
      // Try as text first
      try {
        return extractFromTXT(buffer);
      } catch {
        throw new Error(`Unsupported file type: ${extension}`);
      }
  }
}

/**
 * Validate extracted text
 */
export function validateExtractedText(text) {
  if (!text || typeof text !== 'string') {
    return {
      valid: false,
      error: 'No text extracted'
    };
  }
  
  if (text.trim().length === 0) {
    return {
      valid: false,
      error: 'Extracted text is empty'
    };
  }
  
  if (text.length < 50) {
    return {
      valid: true,
      warning: 'Extracted text is very short (< 50 characters)'
    };
  }
  
  // Check for garbled text (high percentage of non-printable characters)
  const printableChars = text.match(/[\x20-\x7E\n\r\t]/g) || [];
  const printableRatio = printableChars.length / text.length;
  
  if (printableRatio < 0.8) {
    return {
      valid: false,
      error: 'Extracted text appears corrupted or encoded'
    };
  }
  
  return {
    valid: true,
    wordCount: text.split(/\s+/).length,
    charCount: text.length
  };
}

/**
 * Clean extracted text (remove excessive whitespace, etc.)
 */
export function cleanExtractedText(text) {
  if (!text) return '';
  
  return text
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    // Remove excessive blank lines (more than 2)
    .replace(/\n{3,}/g, '\n\n')
    // Remove excessive spaces
    .replace(/ {2,}/g, ' ')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Trim overall
    .trim();
}