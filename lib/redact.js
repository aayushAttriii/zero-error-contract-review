/**
 * Deterministic PII/PHI Redaction Engine
 * Handles regex-based redaction with position tracking
 */

// Redaction patterns with priority order (higher priority = processed first)
const REDACTION_PATTERNS = [
    {
      type: 'SSN',
      regex: /\b\d{3}-\d{2}-\d{4}\b/g,
      priority: 10,
      confidence: 'high'
    },
    {
      type: 'CREDIT_CARD',
      regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
      priority: 9,
      confidence: 'high',
      validator: luhnCheck
    },
    // Bank Account & Routing Numbers
    {
      type: 'BANK_ACCOUNT',
      regex: /\b(?:account\s*(?:number|#|no\.?)?[\s:]*)?(\d{8,17})\b/gi,
      priority: 9,
      confidence: 'medium',
      validator: validateBankAccount
    },
    {
      type: 'ROUTING_NUMBER',
      regex: /\b(?:routing\s*(?:number|#|no\.?)?[\s:]*)?(\d{9})\b/gi,
      priority: 9,
      confidence: 'medium',
      validator: validateRoutingNumber
    },
    {
      type: 'IBAN',
      regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/g,
      priority: 9,
      confidence: 'high'
    },
    // Medical Record Number (MRN)
    {
      type: 'MRN',
      regex: /\b(?:MRN|medical\s*record\s*(?:number|#|no\.?)?|patient\s*(?:id|number|#))[\s:]*([A-Z0-9]{6,12})\b/gi,
      priority: 9,
      confidence: 'high'
    },
    // Salary & Compensation
    {
      type: 'SALARY',
      regex: /\b(?:salary|compensation|annual\s*(?:pay|income|wage)|base\s*(?:pay|salary)|hourly\s*(?:rate|wage)|pay\s*rate)[\s:]*\$?\s*[\d,]+(?:\.\d{2})?\s*(?:per\s*(?:year|annum|hour|month|week))?\b/gi,
      priority: 8,
      confidence: 'high'
    },
    {
      type: 'SALARY',
      regex: /\$\s*[\d,]+(?:\.\d{2})?\s*(?:per\s*(?:year|annum|hour|month|week)|\/\s*(?:yr|hr|mo|wk)|annually|monthly|hourly)\b/gi,
      priority: 8,
      confidence: 'high'
    },
    {
      type: 'SALARY',
      regex: /\b(?:earns?|paid|paying|receives?|making)\s*\$\s*[\d,]+(?:\.\d{2})?\b/gi,
      priority: 8,
      confidence: 'medium'
    },
    {
      type: 'EMAIL',
      regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
      priority: 8,
      confidence: 'high'
    },
    {
      type: 'PHONE',
      regex: /(?:\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|\+\d{1,3}[\s\d.-]{9,15}/g,
      priority: 7,
      confidence: 'high',
      validator: validatePhone
    },
    {
      type: 'DATE',
      regex: /\b(0?[1-9]|1[0-2])[-\/\.](0?[1-9]|[12]\d|3[01])[-\/\.](\d{2,4})\b/g,
      priority: 6,
      confidence: 'medium'
    },
    {
      type: 'IP_ADDRESS',
      regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
      priority: 5,
      confidence: 'high'
    },
    {
      type: 'ADDRESS',
      regex: /\b\d{1,6}\s+(?:[A-Z][a-z]+\s+){1,3}(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Circle|Cir|Place|Pl)(?:\s+(?:Apt|Unit|Suite|Ste|#)\.?\s*\w+)?\b/gi,
      priority: 4,
      confidence: 'medium'
    },
    {
      type: 'TITLE_NAME',
      regex: /\b(Mr|Ms|Mrs|Dr|Prof|Rev)\.?\s+[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)?\b/g,
      priority: 3,
      confidence: 'medium'
    }
  ];
  
  /**
   * Luhn algorithm for credit card validation
   */
  function luhnCheck(cardNumber) {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }
  
  /**
   * Validate phone number (simple length check)
   */
  function validatePhone(phone) {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }

  /**
   * Validate bank account number
   * US bank accounts are typically 8-17 digits
   * Must have context (preceded by account-related keywords) or be in valid range
   */
  function validateBankAccount(match) {
    const digits = match.replace(/\D/g, '');
    // Check if it's in the valid range for bank accounts
    if (digits.length < 8 || digits.length > 17) return false;
    // Avoid matching years, zip codes, or other common number patterns
    const num = parseInt(digits, 10);
    // Skip if it looks like a year (1900-2100)
    if (digits.length === 4 && num >= 1900 && num <= 2100) return false;
    // Skip if it looks like a zip code (5 digits)
    if (digits.length === 5) return false;
    // Check if preceded by account-related keywords (context-aware)
    const lowerMatch = match.toLowerCase();
    if (lowerMatch.includes('account') || lowerMatch.includes('acct')) {
      return true;
    }
    // For standalone numbers, require longer length to be more confident
    return digits.length >= 10;
  }

  /**
   * Validate routing number using ABA checksum
   * US routing numbers are exactly 9 digits with a specific checksum
   */
  function validateRoutingNumber(match) {
    const digits = match.replace(/\D/g, '');
    if (digits.length !== 9) return false;

    // Check if preceded by routing-related keywords
    const lowerMatch = match.toLowerCase();
    const hasContext = lowerMatch.includes('routing') || lowerMatch.includes('aba');

    // ABA routing number checksum validation
    // Formula: 3(d1 + d4 + d7) + 7(d2 + d5 + d8) + (d3 + d6 + d9) mod 10 = 0
    const d = digits.split('').map(Number);
    const checksum = (3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8])) % 10;

    // Valid if has context OR passes checksum
    return hasContext || checksum === 0;
  }
  
  /**
   * Find all matches for a pattern in text
   */
  function findMatches(text, pattern) {
    const matches = [];
    let match;
    
    while ((match = pattern.regex.exec(text)) !== null) {
      const original = match[0];
      
      // Apply validator if exists
      if (pattern.validator && !pattern.validator(original)) {
        continue;
      }
      
      matches.push({
        type: pattern.type,
        original,
        start: match.index,
        end: match.index + original.length,
        confidence: pattern.confidence,
        priority: pattern.priority
      });
    }
    
    return matches;
  }
  
  /**
   * Merge overlapping redactions
   */
  function mergeOverlaps(redactions) {
    if (redactions.length === 0) return [];
    
    // Sort by start position
    redactions.sort((a, b) => a.start - b.start || b.priority - a.priority);
    
    const merged = [];
    let current = redactions[0];
    
    for (let i = 1; i < redactions.length; i++) {
      const next = redactions[i];
      
      if (next.start <= current.end) {
        // Overlapping - merge and keep higher priority type
        current.end = Math.max(current.end, next.end);
        if (next.priority > current.priority) {
          current.type = next.type;
          current.confidence = next.confidence;
        }
      } else {
        merged.push(current);
        current = next;
      }
    }
    
    merged.push(current);
    return merged;
  }
  
  /**
   * Main redaction function
   */
  export function redactText(text, options = {}) {
    if (!text || typeof text !== 'string') {
      return {
        redactedText: '',
        redactions: [],
        summary: {}
      };
    }
    
    const {
      redactPII = true,
      redactPHI = true,
      customPatterns = []
    } = options;
    
    // Find all matches
    let allMatches = [];
    const patterns = [...REDACTION_PATTERNS, ...customPatterns];
    
    for (const pattern of patterns) {
      const matches = findMatches(text, pattern);
      allMatches = allMatches.concat(matches);
    }
    
    // Merge overlapping redactions
    const mergedMatches = mergeOverlaps(allMatches);
    
    // Generate redactions with IDs
    const typeCounts = {};
    const redactions = mergedMatches.map((match, index) => {
      typeCounts[match.type] = (typeCounts[match.type] || 0) + 1;
      
      return {
        id: `${match.type}#${typeCounts[match.type]}`,
        type: match.type,
        original: match.original,
        start: match.start,
        end: match.end,
        confidence: match.confidence
      };
    });
    
    // Build redacted text by replacing from end to start (to preserve indices)
    let redactedText = text;
    for (let i = redactions.length - 1; i >= 0; i--) {
      const redaction = redactions[i];
      const replacement = `[REDACTED:${redaction.id}]`;
      redactedText = 
        redactedText.slice(0, redaction.start) + 
        replacement + 
        redactedText.slice(redaction.end);
    }
    
    // Generate summary
    const summary = {};
    for (const [type, count] of Object.entries(typeCounts)) {
      summary[type.toLowerCase()] = count;
    }
    summary.totalRedactions = redactions.length;

    return {
      redactedText,
      redactions,
      summary
    };
  }
  
  /**
   * Restore redacted text (for testing/debugging)
   */
  export function restoreText(redactedText, redactions) {
    let restored = redactedText;
    
    // Sort by start position (descending) to maintain indices
    const sorted = [...redactions].sort((a, b) => b.start - a.start);
    
    for (const redaction of sorted) {
      const placeholder = `[REDACTED:${redaction.id}]`;
      restored = restored.replace(placeholder, redaction.original);
    }
    
    return restored;
  }
  
  /**
   * Add custom redaction pattern
   */
  export function addCustomPattern(type, regex, options = {}) {
    return {
      type,
      regex,
      priority: options.priority || 1,
      confidence: options.confidence || 'low',
      validator: options.validator
    };
  }