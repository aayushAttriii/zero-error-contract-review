/**
 * HIPAA Compliance Report Generator
 * Generates detailed compliance reports for healthcare documents
 */

// HIPAA PHI Categories (18 identifiers)
const HIPAA_PHI_CATEGORIES = {
  NAMES: {
    label: 'Names',
    description: 'Patient names, relatives, employers',
    redactionTypes: ['TITLE_NAME'],
    severity: 'HIGH'
  },
  GEOGRAPHIC: {
    label: 'Geographic Data',
    description: 'Addresses, city, state, zip codes smaller than state',
    redactionTypes: ['ADDRESS'],
    severity: 'HIGH'
  },
  DATES: {
    label: 'Dates',
    description: 'Birth date, admission date, discharge date, death date, ages over 89',
    redactionTypes: ['DATE'],
    severity: 'HIGH'
  },
  PHONE: {
    label: 'Phone Numbers',
    description: 'Telephone numbers',
    redactionTypes: ['PHONE'],
    severity: 'HIGH'
  },
  FAX: {
    label: 'Fax Numbers',
    description: 'Fax numbers',
    redactionTypes: ['PHONE'], // Often same pattern
    severity: 'HIGH'
  },
  EMAIL: {
    label: 'Email Addresses',
    description: 'Electronic mail addresses',
    redactionTypes: ['EMAIL'],
    severity: 'HIGH'
  },
  SSN: {
    label: 'Social Security Numbers',
    description: 'Social Security numbers',
    redactionTypes: ['SSN'],
    severity: 'CRITICAL'
  },
  MRN: {
    label: 'Medical Record Numbers',
    description: 'Medical record numbers',
    redactionTypes: ['MRN'],
    severity: 'CRITICAL'
  },
  HEALTH_PLAN: {
    label: 'Health Plan Beneficiary Numbers',
    description: 'Health plan beneficiary numbers',
    redactionTypes: ['HEALTH_INSURANCE_ID', 'MEDICARE_ID'],
    severity: 'CRITICAL'
  },
  ACCOUNT: {
    label: 'Account Numbers',
    description: 'Account numbers',
    redactionTypes: ['BANK_ACCOUNT'],
    severity: 'HIGH'
  },
  LICENSE: {
    label: 'Certificate/License Numbers',
    description: 'Certificate/license numbers',
    redactionTypes: ['DEA_NUMBER', 'NPI'],
    severity: 'HIGH'
  },
  DEVICE: {
    label: 'Device Identifiers',
    description: 'Device identifiers and serial numbers',
    redactionTypes: [],
    severity: 'MEDIUM'
  },
  URL: {
    label: 'Web URLs',
    description: 'Web Universal Resource Locators',
    redactionTypes: [],
    severity: 'MEDIUM'
  },
  IP: {
    label: 'IP Addresses',
    description: 'Internet Protocol addresses',
    redactionTypes: ['IP_ADDRESS'],
    severity: 'HIGH'
  },
  BIOMETRIC: {
    label: 'Biometric Identifiers',
    description: 'Biometric identifiers including fingerprints and voiceprints',
    redactionTypes: [],
    severity: 'CRITICAL'
  },
  PHOTO: {
    label: 'Full Face Photos',
    description: 'Full face photographic images',
    redactionTypes: [],
    severity: 'HIGH'
  },
  OTHER: {
    label: 'Other Unique Identifiers',
    description: 'Any other unique identifying number, characteristic, or code',
    redactionTypes: ['CREDIT_CARD', 'IBAN', 'ROUTING_NUMBER'],
    severity: 'HIGH'
  }
};

// HIPAA Security Rule Requirements
const SECURITY_REQUIREMENTS = [
  {
    id: 'ACCESS_CONTROL',
    name: 'Access Control',
    description: 'Implement policies to limit PHI access to authorized persons',
    regulation: '45 CFR 164.312(a)(1)'
  },
  {
    id: 'AUDIT_CONTROLS',
    name: 'Audit Controls',
    description: 'Implement mechanisms to record and examine access to PHI',
    regulation: '45 CFR 164.312(b)'
  },
  {
    id: 'INTEGRITY',
    name: 'Integrity Controls',
    description: 'Implement policies to protect PHI from improper alteration',
    regulation: '45 CFR 164.312(c)(1)'
  },
  {
    id: 'TRANSMISSION',
    name: 'Transmission Security',
    description: 'Implement measures to guard against unauthorized access during transmission',
    regulation: '45 CFR 164.312(e)(1)'
  }
];

/**
 * Map redaction types to HIPAA categories
 */
function mapRedactionsToHIPAA(redactions) {
  const hipaaFindings = {};

  for (const [category, config] of Object.entries(HIPAA_PHI_CATEGORIES)) {
    const matchingRedactions = redactions.filter(r =>
      config.redactionTypes.includes(r.type)
    );

    if (matchingRedactions.length > 0) {
      hipaaFindings[category] = {
        ...config,
        count: matchingRedactions.length,
        instances: matchingRedactions.map(r => ({
          id: r.id,
          type: r.type,
          confidence: r.confidence
        }))
      };
    }
  }

  return hipaaFindings;
}

/**
 * Map flags to HIPAA concerns
 */
function mapFlagsToHIPAA(flags) {
  const concerns = [];

  for (const flag of flags) {
    if (flag.type === 'PHI') {
      concerns.push({
        type: 'PHI_MENTION',
        severity: 'HIGH',
        description: `PHI-related content detected: ${flag.reason}`,
        excerpt: flag.excerpt,
        recommendation: 'Review and redact or remove PHI content'
      });
    }

    if (flag.type === 'PRIVILEGE') {
      concerns.push({
        type: 'PRIVILEGED_HEALTH_INFO',
        severity: 'MEDIUM',
        description: `Potentially privileged health information: ${flag.reason}`,
        excerpt: flag.excerpt,
        recommendation: 'Verify authorization before sharing'
      });
    }
  }

  return concerns;
}

/**
 * Calculate compliance score
 */
function calculateComplianceScore(hipaaFindings, flags, redactions) {
  let score = 100;
  let deductions = [];

  // Deduct for unredacted PHI categories that should have been caught
  const criticalCategories = Object.entries(hipaaFindings)
    .filter(([_, v]) => v.severity === 'CRITICAL');

  if (criticalCategories.length > 0) {
    // Critical PHI was found and redacted - good, but document had sensitive data
    score -= criticalCategories.length * 5;
    deductions.push({
      reason: `Document contains ${criticalCategories.length} critical PHI categories`,
      points: criticalCategories.length * 5
    });
  }

  // Deduct for PHI flags (content that mentions medical/health info)
  const phiFlags = flags.filter(f => f.type === 'PHI');
  if (phiFlags.length > 0) {
    score -= Math.min(phiFlags.length * 3, 15);
    deductions.push({
      reason: `${phiFlags.length} PHI-related content sections flagged`,
      points: Math.min(phiFlags.length * 3, 15)
    });
  }

  // Bonus for having redactions in place
  if (redactions.length > 0) {
    score += 5;
    deductions.push({
      reason: 'PHI redaction applied',
      points: -5
    });
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
    deductions
  };
}

/**
 * Generate recommendations based on findings
 */
function generateRecommendations(hipaaFindings, flags, complianceScore) {
  const recommendations = [];

  // Critical recommendations
  if (hipaaFindings.SSN) {
    recommendations.push({
      priority: 'CRITICAL',
      category: 'Data Minimization',
      action: 'Remove or encrypt Social Security Numbers',
      regulation: '45 CFR 164.502(b) - Minimum Necessary',
      details: `Found ${hipaaFindings.SSN.count} SSN(s). Consider if SSN is truly necessary for this document.`
    });
  }

  if (hipaaFindings.MRN) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Access Control',
      action: 'Implement MRN access logging',
      regulation: '45 CFR 164.312(b) - Audit Controls',
      details: `Found ${hipaaFindings.MRN.count} MRN(s). Ensure access to this document is logged.`
    });
  }

  if (hipaaFindings.HEALTH_PLAN) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Data Protection',
      action: 'Verify authorization for health plan ID disclosure',
      regulation: '45 CFR 164.508 - Uses and Disclosures',
      details: `Found ${hipaaFindings.HEALTH_PLAN.count} health plan identifier(s).`
    });
  }

  // General recommendations
  if (complianceScore.score < 80) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Training',
      action: 'Review HIPAA training for document handlers',
      regulation: '45 CFR 164.530(b) - Training',
      details: 'Low compliance score suggests need for additional HIPAA awareness training.'
    });
  }

  // Add transmission security recommendation if document will be shared
  recommendations.push({
    priority: 'MEDIUM',
    category: 'Transmission Security',
    action: 'Use encrypted channels for document transmission',
    regulation: '45 CFR 164.312(e)(1) - Transmission Security',
    details: 'Ensure document is transmitted via secure, encrypted methods (TLS 1.2+).'
  });

  return recommendations;
}

/**
 * Generate full HIPAA compliance report
 */
export function generateHIPAAReport(text, redactions, flags, options = {}) {
  const {
    documentName = 'Untitled Document',
    documentType = 'Healthcare Document',
    reviewedBy = 'Automated System',
    includeFullDetails = true
  } = options;

  const timestamp = new Date().toISOString();

  // Map findings to HIPAA categories
  const hipaaFindings = mapRedactionsToHIPAA(redactions);
  const hipaaConcerns = mapFlagsToHIPAA(flags);

  // Calculate compliance score
  const complianceScore = calculateComplianceScore(hipaaFindings, flags, redactions);

  // Generate recommendations
  const recommendations = generateRecommendations(hipaaFindings, flags, complianceScore);

  // Build summary statistics
  const summary = {
    totalPHIIdentifiersFound: redactions.length,
    categoriesAffected: Object.keys(hipaaFindings).length,
    criticalFindings: Object.values(hipaaFindings).filter(f => f.severity === 'CRITICAL').length,
    highFindings: Object.values(hipaaFindings).filter(f => f.severity === 'HIGH').length,
    mediumFindings: Object.values(hipaaFindings).filter(f => f.severity === 'MEDIUM').length,
    flaggedSections: flags.length,
    complianceScore: complianceScore.score,
    complianceGrade: complianceScore.grade
  };

  // Build the report
  const report = {
    reportId: `HIPAA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    generatedAt: timestamp,
    documentInfo: {
      name: documentName,
      type: documentType,
      characterCount: text.length,
      reviewedBy,
      reviewTimestamp: timestamp
    },
    summary,
    complianceScore: {
      ...complianceScore,
      interpretation: complianceScore.score >= 90
        ? 'Document meets HIPAA compliance standards with proper redaction'
        : complianceScore.score >= 70
        ? 'Document requires attention to some HIPAA compliance areas'
        : 'Document has significant HIPAA compliance concerns'
    },
    phiFindings: hipaaFindings,
    concerns: hipaaConcerns,
    recommendations,
    securityRequirements: SECURITY_REQUIREMENTS,
    certification: {
      statement: 'This report was generated by an automated HIPAA compliance review system.',
      disclaimer: 'This automated review does not replace professional legal or compliance advice. Organizations should consult with qualified HIPAA compliance officers for official determinations.',
      version: '1.0.0'
    }
  };

  // Add detailed findings if requested
  if (includeFullDetails) {
    report.detailedFindings = {
      redactionsApplied: redactions.map(r => ({
        id: r.id,
        type: r.type,
        hipaaCategory: Object.entries(HIPAA_PHI_CATEGORIES)
          .find(([_, config]) => config.redactionTypes.includes(r.type))?.[0] || 'OTHER',
        confidence: r.confidence
      })),
      flaggedContent: flags.map(f => ({
        id: f.id,
        type: f.type,
        severity: f.severity,
        excerpt: f.excerpt,
        reason: f.reason
      }))
    };
  }

  return report;
}

/**
 * Generate a text-based HIPAA report for display/printing
 */
export function generateHIPAAReportText(report) {
  const lines = [];
  const divider = '═'.repeat(70);
  const thinDivider = '─'.repeat(70);

  lines.push(divider);
  lines.push('                    HIPAA COMPLIANCE REPORT');
  lines.push(divider);
  lines.push('');
  lines.push(`Report ID: ${report.reportId}`);
  lines.push(`Generated: ${new Date(report.generatedAt).toLocaleString()}`);
  lines.push(`Document: ${report.documentInfo.name}`);
  lines.push(`Type: ${report.documentInfo.type}`);
  lines.push('');
  lines.push(thinDivider);
  lines.push('                       COMPLIANCE SUMMARY');
  lines.push(thinDivider);
  lines.push('');
  lines.push(`  Compliance Score: ${report.complianceScore.score}/100 (Grade: ${report.complianceScore.grade})`);
  lines.push(`  ${report.complianceScore.interpretation}`);
  lines.push('');
  lines.push(`  Total PHI Identifiers Found: ${report.summary.totalPHIIdentifiersFound}`);
  lines.push(`  HIPAA Categories Affected: ${report.summary.categoriesAffected}`);
  lines.push(`  Critical Findings: ${report.summary.criticalFindings}`);
  lines.push(`  High Severity Findings: ${report.summary.highFindings}`);
  lines.push(`  Flagged Sections: ${report.summary.flaggedSections}`);
  lines.push('');

  if (Object.keys(report.phiFindings).length > 0) {
    lines.push(thinDivider);
    lines.push('                       PHI FINDINGS BY CATEGORY');
    lines.push(thinDivider);
    lines.push('');

    for (const [category, finding] of Object.entries(report.phiFindings)) {
      lines.push(`  [${finding.severity}] ${finding.label}`);
      lines.push(`    Description: ${finding.description}`);
      lines.push(`    Instances Found: ${finding.count}`);
      lines.push('');
    }
  }

  if (report.concerns.length > 0) {
    lines.push(thinDivider);
    lines.push('                       COMPLIANCE CONCERNS');
    lines.push(thinDivider);
    lines.push('');

    for (const concern of report.concerns) {
      lines.push(`  [${concern.severity}] ${concern.type}`);
      lines.push(`    ${concern.description}`);
      lines.push(`    Recommendation: ${concern.recommendation}`);
      lines.push('');
    }
  }

  lines.push(thinDivider);
  lines.push('                       RECOMMENDATIONS');
  lines.push(thinDivider);
  lines.push('');

  for (const rec of report.recommendations) {
    lines.push(`  [${rec.priority}] ${rec.category}`);
    lines.push(`    Action: ${rec.action}`);
    lines.push(`    Regulation: ${rec.regulation}`);
    lines.push(`    Details: ${rec.details}`);
    lines.push('');
  }

  lines.push(thinDivider);
  lines.push('                       CERTIFICATION');
  lines.push(thinDivider);
  lines.push('');
  lines.push(`  ${report.certification.statement}`);
  lines.push('');
  lines.push(`  DISCLAIMER: ${report.certification.disclaimer}`);
  lines.push('');
  lines.push(divider);
  lines.push(`                    Report Version: ${report.certification.version}`);
  lines.push(divider);

  return lines.join('\n');
}

/**
 * Quick HIPAA compliance check
 */
export function quickHIPAACheck(redactions, flags) {
  const hipaaFindings = mapRedactionsToHIPAA(redactions);
  const criticalCount = Object.values(hipaaFindings).filter(f => f.severity === 'CRITICAL').length;
  const phiFlagsCount = flags.filter(f => f.type === 'PHI').length;

  return {
    isCompliant: criticalCount === 0 && phiFlagsCount <= 2,
    riskLevel: criticalCount > 0 ? 'HIGH' : phiFlagsCount > 2 ? 'MEDIUM' : 'LOW',
    criticalPHICount: criticalCount,
    phiFlagsCount,
    requiresReview: criticalCount > 0 || phiFlagsCount > 0,
    message: criticalCount > 0
      ? 'Critical PHI detected - document requires immediate review'
      : phiFlagsCount > 2
      ? 'Multiple PHI references detected - review recommended'
      : 'Document passes basic HIPAA compliance check'
  };
}
