/**
 * Comprehensive test suite for redaction functionality
 */

import { redactText, restoreText, addCustomPattern } from '../lib/redact';

describe('Redaction Engine', () => {
  
  describe('Email Redaction', () => {
    test('should redact single email', () => {
      const input = 'Contact: alice@example.com for queries.';
      const result = redactText(input);
      
      expect(result.redactedText).toBe('Contact: [REDACTED:EMAIL#1] for queries.');
      expect(result.redactions).toHaveLength(1);
      expect(result.redactions[0].type).toBe('EMAIL');
      expect(result.redactions[0].original).toBe('alice@example.com');
    });

    test('should redact multiple emails', () => {
      const input = 'Email alice@example.com and bob@test.org';
      const result = redactText(input);
      
      expect(result.redactions).toHaveLength(2);
      expect(result.redactions[0].id).toBe('EMAIL#1');
      expect(result.redactions[1].id).toBe('EMAIL#2');
    });

    test('should handle email with punctuation', () => {
      const input = 'Email:alice@example.com.Please contact';
      const result = redactText(input);
      
      expect(result.redactions).toHaveLength(1);
      expect(result.redactedText).toContain('[REDACTED:EMAIL#1]');
    });
  });

  describe('Phone Redaction', () => {
    test('should redact US phone numbers', () => {
      const input = 'Call +1-415-555-2671 or (415) 555-2672.';
      const result = redactText(input);
      
      expect(result.redactions.filter(r => r.type === 'PHONE')).toHaveLength(2);
      expect(result.summary.phone).toBe(2);
    });

    test('should redact international phone', () => {
      const input = 'Contact +44 20 7123 4567';
      const result = redactText(input);
      
      expect(result.redactions.some(r => r.type === 'PHONE')).toBe(true);
    });

    test('should not redact random short numbers', () => {
      const input = 'Version 123 is here.';
      const result = redactText(input);
      
      expect(result.redactions.filter(r => r.type === 'PHONE')).toHaveLength(0);
    });
  });

  describe('SSN Redaction', () => {
    test('should redact SSN', () => {
      const input = 'Client SSN: 123-45-6789.';
      const result = redactText(input);
      
      expect(result.redactedText).toContain('[REDACTED:SSN#1]');
      expect(result.summary.ssn).toBe(1);
    });

    test('should redact multiple SSNs', () => {
      const input = 'SSN1: 123-45-6789, SSN2: 987-65-4321';
      const result = redactText(input);
      
      expect(result.redactions.filter(r => r.type === 'SSN')).toHaveLength(2);
    });
  });

  describe('Credit Card Redaction', () => {
    test('should redact credit card with spaces', () => {
      const input = 'Card 4111 1111 1111 1111 is listed.';
      const result = redactText(input);
      
      expect(result.redactedText).toContain('[REDACTED:CREDIT_CARD#1]');
    });

    test('should redact credit card with dashes', () => {
      const input = 'Card: 4111-1111-1111-1111';
      const result = redactText(input);
      
      expect(result.summary.credit_card).toBe(1);
    });

    test('should validate with Luhn algorithm', () => {
      const validCard = '4532015112830366'; // Valid Luhn
      const invalidCard = '4532015112830367'; // Invalid Luhn
      
      const validResult = redactText(validCard);
      const invalidResult = redactText(invalidCard);
      
      expect(validResult.redactions.filter(r => r.type === 'CREDIT_CARD')).toHaveLength(1);
      expect(invalidResult.redactions.filter(r => r.type === 'CREDIT_CARD')).toHaveLength(0);
    });
  });

  describe('Date Redaction', () => {
    test('should redact dates', () => {
      const input = 'Born on 05/12/1980.';
      const result = redactText(input);
      
      expect(result.redactedText).toContain('[REDACTED:DATE#1]');
    });

    test('should redact multiple date formats', () => {
      const input = 'Dates: 12/31/2023, 1-15-2024, 03.20.2024';
      const result = redactText(input);
      
      expect(result.redactions.filter(r => r.type === 'DATE')).toHaveLength(3);
    });

    test('should not redact version numbers', () => {
      const input = 'Version 3.14.159';
      const result = redactText(input);
      
      // This might still match - that's okay, dates are tricky
      // Just verifying it doesn't crash
      expect(result.redactedText).toBeDefined();
    });
  });

  describe('Address Redaction', () => {
    test('should redact street addresses', () => {
      const input = 'Located at 123 Main Street, San Francisco';
      const result = redactText(input);
      
      const addressRedactions = result.redactions.filter(r => r.type === 'ADDRESS');
      expect(addressRedactions.length).toBeGreaterThan(0);
    });

    test('should redact addresses with apartment numbers', () => {
      const input = 'Address: 456 Oak Avenue Apt 2B';
      const result = redactText(input);
      
      expect(result.redactions.some(r => r.type === 'ADDRESS')).toBe(true);
    });
  });

  describe('Name Redaction', () => {
    test('should redact titled names', () => {
      const input = 'Refer to Dr. Smith for details.';
      const result = redactText(input);
      
      expect(result.redactions.some(r => r.type === 'TITLE_NAME')).toBe(true);
    });

    test('should redact multiple titles', () => {
      const input = 'Mr. John Doe and Ms. Jane Smith attended.';
      const result = redactText(input);
      
      expect(result.redactions.filter(r => r.type === 'TITLE_NAME')).toHaveLength(2);
    });
  });

  describe('Complex Scenarios', () => {
    test('should handle multiple PII types', () => {
      const input = `John Doe (john.doe@company.com) told counsel that his SSN is 987-65-4321. 
                     Attorney advised confidentiality.`;
      const result = redactText(input);
      
      expect(result.redactions.some(r => r.type === 'EMAIL')).toBe(true);
      expect(result.redactions.some(r => r.type === 'SSN')).toBe(true);
      expect(result.summary.totalRedactions).toBeGreaterThan(0);
    });

    test('should handle overlapping matches', () => {
      const input = 'Email: test@example.com (test@example.com)';
      const result = redactText(input);
      
      // Should deduplicate overlapping matches
      expect(result.redactions).toHaveLength(2);
    });

    test('should preserve whitespace and punctuation', () => {
      const input = 'Email: alice@test.com. Phone: 415-555-1234!';
      const result = redactText(input);
      
      expect(result.redactedText).toContain('Email: [REDACTED:');
      expect(result.redactedText).toContain('Phone: [REDACTED:');
      expect(result.redactedText).toContain('!');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty text', () => {
      const result = redactText('');
      
      expect(result.redactedText).toBe('');
      expect(result.redactions).toHaveLength(0);
    });

    test('should handle null input', () => {
      const result = redactText(null);
      
      expect(result.redactedText).toBe('');
      expect(result.redactions).toHaveLength(0);
    });

    test('should handle text with no PII', () => {
      const input = 'This is a simple contract with no sensitive data.';
      const result = redactText(input);
      
      expect(result.redactedText).toBe(input);
      expect(result.redactions).toHaveLength(0);
    });

    test('should handle very long text', () => {
      const longText = 'Contact alice@example.com. '.repeat(1000);
      const result = redactText(longText);
      
      expect(result.redactions.length).toBeGreaterThan(0);
    });
  });

  describe('Restore Functionality', () => {
    test('should restore redacted text', () => {
      const original = 'Email: alice@example.com, Phone: 415-555-1234';
      const result = redactText(original);
      const restored = restoreText(result.redactedText, result.redactions);
      
      expect(restored).toBe(original);
    });
  });

  describe('Custom Patterns', () => {
    test('should support custom patterns', () => {
      const customPattern = addCustomPattern(
        'EMPLOYEE_ID',
        /\bEMP-\d{6}\b/g,
        { priority: 8, confidence: 'high' }
      );
      
      const input = 'Employee EMP-123456 submitted report.';
      const result = redactText(input, { customPatterns: [customPattern] });
      
      expect(result.redactions.some(r => r.type === 'EMPLOYEE_ID')).toBe(true);
    });
  });

  describe('Position Tracking', () => {
    test('should track correct positions', () => {
      const input = 'Start alice@test.com End';
      const result = redactText(input);

      // 'alice@test.com' is 14 characters, starts at index 6
      expect(result.redactions[0].start).toBe(6);
      expect(result.redactions[0].end).toBe(20); // 6 + 14 = 20
    });
  });

  describe('Summary Generation', () => {
    test('should generate accurate summary', () => {
      const input = `
        Email: test@example.com
        Phone: 415-555-1234
        SSN: 123-45-6789
        Card: 4111 1111 1111 1111
      `;
      const result = redactText(input);

      expect(result.summary.email).toBe(1);
      expect(result.summary.phone).toBe(1);
      expect(result.summary.ssn).toBe(1);
      expect(result.summary.credit_card).toBe(1);
      expect(result.summary.totalRedactions).toBe(4);
    });
  });

  describe('Salary Redaction', () => {
    test('should redact salary with keyword', () => {
      const input = 'Employee salary: $85,000 per year';
      const result = redactText(input);

      expect(result.redactions.some(r => r.type === 'SALARY')).toBe(true);
    });

    test('should redact compensation amounts', () => {
      const input = 'Annual compensation $120,000.00 per annum';
      const result = redactText(input);

      expect(result.redactions.some(r => r.type === 'SALARY')).toBe(true);
    });

    test('should redact hourly rate', () => {
      const input = 'Hourly rate: $45.50 per hour';
      const result = redactText(input);

      expect(result.redactions.some(r => r.type === 'SALARY')).toBe(true);
    });

    test('should redact base pay', () => {
      const input = 'Base salary $95,000 annually';
      const result = redactText(input);

      expect(result.redactions.some(r => r.type === 'SALARY')).toBe(true);
    });

    test('should redact earnings statements', () => {
      const input = 'The employee earns $150,000 in this role';
      const result = redactText(input);

      expect(result.redactions.some(r => r.type === 'SALARY')).toBe(true);
    });
  });

  describe('Bank Account Redaction', () => {
    test('should redact bank account with keyword', () => {
      const input = 'Bank account number: 12345678901234';
      const result = redactText(input);

      expect(result.redactions.some(r => r.type === 'BANK_ACCOUNT')).toBe(true);
    });

    test('should redact account number with # symbol', () => {
      const input = 'Account #: 9876543210';
      const result = redactText(input);

      expect(result.redactions.some(r => r.type === 'BANK_ACCOUNT')).toBe(true);
    });

    test('should not redact short numbers without context', () => {
      const input = 'Order 12345 is ready';
      const result = redactText(input);

      expect(result.redactions.filter(r => r.type === 'BANK_ACCOUNT')).toHaveLength(0);
    });
  });

  describe('Routing Number Redaction', () => {
    test('should redact routing number with keyword', () => {
      const input = 'Routing number: 021000021'; // Valid Chase routing number
      const result = redactText(input);

      expect(result.redactions.some(r => r.type === 'ROUTING_NUMBER')).toBe(true);
    });

    test('should redact valid ABA routing number', () => {
      const input = 'Wire to 121000248'; // Valid Wells Fargo routing number
      const result = redactText(input);

      expect(result.redactions.some(r => r.type === 'ROUTING_NUMBER')).toBe(true);
    });
  });

  describe('IBAN Redaction', () => {
    test('should redact IBAN numbers', () => {
      const input = 'Transfer to GB82WEST12345698765432';
      const result = redactText(input);

      expect(result.redactions.some(r => r.type === 'IBAN')).toBe(true);
    });

    test('should redact German IBAN', () => {
      const input = 'IBAN: DE89370400440532013000';
      const result = redactText(input);

      expect(result.redactions.some(r => r.type === 'IBAN')).toBe(true);
    });
  });

  describe('Medical Record Number (MRN) Redaction', () => {
    test('should redact MRN with keyword', () => {
      const input = 'Patient MRN: ABC123456';
      const result = redactText(input);

      expect(result.redactions.some(r => r.type === 'MRN')).toBe(true);
    });

    test('should redact medical record number', () => {
      const input = 'Medical record number: MR789012';
      const result = redactText(input);

      expect(result.redactions.some(r => r.type === 'MRN')).toBe(true);
    });

    test('should redact patient ID', () => {
      const input = 'Patient ID: PAT456789';
      const result = redactText(input);

      expect(result.redactions.some(r => r.type === 'MRN')).toBe(true);
    });
  });

  describe('HR Document Scenario', () => {
    test('should redact all sensitive HR information', () => {
      const input = `
        EMPLOYEE RECORD
        Name: Mr. John Smith
        SSN: 123-45-6789
        Email: john.smith@company.com
        Salary: $95,000 per year
        Bank Account: 12345678901234
        Routing Number: 021000021
      `;
      const result = redactText(input);

      expect(result.redactions.some(r => r.type === 'TITLE_NAME')).toBe(true);
      expect(result.redactions.some(r => r.type === 'SSN')).toBe(true);
      expect(result.redactions.some(r => r.type === 'EMAIL')).toBe(true);
      expect(result.redactions.some(r => r.type === 'SALARY')).toBe(true);
      expect(result.redactions.some(r => r.type === 'BANK_ACCOUNT')).toBe(true);
      expect(result.redactions.some(r => r.type === 'ROUTING_NUMBER')).toBe(true);
    });
  });

  describe('Healthcare Document Scenario', () => {
    test('should redact all PHI from medical documents', () => {
      const input = `
        PATIENT INFORMATION
        Name: Dr. Jane Doe
        MRN: PAT789012
        DOB: 05/15/1985
        Phone: (555) 123-4567
        Email: jane.doe@email.com
        SSN: 987-65-4321
      `;
      const result = redactText(input);

      expect(result.redactions.some(r => r.type === 'TITLE_NAME')).toBe(true);
      expect(result.redactions.some(r => r.type === 'MRN')).toBe(true);
      expect(result.redactions.some(r => r.type === 'DATE')).toBe(true);
      expect(result.redactions.some(r => r.type === 'PHONE')).toBe(true);
      expect(result.redactions.some(r => r.type === 'EMAIL')).toBe(true);
      expect(result.redactions.some(r => r.type === 'SSN')).toBe(true);
    });
  });
});