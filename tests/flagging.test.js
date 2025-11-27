/**
 * Test suite for flagging functionality
 */

import { flagSensitiveContent } from '../lib/flagging';

describe('Flagging Engine', () => {

  describe('Privilege Flagging', () => {
    test('should flag attorney-client privilege content', () => {
      const input = 'This document contains attorney-client privileged information.';
      const result = flagSensitiveContent(input);

      expect(result.flags.some(f => f.type === 'PRIVILEGE')).toBe(true);
    });

    test('should flag legal counsel references', () => {
      const input = 'Counsel advised that the contract should be revised.';
      const result = flagSensitiveContent(input);

      expect(result.flags.some(f => f.type === 'PRIVILEGE')).toBe(true);
    });
  });

  describe('PHI Flagging', () => {
    test('should flag medical information', () => {
      const input = 'The patient was diagnosed with a medical condition.';
      const result = flagSensitiveContent(input);

      expect(result.flags.some(f => f.type === 'PHI')).toBe(true);
    });

    test('should flag HIPAA references', () => {
      const input = 'This document must comply with HIPAA regulations.';
      const result = flagSensitiveContent(input);

      expect(result.flags.some(f => f.type === 'PHI')).toBe(true);
    });
  });

  describe('Confidentiality Flagging', () => {
    test('should flag confidentiality clauses', () => {
      const input = 'All proprietary information must remain confidential.';
      const result = flagSensitiveContent(input);

      expect(result.flags.some(f => f.type === 'CONFIDENTIALITY')).toBe(true);
    });

    test('should flag NDA references', () => {
      const input = 'This NDA agreement is binding on all parties.';
      const result = flagSensitiveContent(input);

      expect(result.flags.some(f => f.type === 'CONFIDENTIALITY')).toBe(true);
    });
  });

  describe('Risky Clause Detection', () => {
    test('should flag unlimited liability', () => {
      const input = 'The contractor agrees to unlimited liability for damages.';
      const result = flagSensitiveContent(input);

      expect(result.flags.some(f => f.type === 'RISKY_CLAUSE')).toBe(true);
    });

    test('should flag indemnification clauses', () => {
      const input = 'Party A shall indemnify Party B against all claims.';
      const result = flagSensitiveContent(input);

      expect(result.flags.some(f => f.type === 'INDEMNIFICATION')).toBe(true);
    });
  });

  describe('Summary Generation', () => {
    test('should generate accurate summary', () => {
      const input = 'Confidential attorney-client communication regarding patient treatment.';
      const result = flagSensitiveContent(input);

      expect(result.summary.total).toBeGreaterThan(0);
      expect(result.summary.riskLevel).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty text', () => {
      const result = flagSensitiveContent('');

      expect(result.flags).toHaveLength(0);
      expect(result.summary).toEqual({});
    });

    test('should handle null input', () => {
      const result = flagSensitiveContent(null);

      expect(result.flags).toHaveLength(0);
    });

    test('should handle text with no flags', () => {
      const input = 'This is a simple sentence with no sensitive content.';
      const result = flagSensitiveContent(input);

      expect(result.summary.total || 0).toBe(0);
    });
  });
});
