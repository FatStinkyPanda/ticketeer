import { useSettingsStore } from '../store/settingsStore';
import type { ProviderId } from '../types/provider.types';
import type { Theme } from '../types/settings.types';

/**
 * Hook for accessing and mutating application settings.
 * All API key writes are encrypted before being persisted to localStorage.
 */
export function useSettings() {
  const store = useSettingsStore();

  return {
    // API Keys (decrypted values for use)
    anthropicApiKey: store.anthropicApiKey,
    geminiApiKey: store.geminiApiKey,
    openrouterApiKey: store.openrouterApiKey,

    // Provider/model selection
    lastProvider: store.lastProvider,
    lastModel: store.lastModel,

    // User preferences
    theme: store.theme,
    maxOutputTokens: store.maxOutputTokens,

    // Mutators
    setApiKey: (provider: ProviderId, key: string | null) => store.setApiKey(provider, key),
    setLastProvider: (provider: ProviderId | null) => store.setLastProvider(provider),
    setLastModel: (model: string | null) => store.setLastModel(model),
    setTheme: (theme: Theme) => store.setTheme(theme),
    setMaxOutputTokens: (tokens: number) => store.setMaxOutputTokens(tokens),

    // Helper: does this provider have an API key set?
    hasApiKey: (provider: ProviderId): boolean => {
      switch (provider) {
        case 'anthropic':
          return Boolean(store.anthropicApiKey);
        case 'gemini':
          return Boolean(store.geminiApiKey);
        case 'openrouter':
          return Boolean(store.openrouterApiKey);
      }
    },

    // Helper: get the API key for a given provider
    getApiKey: (provider: ProviderId): string | null => {
      switch (provider) {
        case 'anthropic':
          return store.anthropicApiKey;
        case 'gemini':
          return store.geminiApiKey;
        case 'openrouter':
          return store.openrouterApiKey;
      }
    },
  };
}
