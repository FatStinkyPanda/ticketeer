import { describe, it, expect } from 'vitest';
import { validateAlertData, scanFreeText, _testExports } from './piiGuard';
import type { AlertData } from '../types/alert.types';

const { luhnCheck } = _testExports;

const baseAlert: AlertData = {
  timestamp: '',
  alert_category: '',
  alert_signature: 'ET EXPLOIT Apache log4j RCE Attempt',
  src_ip: '',
  src_ip_is_public: false,
  src_port: '',
  dest_ip: '',
  dest_ip_is_public: false,
  dest_port: '',
  proto: '',
  app_proto: '',
  reported_by: '',
};

// Helper to create a test alert with overrides
function makeAlert(overrides: Partial<AlertData>): AlertData {
  return { ...baseAlert, ...overrides };
}

describe('piiGuard', () => {
  describe('validateAlertData — IP address rules', () => {
    describe('RFC 1918 private IPs — always allowed', () => {
      it('allows 10.0.0.0/8 range', () => {
        const result = validateAlertData(makeAlert({ src_ip: '10.0.0.1' }));
        expect(result.valid).toBe(true);
      });

      it('allows 10.255.255.255', () => {
        const result = validateAlertData(makeAlert({ src_ip: '10.255.255.255' }));
        expect(result.valid).toBe(true);
      });

      it('allows 172.16.0.0/12 range', () => {
        const result = validateAlertData(makeAlert({ src_ip: '172.16.0.1' }));
        expect(result.valid).toBe(true);
      });

      it('allows 172.31.255.255', () => {
        const result = validateAlertData(makeAlert({ src_ip: '172.31.255.255' }));
        expect(result.valid).toBe(true);
      });

      it('allows 192.168.0.0/16 range', () => {
        const result = validateAlertData(makeAlert({ src_ip: '192.168.1.1' }));
        expect(result.valid).toBe(true);
      });

      it('allows 192.168.255.255', () => {
        const result = validateAlertData(makeAlert({ src_ip: '192.168.255.255' }));
        expect(result.valid).toBe(true);
      });

      it('allows private dest IP', () => {
        const result = validateAlertData(makeAlert({ dest_ip: '10.10.10.10' }));
        expect(result.valid).toBe(true);
      });
    });

    describe('Public IPs — blocked without toggle', () => {
      it('blocks 8.8.8.8 without public toggle', () => {
        const result = validateAlertData(makeAlert({ src_ip: '8.8.8.8', src_ip_is_public: false }));
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors.some((e) => e.field === 'src_ip' && e.severity === 'error')).toBe(true);
        }
      });

      it('blocks 1.1.1.1 without public toggle on dest_ip', () => {
        const result = validateAlertData(makeAlert({ dest_ip: '1.1.1.1', dest_ip_is_public: false }));
        expect(result.valid).toBe(false);
      });

      it('error message mentions "Public IP" toggle', () => {
        const result = validateAlertData(makeAlert({ src_ip: '8.8.8.8', src_ip_is_public: false }));
        expect(result.valid).toBe(false);
        if (!result.valid) {
          const err = result.errors.find((e) => e.field === 'src_ip');
          expect(err?.message).toContain('Public IP');
        }
      });
    });

    describe('Public IPs — allowed with toggle', () => {
      it('allows 8.8.8.8 with public toggle on', () => {
        const result = validateAlertData(makeAlert({ src_ip: '8.8.8.8', src_ip_is_public: true }));
        expect(result.valid).toBe(true);
      });

      it('allows 1.1.1.1 with public toggle on', () => {
        const result = validateAlertData(makeAlert({ dest_ip: '1.1.1.1', dest_ip_is_public: true }));
        expect(result.valid).toBe(true);
      });

      it('allows both IPs public with toggles', () => {
        const result = validateAlertData(
          makeAlert({
            src_ip: '8.8.8.8',
            src_ip_is_public: true,
            dest_ip: '1.1.1.1',
            dest_ip_is_public: true,
          }),
        );
        expect(result.valid).toBe(true);
      });
    });

    describe('Invalid IPs', () => {
      it('blocks IPv6 addresses', () => {
        const result = validateAlertData(makeAlert({ src_ip: '2001:db8::1' }));
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors.some((e) => e.message.includes('IPv6'))).toBe(true);
        }
      });

      it('blocks malformed IP: 999.999.999.999', () => {
        const result = validateAlertData(makeAlert({ src_ip: '999.999.999.999' }));
        expect(result.valid).toBe(false);
      });

      it('blocks text in IP field', () => {
        const result = validateAlertData(makeAlert({ src_ip: 'not-an-ip' }));
        expect(result.valid).toBe(false);
      });

      it('blocks loopback 127.0.0.1', () => {
        const result = validateAlertData(makeAlert({ src_ip: '127.0.0.1' }));
        expect(result.valid).toBe(false);
      });

      it('blocks link-local 169.254.0.1', () => {
        const result = validateAlertData(makeAlert({ src_ip: '169.254.0.1' }));
        expect(result.valid).toBe(false);
      });

      it('blocks 0.0.0.0', () => {
        const result = validateAlertData(makeAlert({ src_ip: '0.0.0.0' }));
        expect(result.valid).toBe(false);
      });

      it('blocks invalid dest_ip format (loopback)', () => {
        const result = validateAlertData(makeAlert({ dest_ip: '127.0.0.1' }));
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.errors.some((e) => e.field === 'dest_ip')).toBe(true);
        }
      });
    });

    describe('Empty IPs — always allowed (field is optional)', () => {
      it('allows empty src_ip', () => {
        const result = validateAlertData(makeAlert({ src_ip: '' }));
        expect(result.valid).toBe(true);
      });

      it('allows empty dest_ip', () => {
        const result = validateAlertData(makeAlert({ dest_ip: '' }));
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('validateAlertData — port validation', () => {
    it('allows valid port 443', () => {
      const result = validateAlertData(makeAlert({ dest_port: '443' }));
      expect(result.valid).toBe(true);
    });

    it('allows valid port 1', () => {
      const result = validateAlertData(makeAlert({ src_port: '1' }));
      expect(result.valid).toBe(true);
    });

    it('allows valid port 65535', () => {
      const result = validateAlertData(makeAlert({ dest_port: '65535' }));
      expect(result.valid).toBe(true);
    });

    it('blocks port 0', () => {
      const result = validateAlertData(makeAlert({ src_port: '0' }));
      expect(result.valid).toBe(false);
    });

    it('blocks port 65536', () => {
      const result = validateAlertData(makeAlert({ dest_port: '65536' }));
      expect(result.valid).toBe(false);
    });

    it('blocks negative port', () => {
      const result = validateAlertData(makeAlert({ src_port: '-1' }));
      expect(result.valid).toBe(false);
    });

    it('blocks non-numeric port', () => {
      const result = validateAlertData(makeAlert({ src_port: 'abc' }));
      expect(result.valid).toBe(false);
    });

    it('allows empty port (optional field)', () => {
      const result = validateAlertData(makeAlert({ src_port: '', dest_port: '' }));
      expect(result.valid).toBe(true);
    });
  });

  describe('validateAlertData — email detection', () => {
    it('blocks email in timestamp field', () => {
      const result = validateAlertData(makeAlert({ timestamp: 'user@example.com' }));
      expect(result.valid).toBe(false);
    });

    it('blocks email in alert_category', () => {
      const result = validateAlertData(makeAlert({ alert_category: 'Email: attacker@evil.com' }));
      expect(result.valid).toBe(false);
    });

    it('blocks email in alert_signature', () => {
      const result = validateAlertData(makeAlert({ alert_signature: 'phish user@victim.org' }));
      expect(result.valid).toBe(false);
    });

    it('blocks email in reported_by', () => {
      const result = validateAlertData(makeAlert({ reported_by: 'analyst@company.com' }));
      expect(result.valid).toBe(false);
    });

    it('allows valid alert signature without email', () => {
      const result = validateAlertData(makeAlert({ alert_signature: 'ET EXPLOIT Apache log4j RCE Attempt' }));
      expect(result.valid).toBe(true);
    });
  });

  describe('validateAlertData — SSN detection', () => {
    it('blocks SSN 123-45-6789 in alert_category', () => {
      const result = validateAlertData(makeAlert({ alert_category: 'SSN: 123-45-6789' }));
      expect(result.valid).toBe(false);
    });

    it('blocks SSN without dashes', () => {
      const result = validateAlertData(makeAlert({ alert_signature: 'ET EXPLOIT 123456789' }));
      // 9 digits matches SSN pattern
      expect(result.valid).toBe(false);
    });

    it('blocks SSN with spaces', () => {
      const result = validateAlertData(makeAlert({ reported_by: '123 45 6789' }));
      expect(result.valid).toBe(false);
    });
  });

  describe('validateAlertData — phone number detection', () => {
    it('blocks US phone in alert_category', () => {
      const result = validateAlertData(makeAlert({ alert_category: 'Call 555-123-4567' }));
      expect(result.valid).toBe(false);
    });

    it('blocks phone with country code', () => {
      const result = validateAlertData(makeAlert({ reported_by: '+1-555-123-4567' }));
      expect(result.valid).toBe(false);
    });
  });

  describe('validateAlertData — credit card detection', () => {
    it('blocks valid Luhn credit card number', () => {
      // 4111111111111111 — valid Visa test number, passes Luhn
      const result = validateAlertData(makeAlert({ alert_category: '4111111111111111' }));
      expect(result.valid).toBe(false);
    });

    it('does not block 16-digit number failing Luhn', () => {
      // 4111111111111112 — fails Luhn
      const result = validateAlertData(makeAlert({ alert_category: '4111111111111112' }));
      // Should pass (no other PII detected)
      expect(result.valid).toBe(true);
    });
  });

  describe('validateAlertData — full name warning (non-blocking)', () => {
    it('warns on full name in alert_signature but does not block', () => {
      // Alert signatures can legitimately contain proper nouns
      const result = validateAlertData(
        makeAlert({ alert_signature: 'ET EXPLOIT Microsoft Exchange ProxyLogon RCE' }),
      );
      // "Microsoft Exchange" matches full name heuristic → warn only, do not block
      expect(result.valid).toBe(true);
    });

    it('warns on full name in reported_by but does not block', () => {
      const result = validateAlertData(makeAlert({ reported_by: 'John Smith' }));
      expect(result.valid).toBe(true);
    });
  });

  describe('validateAlertData — valid alert signatures not flagged', () => {
    const validSignatures = [
      'ET EXPLOIT Apache log4j RCE Attempt (CVE-2021-44228)',
      'ET SCAN Potential SSH Scan',
      'ET MALWARE Win32/Agent.C2 Beacon',
      'ET TROJAN Cobalt Strike Beacon Detected',
      'SURICATA HTTP Request Abnormal Content',
    ];

    for (const sig of validSignatures) {
      it(`does not block valid signature: "${sig}"`, () => {
        const result = validateAlertData(makeAlert({ alert_signature: sig }));
        expect(result.valid).toBe(true);
      });
    }
  });
});

describe('scanFreeText', () => {
  it('returns safe for empty string', () => {
    expect(scanFreeText('')).toEqual({ safe: true, violations: [] });
  });

  it('returns safe for whitespace-only string', () => {
    expect(scanFreeText('   ')).toEqual({ safe: true, violations: [] });
  });

  it('returns safe for clean security text', () => {
    const result = scanFreeText('Make this section more concise and professional.');
    expect(result.safe).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('detects email address', () => {
    const result = scanFreeText('Contact user@example.com for more information.');
    expect(result.safe).toBe(false);
    expect(result.violations).toContain('email address detected');
  });

  it('detects SSN', () => {
    const result = scanFreeText('SSN is 123-45-6789');
    expect(result.safe).toBe(false);
    expect(result.violations).toContain('Social Security Number detected');
  });

  it('detects phone number', () => {
    const result = scanFreeText('Call 555-123-4567 for details.');
    expect(result.safe).toBe(false);
    expect(result.violations).toContain('phone number detected');
  });

  it('detects valid credit card number (passes Luhn)', () => {
    const result = scanFreeText('Card: 4111111111111111');
    expect(result.safe).toBe(false);
    expect(result.violations).toContain('credit card number detected');
  });

  it('does not flag credit card number that fails Luhn', () => {
    const result = scanFreeText('Number: 4111111111111112');
    expect(result.safe).toBe(true);
  });

  it('returns multiple violations when multiple PII patterns match', () => {
    const result = scanFreeText('Email a@b.com SSN 123-45-6789');
    expect(result.safe).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });
});

describe('luhnCheck', () => {
  it('returns true for valid Visa test number', () => {
    expect(luhnCheck('4111111111111111')).toBe(true);
  });

  it('returns true for valid Mastercard test number', () => {
    expect(luhnCheck('5500005555555559')).toBe(true);
  });

  it('returns false for invalid number', () => {
    expect(luhnCheck('4111111111111112')).toBe(false);
  });

  it('returns false for non-numeric string', () => {
    expect(luhnCheck('not-a-number')).toBe(false);
  });

  it('handles numbers with spaces and dashes', () => {
    expect(luhnCheck('4111-1111-1111-1111')).toBe(true);
    expect(luhnCheck('4111 1111 1111 1111')).toBe(true);
  });

  it('returns false for too-short number', () => {
    expect(luhnCheck('123456789012')).toBe(false);
  });
});
