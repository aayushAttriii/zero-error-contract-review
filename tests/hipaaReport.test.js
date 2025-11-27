/**
 * Test suite for HIPAA Compliance Report Generator
 */

import { generateHIPAAReport, generateHIPAAReportText, quickHIPAACheck } from '../lib/hipaaReport';

describe('HIPAA Report Generator', () => {

  const sampleRedactions = [
    { id: 'SSN#1', type: 'SSN', original: '123-45-6789', confidence: 'high' },
    { id: 'MRN#1', type: 'MRN', original: 'PAT123456', confidence: 'high' },
    { id: 'EMAIL#1', type: 'EMAIL', original: 'patient@email.com', confidence: 'high' },
    { id: 'PHONE#1', type: 'PHONE', original: '555-123-4567', confidence: 'high' },
    { id: 'HEALTH_INSURANCE_ID#1', type: 'HEALTH_INSURANCE_ID', original: 'INS12345678', confidence: 'high' }
  ];

  const sampleFlags = [
    { id: 'F1', type: 'PHI', severity: 'HIGH', reason: 'Contains patient diagnosis', excerpt: '...diagnosed with...' },
    { id: 'F2', type: 'PHI', severity: 'HIGH', reason: 'Contains treatment info', excerpt: '...treatment plan...' }
  ];

  describe('generateHIPAAReport', () => {
    test('should generate a complete HIPAA report', () => {
      const report = generateHIPAAReport(
        'Sample healthcare document text',
        sampleRedactions,
        sampleFlags,
        { documentName: 'Test Document' }
      );

      expect(report).toHaveProperty('reportId');
      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('documentInfo');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('complianceScore');
      expect(report).toHaveProperty('phiFindings');
      expect(report).toHaveProperty('recommendations');
    });

    test('should identify critical PHI categories', () => {
      const report = generateHIPAAReport(
        'Sample text',
        sampleRedactions,
        sampleFlags
      );

      // SSN and MRN should be flagged as critical
      expect(report.phiFindings.SSN).toBeDefined();
      expect(report.phiFindings.SSN.severity).toBe('CRITICAL');
      expect(report.phiFindings.MRN).toBeDefined();
      expect(report.phiFindings.MRN.severity).toBe('CRITICAL');
    });

    test('should calculate compliance score', () => {
      const report = generateHIPAAReport(
        'Sample text',
        sampleRedactions,
        sampleFlags
      );

      expect(report.complianceScore.score).toBeGreaterThanOrEqual(0);
      expect(report.complianceScore.score).toBeLessThanOrEqual(100);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(report.complianceScore.grade);
    });

    test('should generate recommendations', () => {
      const report = generateHIPAAReport(
        'Sample text',
        sampleRedactions,
        sampleFlags
      );

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations[0]).toHaveProperty('priority');
      expect(report.recommendations[0]).toHaveProperty('category');
      expect(report.recommendations[0]).toHaveProperty('action');
      expect(report.recommendations[0]).toHaveProperty('regulation');
    });

    test('should handle empty redactions', () => {
      const report = generateHIPAAReport(
        'Sample text with no PHI',
        [],
        []
      );

      expect(report.summary.totalPHIIdentifiersFound).toBe(0);
      expect(report.complianceScore.score).toBeGreaterThan(90);
    });

    test('should include detailed findings when requested', () => {
      const report = generateHIPAAReport(
        'Sample text',
        sampleRedactions,
        sampleFlags,
        { includeFullDetails: true }
      );

      expect(report.detailedFindings).toBeDefined();
      expect(report.detailedFindings.redactionsApplied).toBeDefined();
      expect(report.detailedFindings.flaggedContent).toBeDefined();
    });
  });

  describe('generateHIPAAReportText', () => {
    test('should generate text-based report', () => {
      const report = generateHIPAAReport(
        'Sample text',
        sampleRedactions,
        sampleFlags
      );

      const textReport = generateHIPAAReportText(report);

      expect(typeof textReport).toBe('string');
      expect(textReport).toContain('HIPAA COMPLIANCE REPORT');
      expect(textReport).toContain('Compliance Score');
      expect(textReport).toContain('RECOMMENDATIONS');
    });

    test('should include PHI findings in text report', () => {
      const report = generateHIPAAReport(
        'Sample text',
        sampleRedactions,
        sampleFlags
      );

      const textReport = generateHIPAAReportText(report);

      expect(textReport).toContain('PHI FINDINGS');
      expect(textReport).toContain('Social Security Numbers');
    });
  });

  describe('quickHIPAACheck', () => {
    test('should return quick compliance check', () => {
      const result = quickHIPAACheck(sampleRedactions, sampleFlags);

      expect(result).toHaveProperty('isCompliant');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('criticalPHICount');
      expect(result).toHaveProperty('requiresReview');
      expect(result).toHaveProperty('message');
    });

    test('should flag critical PHI', () => {
      const result = quickHIPAACheck(sampleRedactions, sampleFlags);

      expect(result.criticalPHICount).toBeGreaterThan(0);
      expect(result.riskLevel).toBe('HIGH');
      expect(result.requiresReview).toBe(true);
    });

    test('should pass check with no PHI', () => {
      const result = quickHIPAACheck([], []);

      expect(result.isCompliant).toBe(true);
      expect(result.riskLevel).toBe('LOW');
      expect(result.requiresReview).toBe(false);
    });

    test('should detect PHI flags', () => {
      const phiFlags = [
        { type: 'PHI', severity: 'HIGH' },
        { type: 'PHI', severity: 'HIGH' },
        { type: 'PHI', severity: 'HIGH' }
      ];

      const result = quickHIPAACheck([], phiFlags);

      expect(result.phiFlagsCount).toBe(3);
      expect(result.riskLevel).toBe('MEDIUM');
    });
  });

  describe('PHI Category Mapping', () => {
    test('should map all standard HIPAA identifiers', () => {
      const comprehensiveRedactions = [
        { id: '1', type: 'TITLE_NAME', confidence: 'high' },
        { id: '2', type: 'ADDRESS', confidence: 'high' },
        { id: '3', type: 'DATE', confidence: 'high' },
        { id: '4', type: 'PHONE', confidence: 'high' },
        { id: '5', type: 'EMAIL', confidence: 'high' },
        { id: '6', type: 'SSN', confidence: 'high' },
        { id: '7', type: 'MRN', confidence: 'high' },
        { id: '8', type: 'HEALTH_INSURANCE_ID', confidence: 'high' },
        { id: '9', type: 'BANK_ACCOUNT', confidence: 'high' },
        { id: '10', type: 'IP_ADDRESS', confidence: 'high' }
      ];

      const report = generateHIPAAReport(
        'Sample text',
        comprehensiveRedactions,
        []
      );

      expect(report.summary.categoriesAffected).toBeGreaterThan(5);
    });
  });
});
