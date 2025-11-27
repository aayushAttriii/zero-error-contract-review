/**
 * Privilege and PHI Flagging Engine
 * Detects attorney-client privilege, PHI, and confidentiality clauses
 */

// Flag patterns with severity levels
const FLAG_PATTERNS = {
    PRIVILEGE: {
      keywords: [
        'attorney-client',
        'attorney client',
        'legal advice',
        'privileged',
        'work product',
        'opinion of counsel',
        'confidential legal',
        'counsel advised',
        'legal counsel'
      ],
      proximityPatterns: [
        { words: ['attorney', 'advice'], distance: 5 },
        { words: ['counsel', 'opinion'], distance: 5 },
        { words: ['lawyer', 'privileged'], distance: 5 },
        { words: ['legal', 'privileged'], distance: 3 }
      ],
      severity: 'HIGH',
      excerptLength: 100
    },
    
    PHI: {
      keywords: [
        'diagnosis',
        'treatment',
        'medical history',
        'patient',
        'HIV',
        'AIDS',
        'psychiatric',
        'mental health',
        'prescription',
        'medication',
        'surgery',
        'hospitalization',
        'medical condition',
        'health information',
        'HIPAA'
      ],
      proximityPatterns: [
        { words: ['patient', 'diagnosed'], distance: 5 },
        { words: ['medical', 'condition'], distance: 3 },
        { words: ['health', 'records'], distance: 3 }
      ],
      severity: 'HIGH',
      excerptLength: 100
    },
    
    CONFIDENTIALITY: {
      keywords: [
        'confidential',
        'proprietary',
        'trade secret',
        'non-disclosure',
        'NDA',
        'confidentiality agreement',
        'secret information',
        'proprietary information'
      ],
      proximityPatterns: [
        { words: ['confidential', 'information'], distance: 3 },
        { words: ['trade', 'secret'], distance: 2 }
      ],
      severity: 'MEDIUM',
      excerptLength: 80
    },
    
    FINANCIAL_SENSITIVE: {
      keywords: [
        'bank account',
        'routing number',
        'account number',
        'financial records',
        'tax return',
        'W-2',
        '1099',
        'salary',
        'compensation details'
      ],
      proximityPatterns: [
        { words: ['bank', 'account'], distance: 2 },
        { words: ['financial', 'information'], distance: 3 }
      ],
      severity: 'HIGH',
      excerptLength: 80
    }
  };
  
  /**
   * Check if words are within proximity distance
   */
  function checkProximity(text, words, distance) {
    const lowerText = text.toLowerCase();
    const positions = words.map(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = [];
      let match;
      while ((match = regex.exec(lowerText)) !== null) {
        matches.push(match.index);
      }
      return matches;
    });
    
    // Check if any combination of positions is within distance
    for (let i = 0; i < positions.length - 1; i++) {
      for (const pos1 of positions[i]) {
        for (const pos2 of positions[i + 1]) {
          const wordDistance = Math.abs(pos2 - pos1);
          const avgWordLength = 6; // Approximate
          if (wordDistance <= distance * avgWordLength) {
            return { found: true, position: Math.min(pos1, pos2) };
          }
        }
      }
    }
    
    return { found: false, position: -1 };
  }
  
  /**
   * Extract excerpt around position
   */
  function extractExcerpt(text, position, length = 100) {
    const halfLength = Math.floor(length / 2);
    const start = Math.max(0, position - halfLength);
    const end = Math.min(text.length, position + halfLength);
    
    let excerpt = text.slice(start, end).trim();
    
    // Add ellipsis if truncated
    if (start > 0) excerpt = '...' + excerpt;
    if (end < text.length) excerpt = excerpt + '...';
    
    return excerpt;
  }
  
  /**
   * Find keyword matches
   */
  function findKeywordMatches(text, pattern, type) {
    const matches = [];
    const lowerText = text.toLowerCase();
    
    // Check simple keywords
    for (const keyword of pattern.keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      let match;
      
      while ((match = regex.exec(lowerText)) !== null) {
        matches.push({
          type,
          position: match.index,
          matchedText: keyword,
          reason: `Contains keyword: "${keyword}"`,
          severity: pattern.severity,
          excerpt: extractExcerpt(text, match.index, pattern.excerptLength)
        });
      }
    }
    
    return matches;
  }
  
  /**
   * Find proximity pattern matches
   */
  function findProximityMatches(text, pattern, type) {
    const matches = [];
    
    for (const proximityPattern of pattern.proximityPatterns) {
      const result = checkProximity(
        text,
        proximityPattern.words,
        proximityPattern.distance
      );
      
      if (result.found) {
        matches.push({
          type,
          position: result.position,
          matchedText: proximityPattern.words.join(' + '),
          reason: `Contains related terms: ${proximityPattern.words.join(', ')} within ${proximityPattern.distance} words`,
          severity: pattern.severity,
          excerpt: extractExcerpt(text, result.position, pattern.excerptLength)
        });
      }
    }
    
    return matches;
  }
  
  /**
   * Detect risky clauses using heuristics
   */
  function detectRiskyClauses(text) {
    const riskyPatterns = [
      {
        regex: /unlimited\s+liability/gi,
        type: 'RISKY_CLAUSE',
        reason: 'Unlimited liability clause detected',
        severity: 'HIGH'
      },
      {
        regex: /waive\s+all\s+rights/gi,
        type: 'RISKY_CLAUSE',
        reason: 'Rights waiver clause detected',
        severity: 'HIGH'
      },
      {
        regex: /no\s+warranty/gi,
        type: 'RISKY_CLAUSE',
        reason: 'No warranty clause detected',
        severity: 'MEDIUM'
      },
      {
        regex: /as\s+is\s+basis/gi,
        type: 'RISKY_CLAUSE',
        reason: '"As is" basis clause detected',
        severity: 'MEDIUM'
      },
      {
        regex: /indemnif(y|ication)/gi,
        type: 'INDEMNIFICATION',
        reason: 'Indemnification clause detected',
        severity: 'MEDIUM'
      }
    ];
    
    const matches = [];
    
    for (const pattern of riskyPatterns) {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        matches.push({
          type: pattern.type,
          position: match.index,
          matchedText: match[0],
          reason: pattern.reason,
          severity: pattern.severity,
          excerpt: extractExcerpt(text, match.index, 80)
        });
      }
    }
    
    return matches;
  }
  
  /**
   * Merge duplicate flags at similar positions
   */
  function mergeDuplicateFlags(flags) {
    if (flags.length === 0) return [];
    
    const merged = [];
    const mergeDistance = 50; // characters
    
    flags.sort((a, b) => a.position - b.position);
    
    let current = flags[0];
    
    for (let i = 1; i < flags.length; i++) {
      const next = flags[i];
      
      if (
        next.type === current.type &&
        Math.abs(next.position - current.position) <= mergeDistance
      ) {
        // Merge - combine reasons
        if (!current.reason.includes(next.reason)) {
          current.reason += '; ' + next.reason;
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
   * Main flagging function
   */
  export function flagSensitiveContent(text, options = {}) {
    if (!text || typeof text !== 'string') {
      return {
        flags: [],
        summary: {}
      };
    }
    
    const {
      flagPrivilege = true,
      flagPHI = true,
      flagConfidentiality = true,
      flagRiskyTerms = true
    } = options;
    
    let allFlags = [];
    
    // Process each flag type
    for (const [type, pattern] of Object.entries(FLAG_PATTERNS)) {
      // Skip based on options
      if (type === 'PRIVILEGE' && !flagPrivilege) continue;
      if (type === 'PHI' && !flagPHI) continue;
      if (type === 'CONFIDENTIALITY' && !flagConfidentiality) continue;
      
      // Find keyword matches
      const keywordMatches = findKeywordMatches(text, pattern, type);
      allFlags = allFlags.concat(keywordMatches);
      
      // Find proximity matches
      const proximityMatches = findProximityMatches(text, pattern, type);
      allFlags = allFlags.concat(proximityMatches);
    }
    
    // Detect risky clauses
    if (flagRiskyTerms) {
      const riskyFlags = detectRiskyClauses(text);
      allFlags = allFlags.concat(riskyFlags);
    }
    
    // Merge duplicates
    const mergedFlags = mergeDuplicateFlags(allFlags);
    
    // Generate IDs and format
    const flags = mergedFlags.map((flag, index) => ({
      id: `F${index + 1}`,
      type: flag.type,
      excerpt: flag.excerpt,
      start: flag.position,
      end: flag.position + flag.matchedText.length,
      reason: flag.reason,
      severity: flag.severity
    }));
    
    // Generate summary
    const summary = {};
    for (const flag of flags) {
      summary[flag.type] = (summary[flag.type] || 0) + 1;
    }
    summary.total = flags.length;
    
    // Calculate risk metrics
    const highSeverityCount = flags.filter(f => f.severity === 'HIGH').length;
    summary.highSeverity = highSeverityCount;
    summary.riskLevel = highSeverityCount > 3 ? 'HIGH' : 
                        highSeverityCount > 0 ? 'MEDIUM' : 'LOW';
    
    return {
      flags,
      summary
    };
  }