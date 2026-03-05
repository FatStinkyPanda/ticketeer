import type { Provider } from '../types/provider.types';

/**
 * Static fallback model lists for each provider.
 * These are used when dynamic model fetching fails or no API key is present.
 */
export const PROVIDERS: readonly Provider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    apiKeySettingKey: 'anthropicApiKey',
    apiKeyPrefix: 'sk-ant-',
    models: [
      { id: 'claude-opus-4-5', name: 'Claude Opus 4.5' },
      { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    apiKeySettingKey: 'geminiApiKey',
    apiKeyPrefix: '',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    apiKeySettingKey: 'openrouterApiKey',
    apiKeyPrefix: 'sk-or-',
    models: [
      { id: 'openai/gpt-4o', name: 'GPT-4o (OpenAI)' },
      { id: 'anthropic/claude-opus-4-5', name: 'Claude Opus 4.5 (Anthropic)' },
      { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro (Google)' },
      { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B (Meta)' },
    ],
  },
] as const;

export const PROVIDER_MAP = new Map(PROVIDERS.map((p) => [p.id, p]));

export function getProvider(id: string): Provider | undefined {
  return PROVIDER_MAP.get(id as Provider['id']);
}
