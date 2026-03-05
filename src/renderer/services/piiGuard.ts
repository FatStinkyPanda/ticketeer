import type { AlertData, PiiGuardResult, PiiFieldError, AlertField } from '../types/alert.types';
import { validateIpAddress } from '../constants/rfc1918';

/**
 * PII Guard — synchronous local validation layer.
 *
 * Runs on all alert field values before any data is packaged into the API prompt.
 * This is entirely client-side logic — no network calls.
 *
 * Design principle: prefer false positives (blocking valid data) over false
 * negatives (allowing PII through). When in doubt, block.
 */

// PII detection patterns
const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const SSN_PATTERN = /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/;
// Phone pattern uses lookbehind/lookahead to avoid false-positives inside longer digit sequences
// (e.g., 16-digit credit card numbers should not trigger the phone detector)
const PHONE_PATTERN = /(?<!\d)(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?!\d)/;
// Credit card: 13-16 digits, possibly separated by spaces or dashes
const CREDIT_CARD_PATTERN = /\b(?:\d[ \-]?){13,16}\b/;
// Full name heuristic: Two capitalized words (warn only — may be in alert signatures)
const FULL_NAME_PATTERN = /\b[A-Z][a-z]{1,30}\s[A-Z][a-z]{1,30}\b/;

/**
 * Luhn algorithm check for credit card number validation.
 */
function luhnCheck(numStr: string): boolean {
  const digits = numStr.replace(/[\s\-]/g, '');
  if (!/^\d{13,16}$/.test(digits)) return false;

  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (isEven) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

/**
 * Fields that are scanned for PII patterns.
 */
const TEXT_FIELDS_TO_SCAN: AlertField[] = [
  'timestamp',
  'alert_category',
  'alert_signature',
  'proto',
  'app_proto',
  'reported_by',
];

/**
 * Scan a single field value for blocking PII patterns.
 * Returns array of errors (empty if clean).
 */
function scanFieldForPii(field: AlertField, value: string): PiiFieldError[] {
  const errors: PiiFieldError[] = [];
  if (!value || value.trim() === '') return errors;

  if (EMAIL_PATTERN.test(value)) {
    errors.push({
      field,
      message: `Field "${field}" appears to contain an email address. Remove PII before submitting.`,
      severity: 'error',
    });
  }

  if (SSN_PATTERN.test(value)) {
    errors.push({
      field,
      message: `Field "${field}" appears to contain a Social Security Number. Remove PII before submitting.`,
      severity: 'error',
    });
  }

  if (PHONE_PATTERN.test(value)) {
    errors.push({
      field,
      message: `Field "${field}" appears to contain a phone number. Remove PII before submitting.`,
      severity: 'error',
    });
  }

  // Credit card: only block if pattern matches AND Luhn check passes
  const ccMatches = value.match(CREDIT_CARD_PATTERN);
  if (ccMatches) {
    const ccCandidate = ccMatches[0].replace(/[\s\-]/g, '');
    if (luhnCheck(ccCandidate)) {
      errors.push({
        field,
        message: `Field "${field}" appears to contain a credit card number. Remove PII before submitting.`,
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Scan for warn-only PII patterns (full names).
 * These produce warnings, not blocking errors.
 */
function scanFieldForWarnings(field: AlertField, value: string): PiiFieldError[] {
  const warnings: PiiFieldError[] = [];
  if (!value || value.trim() === '') return warnings;

  if (FULL_NAME_PATTERN.test(value)) {
    warnings.push({
      field,
      message: `Field "${field}" may contain a full name. Verify no customer PII is present (alert signatures may legitimately contain proper nouns).`,
      severity: 'warn',
    });
  }

  return warnings;
}

/**
 * Validate IP address fields in the alert data.
 */
function validateIpFields(data: AlertData): PiiFieldError[] {
  const errors: PiiFieldError[] = [];

  if (data.src_ip && data.src_ip.trim() !== '') {
    const result = validateIpAddress(data.src_ip.trim());
    if (!result.valid) {
      errors.push({ field: 'src_ip', message: `Source IP: ${result.error}`, severity: 'error' });
    } else if (result.isPublic && !data.src_ip_is_public) {
      errors.push({
        field: 'src_ip',
        message:
          'Public IP addresses cannot be submitted without marking this field as public. Toggle "Public IP" to acknowledge.',
        severity: 'error',
      });
    }
  }

  if (data.dest_ip && data.dest_ip.trim() !== '') {
    const result = validateIpAddress(data.dest_ip.trim());
    if (!result.valid) {
      errors.push({ field: 'dest_ip', message: `Destination IP: ${result.error}`, severity: 'error' });
    } else if (result.isPublic && !data.dest_ip_is_public) {
      errors.push({
        field: 'dest_ip',
        message:
          'Public IP addresses cannot be submitted without marking this field as public. Toggle "Public IP" to acknowledge.',
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Validate port values.
 */
function validatePorts(data: AlertData): PiiFieldError[] {
  const errors: PiiFieldError[] = [];

  if (data.src_port && data.src_port.trim() !== '') {
    const port = parseInt(data.src_port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push({ field: 'src_port', message: 'Source port must be a number between 1 and 65535.', severity: 'error' });
    }
  }

  if (data.dest_port && data.dest_port.trim() !== '') {
    const port = parseInt(data.dest_port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push({ field: 'dest_port', message: 'Destination port must be a number between 1 and 65535.', severity: 'error' });
    }
  }

  return errors;
}

/**
 * Run all PII validation checks on alert data.
 *
 * Returns:
 * - `{ valid: true }` if all checks pass (including warn-only issues — those don't block)
 * - `{ valid: false, errors: [...] }` if any blocking check fails
 */
export function validateAlertData(data: AlertData): PiiGuardResult {
  const blockingErrors: PiiFieldError[] = [];
  const warnings: PiiFieldError[] = [];

  // Validate IP fields
  blockingErrors.push(...validateIpFields(data));

  // Validate ports
  blockingErrors.push(...validatePorts(data));

  // Scan text fields for PII
  for (const field of TEXT_FIELDS_TO_SCAN) {
    const value = data[field] as string;
    blockingErrors.push(...scanFieldForPii(field, value));
    warnings.push(...scanFieldForWarnings(field, value));
  }

  if (blockingErrors.length > 0) {
    return {
      valid: false,
      errors: [...blockingErrors, ...warnings],
    };
  }

  return { valid: true };
}

// Export patterns for testing
export const _testExports = {
  EMAIL_PATTERN,
  SSN_PATTERN,
  PHONE_PATTERN,
  CREDIT_CARD_PATTERN,
  FULL_NAME_PATTERN,
  luhnCheck,
  scanFieldForPii,
  scanFieldForWarnings,
  validateIpFields,
  validatePorts,
};
