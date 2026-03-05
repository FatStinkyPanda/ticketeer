import { describe, it, expect, vi, beforeEach } from 'vitest';
import CryptoJS from 'crypto-js';
import { encrypt, decrypt, clearSessionKey } from './encryption';

describe('encryption', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe('encrypt', () => {
    it('returns a non-empty string for valid input', () => {
      const result = encrypt('sk-ant-test-key-12345');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('returns empty string for empty input', () => {
      expect(encrypt('')).toBe('');
    });

    it('produces different ciphertext for different values', () => {
      const c1 = encrypt('key-one');
      const c2 = encrypt('key-two');
      expect(c1).not.toBe(c2);
    });

    it('ciphertext does not contain plaintext', () => {
      const plaintext = 'sk-ant-supersecret-api-key';
      const ciphertext = encrypt(plaintext);
      expect(ciphertext).not.toContain(plaintext);
    });
  });

  describe('decrypt', () => {
    it('round-trips correctly: decrypt(encrypt(x)) === x', () => {
      const original = 'sk-ant-api-key-test-value';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('returns null for empty input', () => {
      expect(decrypt('')).toBeNull();
    });

    it('returns null for invalid ciphertext', () => {
      expect(decrypt('not-valid-ciphertext')).toBeNull();
    });

    it('round-trips API key with special characters', () => {
      const key = 'sk-or-v1-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-special!@#';
      expect(decrypt(encrypt(key))).toBe(key);
    });

    it('round-trips a long API key', () => {
      const key = 'sk-ant-api03-' + 'a'.repeat(80);
      expect(decrypt(encrypt(key))).toBe(key);
    });

    it('returns null when CryptoJS.AES.decrypt throws internally', () => {
      vi.spyOn(CryptoJS.AES, 'decrypt').mockImplementation(() => {
        throw new Error('internal decryption error');
      });
      expect(decrypt('some-ciphertext-value')).toBeNull();
    });
  });

  describe('clearSessionKey', () => {
    it('makes previously encrypted data unrecoverable', () => {
      const plaintext = 'super-secret-key';
      const ciphertext = encrypt(plaintext);
      clearSessionKey();
      // After clearing, a new session key is generated on next encrypt/decrypt call
      // The old ciphertext cannot be decrypted with the new key
      const result = decrypt(ciphertext);
      // Result will either be null or garbage, not the original plaintext
      expect(result).not.toBe(plaintext);
    });

    it('allows new encryptions after clearing', () => {
      encrypt('first-key');
      clearSessionKey();
      const newEncrypted = encrypt('second-key');
      expect(decrypt(newEncrypted)).toBe('second-key');
    });
  });

  describe('session key persistence', () => {
    it('produces consistent results within the same session', () => {
      const plaintext = 'consistent-key-test';
      const encrypted1 = encrypt(plaintext);
      const decrypted = decrypt(encrypted1);
      expect(decrypted).toBe(plaintext);
    });
  });
});
