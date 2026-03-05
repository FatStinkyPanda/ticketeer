import type { ProviderModel, ProviderId } from '../types/provider.types';

// Session-level model cache keyed by "${provider}:${apiKey ?? ''}"
const modelCache = new Map<string, ProviderModel[]>();

function cacheKey(provider: ProviderId, apiKey: string | null): string {
  return `${provider}:${apiKey ?? ''}`;
}

/** Synchronous cache lookup — returns cached models or null if not cached. */
export function getCachedModels(provider: ProviderId, apiKey: string | null): ProviderModel[] | null {
  return modelCache.get(cacheKey(provider, apiKey)) ?? null;
}

/**
 * Clear the model cache.
 * - With provider: clears only the entry for that provider+apiKey pair.
 * - Without provider: clears the entire cache.
 */
export function clearModelCache(provider?: ProviderId, apiKey?: string | null): void {
  if (provider !== undefined) {
    modelCache.delete(cacheKey(provider, apiKey ?? null));
  } else {
    modelCache.clear();
  }
}

// ─── Provider-specific fetch functions ───────────────────────────────────────

interface AnthropicModelItem {
  id: string;
  display_name?: string;
}

interface AnthropicModelsResponse {
  data: AnthropicModelItem[];
}

async function fetchAnthropicModels(apiKey: string): Promise<ProviderModel[]> {
  const response = await fetch('https://api.anthropic.com/v1/models?limit=1000', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
  });
  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }
  const data = (await response.json()) as AnthropicModelsResponse;
  return data.data.map((m) => ({ id: m.id, name: m.display_name ?? m.id }));
}

interface GeminiModelItem {
  name: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
}

interface GeminiModelsResponse {
  models: GeminiModelItem[];
}

async function fetchGeminiModels(apiKey: string): Promise<ProviderModel[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=100`,
  );
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }
  const data = (await response.json()) as GeminiModelsResponse;
  return data.models
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => {
      const id = m.name.replace(/^models\//, '');
      return { id, name: m.displayName ?? id };
    });
}

interface OpenRouterModelPricing {
  prompt: string;
  completion: string;
}

interface OpenRouterModelItem {
  id: string;
  name: string;
  pricing?: OpenRouterModelPricing;
}

interface OpenRouterModelsResponse {
  data: OpenRouterModelItem[];
}

async function fetchOpenRouterModels(apiKey: string | null): Promise<ProviderModel[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  const response = await fetch('https://openrouter.ai/api/v1/models', { headers });
  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }
  const data = (await response.json()) as OpenRouterModelsResponse;
  return data.data.map((m) => ({
    id: m.id,
    name: m.name,
    isFree: m.pricing?.prompt === '0' && m.pricing?.completion === '0',
  }));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch the list of models for a provider.
 * Results are cached for the session to avoid redundant API calls.
 * Throws on network or API errors.
 */
export async function fetchModelsForProvider(
  provider: ProviderId,
  apiKey: string | null,
): Promise<ProviderModel[]> {
  const key = cacheKey(provider, apiKey);
  if (modelCache.has(key)) {
    return modelCache.get(key)!;
  }

  let models: ProviderModel[];
  if (provider === 'anthropic') {
    if (!apiKey) throw new Error('Anthropic API key required');
    models = await fetchAnthropicModels(apiKey);
  } else if (provider === 'gemini') {
    if (!apiKey) throw new Error('Gemini API key required');
    models = await fetchGeminiModels(apiKey);
  } else {
    models = await fetchOpenRouterModels(apiKey);
  }

  modelCache.set(key, models);
  return models;
}
