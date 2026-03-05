import CryptoJS from 'crypto-js';

/**
 * AES-256 encryption/decryption utilities for local API key storage.
 *
 * In the web build, keys are encrypted with AES-256-CBC via crypto-js using a
 * session-derived key stored in sessionStorage. This ensures keys are never
 * stored as plaintext in localStorage.
 *
 * Security properties:
 * - Keys are encrypted before any write to localStorage.
 * - Keys are decrypted only on-demand, immediately before API calls.
 * - No plaintext key ever touches the disk.
 * - No key is ever included in logs, errors, or console output.
 */

const SESSION_KEY_STORAGE = 'ticketeer_sk';

/**
 * Generate or retrieve the session encryption key.
 * The key is stored in sessionStorage (cleared on browser/tab close).
 */
function getOrCreateSessionKey(): string {
  let key = sessionStorage.getItem(SESSION_KEY_STORAGE);
  if (!key) {
    key = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
    sessionStorage.setItem(SESSION_KEY_STORAGE, key);
  }
  return key;
}

/**
 * Encrypt a plaintext string using AES-256.
 * Returns a ciphertext string suitable for storage.
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return '';
  const key = getOrCreateSessionKey();
  const encrypted = CryptoJS.AES.encrypt(plaintext, key);
  return encrypted.toString();
}

/**
 * Decrypt a ciphertext string previously encrypted with `encrypt()`.
 * Returns the original plaintext, or null if decryption fails.
 */
export function decrypt(ciphertext: string): string | null {
  if (!ciphertext) return null;
  try {
    const key = getOrCreateSessionKey();
    const decrypted = CryptoJS.AES.decrypt(ciphertext, key);
    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
    return plaintext || null;
  } catch {
    return null;
  }
}

/**
 * Clear the session encryption key.
 * This makes all previously encrypted data permanently inaccessible.
 * Call this on logout or session end.
 */
export function clearSessionKey(): void {
  sessionStorage.removeItem(SESSION_KEY_STORAGE);
}
