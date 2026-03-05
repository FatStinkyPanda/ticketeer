import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSettingsStore, getApiKey } from './settingsStore';
import { encrypt } from '../services/encryption';

function resetStore() {
  useSettingsStore.setState({
    anthropicApiKey: 'sk-ant-test',
    geminiApiKey: 'gemini-test',
    openrouterApiKey: 'sk-or-test',
    lastProvider: 'anthropic',
    lastModel: 'claude-sonnet-4-5',
    theme: 'system',
    maxOutputTokens: 4096,
  });
}

describe('settingsStore', () => {
  beforeEach(() => {
    resetStore();
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getApiKey', () => {
    it('returns anthropic API key', () => {
      expect(getApiKey('anthropic')).toBe('sk-ant-test');
    });

    it('returns gemini API key', () => {
      expect(getApiKey('gemini')).toBe('gemini-test');
    });

    it('returns openrouter API key', () => {
      expect(getApiKey('openrouter')).toBe('sk-or-test');
    });

    it('returns null when key is not set', () => {
      useSettingsStore.setState({ anthropicApiKey: null });
      expect(getApiKey('anthropic')).toBeNull();
    });
  });

  describe('loadFromStorage', () => {
    it('loads settings from localStorage on module initialization', async () => {
      const testKey = 'sk-ant-from-storage-12345';
      const encrypted = encrypt(testKey);

      localStorage.setItem(
        'ticketeer_settings',
        JSON.stringify({
          anthropicApiKey: encrypted,
          geminiApiKey: null,
          openrouterApiKey: null,
          lastProvider: 'anthropic',
          lastModel: 'claude-haiku-4-5-20251001',
          theme: 'dark',
          maxOutputTokens: 8192,
        }),
      );

      vi.resetModules();
      const { useSettingsStore: freshStore } = await import('./settingsStore');
      const state = freshStore.getState();

      expect(state.anthropicApiKey).toBe(testKey);
      expect(state.lastProvider).toBe('anthropic');
      expect(state.lastModel).toBe('claude-haiku-4-5-20251001');
      expect(state.theme).toBe('dark');
      expect(state.maxOutputTokens).toBe(8192);
    });

    it('returns default settings when localStorage is empty', async () => {
      localStorage.clear();
      vi.resetModules();
      const { useSettingsStore: freshStore } = await import('./settingsStore');
      const state = freshStore.getState();

      expect(state.anthropicApiKey).toBeNull();
      expect(state.theme).toBe('system');
      expect(state.maxOutputTokens).toBe(4096);
    });

    it('decrypts gemini and openrouter keys, null for missing anthropic, and defaults non-numeric maxOutputTokens', async () => {
      const geminiKey = 'AIzaSy-gemini-key-12345678901234';
      const openrouterKey = 'sk-or-v1-openrouter-key-12345678';

      localStorage.setItem(
        'ticketeer_settings',
        JSON.stringify({
          anthropicApiKey: null, // falsy → null branch (line 19)
          geminiApiKey: encrypt(geminiKey), // truthy → decrypt branch (line 21)
          openrouterApiKey: encrypt(openrouterKey), // truthy → decrypt branch (line 24)
          lastProvider: 'gemini',
          lastModel: 'gemini-2.0-flash',
          theme: 'dark',
          maxOutputTokens: 'not-a-number', // non-numeric → default branch (line 37)
        }),
      );

      vi.resetModules();
      const { useSettingsStore: freshStore } = await import('./settingsStore');
      const state = freshStore.getState();

      expect(state.anthropicApiKey).toBeNull();
      expect(state.geminiApiKey).toBe(geminiKey);
      expect(state.openrouterApiKey).toBe(openrouterKey);
      expect(state.maxOutputTokens).toBe(4096);
    });

    it('uses null and default theme when lastProvider, lastModel, and theme are missing from storage', async () => {
      localStorage.setItem(
        'ticketeer_settings',
        JSON.stringify({
          anthropicApiKey: null,
          geminiApiKey: null,
          openrouterApiKey: null,
          maxOutputTokens: 4096,
          // lastProvider, lastModel, theme intentionally omitted — triggers ?? right sides
        }),
      );

      vi.resetModules();
      const { useSettingsStore: freshStore } = await import('./settingsStore');
      const state = freshStore.getState();

      expect(state.lastProvider).toBeNull();
      expect(state.lastModel).toBeNull();
      expect(state.theme).toBe('system');
    });

    it('returns default settings when localStorage data is malformed JSON', async () => {
      localStorage.setItem('ticketeer_settings', 'not-valid-json{{{');
      vi.resetModules();
      const { useSettingsStore: freshStore } = await import('./settingsStore');
      const state = freshStore.getState();

      expect(state.anthropicApiKey).toBeNull();
      expect(state.theme).toBe('system');
    });
  });

  describe('saveToStorage catch', () => {
    it('silently handles localStorage.setItem failure without throwing', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => {
        useSettingsStore.getState().setApiKey('anthropic', 'new-key');
      }).not.toThrow();
    });
  });
});
