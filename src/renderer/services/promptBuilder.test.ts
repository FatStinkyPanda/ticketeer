import { describe, it, expect } from 'vitest';
import { buildPrompt, buildUserMessage } from './promptBuilder';
import { AGENT_INSTRUCTIONS } from '../constants/agentInstructions';
import type { AlertData } from '../types/alert.types';

const emptyAlert: AlertData = {
  timestamp: '',
  alert_category: '',
  alert_signature: '',
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

const fullAlert: AlertData = {
  timestamp: 'Mar 4, 2026 @ 00:52:58.969',
  alert_category: 'Attempted Administrator Privilege Gain',
  alert_signature: 'ET EXPLOIT Apache log4j RCE Attempt (CVE-2021-44228)',
  src_ip: '192.168.1.50',
  src_ip_is_public: false,
  src_port: '54321',
  dest_ip: '10.0.0.5',
  dest_ip_is_public: false,
  dest_port: '443',
  proto: 'TCP',
  app_proto: 'https',
  reported_by: 'J. Analyst',
};

describe('promptBuilder', () => {
  describe('buildPrompt', () => {
    it('returns an object with systemPrompt and userMessage', () => {
      const result = buildPrompt(fullAlert);
      expect(result).toHaveProperty('systemPrompt');
      expect(result).toHaveProperty('userMessage');
    });

    it('system prompt equals verbatim AGENT_INSTRUCTIONS', () => {
      const result = buildPrompt(fullAlert);
      expect(result.systemPrompt).toBe(AGENT_INSTRUCTIONS);
    });

    it('system prompt is not empty', () => {
      const result = buildPrompt(fullAlert);
      expect(result.systemPrompt.length).toBeGreaterThan(100);
    });

    it('system prompt is never modified or truncated', () => {
      const result1 = buildPrompt(fullAlert);
      const result2 = buildPrompt(emptyAlert);
      expect(result1.systemPrompt).toBe(result2.systemPrompt);
    });
  });

  describe('buildUserMessage — field inclusion', () => {
    it('includes timestamp when provided', () => {
      const msg = buildUserMessage({ ...emptyAlert, timestamp: 'Mar 4, 2026 @ 00:52:58.969' });
      expect(msg).toContain('Time: Mar 4, 2026 @ 00:52:58.969');
    });

    it('omits timestamp when empty', () => {
      const msg = buildUserMessage(emptyAlert);
      expect(msg).not.toContain('Time:');
    });

    it('includes alert_category when provided', () => {
      const msg = buildUserMessage({ ...emptyAlert, alert_category: 'ET EXPLOIT' });
      expect(msg).toContain('alert.category: ET EXPLOIT');
    });

    it('omits alert_category when empty', () => {
      const msg = buildUserMessage(emptyAlert);
      expect(msg).not.toContain('alert.category:');
    });

    it('includes alert_signature when provided', () => {
      const msg = buildUserMessage({ ...emptyAlert, alert_signature: 'ET SCAN SSH Scan' });
      expect(msg).toContain('alert.signature: ET SCAN SSH Scan');
    });

    it('omits alert_signature when empty', () => {
      const msg = buildUserMessage(emptyAlert);
      expect(msg).not.toContain('alert.signature:');
    });

    it('includes src_ip with PRIVATE tag for private IP', () => {
      const msg = buildUserMessage({ ...emptyAlert, src_ip: '192.168.1.1', src_ip_is_public: false });
      expect(msg).toContain('src_ip: 192.168.1.1 [PRIVATE]');
    });

    it('includes src_ip with PUBLIC tag when toggle is on', () => {
      const msg = buildUserMessage({ ...emptyAlert, src_ip: '8.8.8.8', src_ip_is_public: true });
      expect(msg).toContain('src_ip: 8.8.8.8 [PUBLIC]');
    });

    it('omits src_ip when empty', () => {
      const msg = buildUserMessage(emptyAlert);
      expect(msg).not.toContain('src_ip:');
    });

    it('includes dest_ip with PRIVATE tag for private IP', () => {
      const msg = buildUserMessage({ ...emptyAlert, dest_ip: '10.0.0.1', dest_ip_is_public: false });
      expect(msg).toContain('dest_ip: 10.0.0.1 [PRIVATE]');
    });

    it('includes dest_ip with PUBLIC tag when toggle is on', () => {
      const msg = buildUserMessage({ ...emptyAlert, dest_ip: '1.1.1.1', dest_ip_is_public: true });
      expect(msg).toContain('dest_ip: 1.1.1.1 [PUBLIC]');
    });

    it('omits dest_ip when empty', () => {
      const msg = buildUserMessage(emptyAlert);
      expect(msg).not.toContain('dest_ip:');
    });

    it('includes src_port when provided', () => {
      const msg = buildUserMessage({ ...emptyAlert, src_port: '54321' });
      expect(msg).toContain('src_port: 54321');
    });

    it('omits src_port when empty', () => {
      const msg = buildUserMessage(emptyAlert);
      expect(msg).not.toContain('src_port:');
    });

    it('includes dest_port when provided', () => {
      const msg = buildUserMessage({ ...emptyAlert, dest_port: '443' });
      expect(msg).toContain('dest_port: 443');
    });

    it('includes proto when provided', () => {
      const msg = buildUserMessage({ ...emptyAlert, proto: 'TCP' });
      expect(msg).toContain('proto: TCP');
    });

    it('omits proto when empty', () => {
      const msg = buildUserMessage(emptyAlert);
      expect(msg).not.toContain('proto:');
    });

    it('includes app_proto when provided', () => {
      const msg = buildUserMessage({ ...emptyAlert, app_proto: 'https' });
      expect(msg).toContain('app_proto: https');
    });

    it('omits app_proto when empty', () => {
      const msg = buildUserMessage(emptyAlert);
      expect(msg).not.toContain('app_proto:');
    });

    it('includes reported_by with exact analyst name', () => {
      const msg = buildUserMessage({ ...emptyAlert, reported_by: 'J. Analyst' });
      expect(msg).toContain('J. Analyst');
      expect(msg).toContain('Reported by');
    });

    it('omits reported_by when empty', () => {
      const msg = buildUserMessage(emptyAlert);
      expect(msg).not.toContain('Reported by');
    });
  });

  describe('buildUserMessage — structure', () => {
    it('contains ALERT DATA section header', () => {
      const msg = buildUserMessage(fullAlert);
      expect(msg).toContain('ALERT DATA:');
    });

    it('contains separator lines', () => {
      const msg = buildUserMessage(fullAlert);
      expect(msg).toContain('---');
    });

    it('instructs AI to output only ticket text', () => {
      const msg = buildUserMessage(fullAlert);
      expect(msg).toContain('Output only the ticket text');
    });

    it('explains [PRIVATE]/[PUBLIC] classification', () => {
      const msg = buildUserMessage(fullAlert);
      expect(msg).toContain('[PRIVATE] or [PUBLIC]');
    });

    it('includes all fields from full alert', () => {
      const msg = buildUserMessage(fullAlert);
      expect(msg).toContain('Mar 4, 2026 @ 00:52:58.969');
      expect(msg).toContain('Attempted Administrator Privilege Gain');
      expect(msg).toContain('ET EXPLOIT Apache log4j RCE Attempt');
      expect(msg).toContain('192.168.1.50 [PRIVATE]');
      expect(msg).toContain('54321');
      expect(msg).toContain('10.0.0.5 [PRIVATE]');
      expect(msg).toContain('443');
      expect(msg).toContain('TCP');
      expect(msg).toContain('https');
      expect(msg).toContain('J. Analyst');
    });

    it('trims whitespace from field values', () => {
      const msg = buildUserMessage({ ...emptyAlert, alert_signature: '  ET SCAN SSH  ' });
      expect(msg).toContain('alert.signature: ET SCAN SSH');
      expect(msg).not.toContain('alert.signature:   ET SCAN SSH  ');
    });
  });
});
