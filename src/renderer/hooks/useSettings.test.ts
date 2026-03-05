import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettings } from './useSettings';
import { useSettingsStore } from '../store/settingsStore';

describe('useSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    // Reset the store to defaults
    useSettingsStore.setState({
      anthropicApiKey: null,
      geminiApiKey: null,
      openrouterApiKey: null,
      lastProvider: null,
      lastModel: null,
      theme: 'system',
      maxOutputTokens: 4096,
    });
  });

  describe('initial state', () => {
    it('returns null for all API keys initially', () => {
      const { result } = renderHook(() => useSettings());
      expect(result.current.anthropicApiKey).toBeNull();
      expect(result.current.geminiApiKey).toBeNull();
      expect(result.current.openrouterApiKey).toBeNull();
    });

    it('returns null for lastProvider and lastModel initially', () => {
      const { result } = renderHook(() => useSettings());
      expect(result.current.lastProvider).toBeNull();
      expect(result.current.lastModel).toBeNull();
    });

    it('returns system theme by default', () => {
      const { result } = renderHook(() => useSettings());
      expect(result.current.theme).toBe('system');
    });

    it('returns 4096 as default maxOutputTokens', () => {
      const { result } = renderHook(() => useSettings());
      expect(result.current.maxOutputTokens).toBe(4096);
    });
  });

  describe('setApiKey', () => {
    it('sets Anthropic API key', () => {
      const { result } = renderHook(() => useSettings());
      act(() => {
        result.current.setApiKey('anthropic', 'sk-ant-test-key');
      });
      expect(result.current.anthropicApiKey).toBe('sk-ant-test-key');
    });

    it('sets Gemini API key', () => {
      const { result } = renderHook(() => useSettings());
      act(() => {
        result.current.setApiKey('gemini', 'AIzaSy-test-key');
      });
      expect(result.current.geminiApiKey).toBe('AIzaSy-test-key');
    });

    it('sets OpenRouter API key', () => {
      const { result } = renderHook(() => useSettings());
      act(() => {
        result.current.setApiKey('openrouter', 'sk-or-test-key');
      });
      expect(result.current.openrouterApiKey).toBe('sk-or-test-key');
    });

    it('deletes key when set to null', () => {
      const { result } = renderHook(() => useSettings());
      act(() => {
        result.current.setApiKey('anthropic', 'sk-ant-test-key');
      });
      act(() => {
        result.current.setApiKey('anthropic', null);
      });
      expect(result.current.anthropicApiKey).toBeNull();
    });

    it('persists key to localStorage (encrypted)', () => {
      const { result } = renderHook(() => useSettings());
      act(() => {
        result.current.setApiKey('anthropic', 'sk-ant-test-key');
      });
      const stored = localStorage.getItem('ticketeer_settings');
      expect(stored).toBeTruthy();
      // Key should be encrypted, not plaintext
      expect(stored).not.toContain('sk-ant-test-key');
    });
  });

  describe('setLastProvider', () => {
    it('sets the last used provider', () => {
      const { result } = renderHook(() => useSettings());
      act(() => {
        result.current.setLastProvider('anthropic');
      });
      expect(result.current.lastProvider).toBe('anthropic');
    });

    it('can be set to null', () => {
      const { result } = renderHook(() => useSettings());
      act(() => {
        result.current.setLastProvider('gemini');
      });
      act(() => {
        result.current.setLastProvider(null);
      });
      expect(result.current.lastProvider).toBeNull();
    });
  });

  describe('setLastModel', () => {
    it('sets the last used model', () => {
      const { result } = renderHook(() => useSettings());
      act(() => {
        result.current.setLastModel('claude-sonnet-4-5');
      });
      expect(result.current.lastModel).toBe('claude-sonnet-4-5');
    });
  });

  describe('setTheme', () => {
    it('sets light theme', () => {
      const { result } = renderHook(() => useSettings());
      act(() => {
        result.current.setTheme('light');
      });
      expect(result.current.theme).toBe('light');
    });

    it('sets dark theme', () => {
      const { result } = renderHook(() => useSettings());
      act(() => {
        result.current.setTheme('dark');
      });
      expect(result.current.theme).toBe('dark');
    });
  });

  describe('setMaxOutputTokens', () => {
    it('sets max output tokens', () => {
      const { result } = renderHook(() => useSettings());
      act(() => {
        result.current.setMaxOutputTokens(8192);
      });
      expect(result.current.maxOutputTokens).toBe(8192);
    });
  });

  describe('hasApiKey', () => {
    it('returns false when no key is set', () => {
      const { result } = renderHook(() => useSettings());
      expect(result.current.hasApiKey('anthropic')).toBe(false);
    });

    it('returns true after key is set', () => {
      const { result } = renderHook(() => useSettings());
      act(() => {
        result.current.setApiKey('anthropic', 'sk-ant-test');
      });
      expect(result.current.hasApiKey('anthropic')).toBe(true);
    });

    it('returns false after key is deleted', () => {
      const { result } = renderHook(() => useSettings());
      act(() => {
        result.current.setApiKey('gemini', 'AIzaSy-test');
      });
      act(() => {
        result.current.setApiKey('gemini', null);
      });
      expect(result.current.hasApiKey('gemini')).toBe(false);
    });

    it('returns true for openrouter when key is set', () => {
      useSettingsStore.setState({ openrouterApiKey: 'sk-or-v1-test' });
      const { result } = renderHook(() => useSettings());
      expect(result.current.hasApiKey('openrouter')).toBe(true);
    });
  });

  describe('getApiKey', () => {
    it('returns null when key not set', () => {
      const { result } = renderHook(() => useSettings());
      expect(result.current.getApiKey('openrouter')).toBeNull();
    });

    it('returns the plaintext key', () => {
      const { result } = renderHook(() => useSettings());
      act(() => {
        result.current.setApiKey('openrouter', 'sk-or-v1-test');
      });
      expect(result.current.getApiKey('openrouter')).toBe('sk-or-v1-test');
    });
  });
});
