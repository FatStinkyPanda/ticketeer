import { useState, useEffect } from 'react';
import type { ProviderModel, ProviderId } from '../types/provider.types';
import { fetchModelsForProvider, getCachedModels } from '../services/modelFetcher';
import { PROVIDERS } from '../constants/providers';

function getFallbackModels(provider: ProviderId): ProviderModel[] {
  /* v8 ignore next */
  return PROVIDERS.find((p) => p.id === provider)?.models ?? [];
}

/** Returns true when a fetch should be initiated on mount/update. */
function shouldFetch(
  provider: ProviderId | null,
  apiKey: string | null,
  cached: ProviderModel[] | null,
): boolean {
  if (!provider) return false;
  if (cached !== null) return false;
  if ((provider === 'anthropic' || provider === 'gemini') && !apiKey) return false;
  return true;
}

export interface UseModelListResult {
  models: ProviderModel[];
  loading: boolean;
  error: string | null;
  isFallback: boolean;
}

/**
 * Resolves the model list for the given provider and API key.
 * - Returns cached models instantly (no loading flash).
 * - Falls back to the static list when no API key is available or on error.
 * - Re-fetches when `refreshTrigger` changes.
 */
export function useModelList(
  provider: ProviderId | null,
  apiKey: string | null,
  refreshTrigger = 0,
): UseModelListResult {
  const cached = provider ? getCachedModels(provider, apiKey) : null;

  const [models, setModels] = useState<ProviderModel[]>(
    cached ?? (provider ? getFallbackModels(provider) : []),
  );
  const [loading, setLoading] = useState<boolean>(shouldFetch(provider, apiKey, cached));
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(
    provider !== null && cached === null,
  );

  useEffect(() => {
    if (!provider) {
      setModels([]);
      setLoading(false);
      setError(null);
      setIsFallback(false);
      return;
    }

    // API key required for Anthropic/Gemini — use static fallback immediately
    if ((provider === 'anthropic' || provider === 'gemini') && !apiKey) {
      setModels(getFallbackModels(provider));
      setLoading(false);
      setError(null);
      setIsFallback(true);
      return;
    }

    // Cache hit — no loading flash
    const cachedModels = getCachedModels(provider, apiKey);
    if (cachedModels) {
      setModels(cachedModels);
      setLoading(false);
      setError(null);
      setIsFallback(false);
      return;
    }

    // Fetch from API
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchModelsForProvider(provider, apiKey).then(
      (fetched) => {
        if (cancelled) return;
        setModels(fetched);
        setLoading(false);
        setIsFallback(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch models');
        setModels(getFallbackModels(provider));
        setLoading(false);
        setIsFallback(true);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [provider, apiKey, refreshTrigger]);

  return { models, loading, error, isFallback };
}
