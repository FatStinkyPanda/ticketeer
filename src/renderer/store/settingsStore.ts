import { create } from 'zustand';
import type { TicketeerSettings, Theme } from '../types/settings.types';
import type { ProviderId } from '../types/provider.types';
import { DEFAULT_SETTINGS } from '../types/settings.types';
import { encrypt, decrypt } from '../services/encryption';

const STORAGE_KEY = 'ticketeer_settings';

function loadFromStorage(): TicketeerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(raw) as Record<string, unknown>;

    // Decrypt API keys on load
    const anthropicApiKey = parsed['anthropicApiKey']
      ? decrypt(parsed['anthropicApiKey'] as string)
      : null;
    const geminiApiKey = parsed['geminiApiKey']
      ? decrypt(parsed['geminiApiKey'] as string)
      : null;
    const openrouterApiKey = parsed['openrouterApiKey']
      ? decrypt(parsed['openrouterApiKey'] as string)
      : null;

    return {
      anthropicApiKey,
      geminiApiKey,
      openrouterApiKey,
      lastProvider: (parsed['lastProvider'] as ProviderId | null) ?? null,
      lastModel: (parsed['lastModel'] as string | null) ?? null,
      theme: (parsed['theme'] as Theme) ?? DEFAULT_SETTINGS.theme,
      maxOutputTokens:
        typeof parsed['maxOutputTokens'] === 'number'
          ? parsed['maxOutputTokens']
          : DEFAULT_SETTINGS.maxOutputTokens,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveToStorage(settings: TicketeerSettings): void {
  try {
    const toStore = {
      // Encrypt API keys before writing to localStorage
      anthropicApiKey: settings.anthropicApiKey ? encrypt(settings.anthropicApiKey) : null,
      geminiApiKey: settings.geminiApiKey ? encrypt(settings.geminiApiKey) : null,
      openrouterApiKey: settings.openrouterApiKey ? encrypt(settings.openrouterApiKey) : null,
      // Plaintext fields
      lastProvider: settings.lastProvider,
      lastModel: settings.lastModel,
      theme: settings.theme,
      maxOutputTokens: settings.maxOutputTokens,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // Storage failure is non-fatal — settings will be in-memory only
  }
}

interface SettingsState extends TicketeerSettings {
  setApiKey: (provider: ProviderId, key: string | null) => void;
  setLastProvider: (provider: ProviderId | null) => void;
  setLastModel: (model: string | null) => void;
  setTheme: (theme: Theme) => void;
  setMaxOutputTokens: (tokens: number) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ...loadFromStorage(),

  setApiKey: (provider, key) => {
    const keyField = `${provider}ApiKey` as keyof Pick<
      TicketeerSettings,
      'anthropicApiKey' | 'geminiApiKey' | 'openrouterApiKey'
    >;
    set((state) => {
      const next = { ...state, [keyField]: key };
      saveToStorage(next);
      return { [keyField]: key };
    });
  },

  setLastProvider: (provider) => {
    set((state) => {
      const next = { ...state, lastProvider: provider };
      saveToStorage(next);
      return { lastProvider: provider };
    });
  },

  setLastModel: (model) => {
    set((state) => {
      const next = { ...state, lastModel: model };
      saveToStorage(next);
      return { lastModel: model };
    });
  },

  setTheme: (theme) => {
    set((state) => {
      const next = { ...state, theme };
      saveToStorage(next);
      return { theme };
    });
  },

  setMaxOutputTokens: (tokens) => {
    set((state) => {
      const next = { ...state, maxOutputTokens: tokens };
      saveToStorage(next);
      return { maxOutputTokens: tokens };
    });
  },
}));

// Export the getter for use in hooks/services that need the raw API key
export function getApiKey(provider: ProviderId): string | null {
  const state = useSettingsStore.getState();
  switch (provider) {
    case 'anthropic':
      return state.anthropicApiKey;
    case 'gemini':
      return state.geminiApiKey;
    case 'openrouter':
      return state.openrouterApiKey;
  }
}
