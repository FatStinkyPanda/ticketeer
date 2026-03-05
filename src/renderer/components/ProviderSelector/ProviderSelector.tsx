import { useEffect, useState } from 'react';
import { PROVIDERS } from '../../constants/providers';
import { useSettings } from '../../hooks/useSettings';
import { useModelList } from '../../hooks/useModelList';
import { clearModelCache } from '../../services/modelFetcher';
import type { ProviderId } from '../../types/provider.types';

interface ProviderSelectorProps {
  disabled?: boolean;
}

export function ProviderSelector({ disabled = false }: ProviderSelectorProps) {
  const settings = useSettings();
  const { lastProvider, lastModel, setLastProvider, setLastModel } = settings;

  const apiKey =
    lastProvider === 'anthropic'
      ? settings.anthropicApiKey
      : lastProvider === 'gemini'
        ? settings.geminiApiKey
        : lastProvider === 'openrouter'
          ? settings.openrouterApiKey
          : null;

  const [search, setSearch] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { models, loading, error, isFallback } = useModelList(lastProvider, apiKey, refreshTrigger);

  const filteredModels = models.filter((m) => {
    if (freeOnly && lastProvider === 'openrouter' && !m.isFree) return false;
    const term = search.toLowerCase();
    if (term && !m.name.toLowerCase().includes(term) && !m.id.toLowerCase().includes(term))
      return false;
    return true;
  });

  // If the current model is not in the model list, reset to the first model
  useEffect(() => {
    if (lastProvider && models.length > 0 && !loading) {
      const modelExists = models.some((m) => m.id === lastModel);
      if (!modelExists) {
        setLastModel(models[0].id);
      }
    }
  }, [lastProvider, models, lastModel, loading, setLastModel]);

  // Reset search and freeOnly when provider changes
  useEffect(() => {
    setSearch('');
    setFreeOnly(false);
  }, [lastProvider]);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = (e.target.value as ProviderId) || null;
    setLastProvider(newProvider);
    if (newProvider) {
      const providerData = PROVIDERS.find((p) => p.id === newProvider);
      /* v8 ignore next */
      setLastModel(providerData?.models[0]?.id ?? null);
    } else {
      setLastModel(null);
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    /* v8 ignore next */
    setLastModel(e.target.value || null);
  };

  const handleRefresh = () => {
    if (lastProvider) {
      clearModelCache(lastProvider, apiKey);
      setRefreshTrigger((n) => n + 1);
    }
  };

  return (
    <div className="flex gap-3 flex-wrap" aria-label="AI provider and model selection">
      {/* Provider */}
      <div className="flex-1 min-w-40">
        <label
          htmlFor="provider-select"
          className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
        >
          Provider
        </label>
        <select
          id="provider-select"
          value={lastProvider ?? ''}
          onChange={handleProviderChange}
          disabled={disabled}
          aria-label="Select AI provider"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Select provider...</option>
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Model */}
      <div className="flex-1 min-w-48">
        <div className="flex items-center gap-2 mb-1">
          <label
            htmlFor="model-select"
            className="text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            Model
          </label>
          {loading && (
            <span
              aria-label="Loading models"
              className="text-xs text-slate-400 dark:text-slate-500"
            >
              Loading…
            </span>
          )}
          {isFallback && !loading && (
            <span className="text-xs text-amber-500 dark:text-amber-400" aria-label="Using static model list">
              Static list
            </span>
          )}
          {lastProvider && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={disabled || loading}
              aria-label="Refresh model list"
              className="ml-auto text-xs text-slate-400 hover:text-brand-500 disabled:opacity-40 dark:text-slate-500 dark:hover:text-brand-400"
            >
              ↻ Refresh
            </button>
          )}
        </div>

        {/* Search */}
        {lastProvider && (
          <input
            type="text"
            placeholder="Search models…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
            aria-label="Search models"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm mb-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        )}

        {/* Free only (OpenRouter only) */}
        {lastProvider === 'openrouter' && (
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 mb-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={() => setFreeOnly((v) => !v)}
              aria-label="Show free models only"
              className="rounded border-slate-300 text-brand-500 focus:ring-brand-500 dark:border-slate-600"
            />
            Free models only
          </label>
        )}

        <select
          id="model-select"
          value={lastModel ?? ''}
          onChange={handleModelChange}
          disabled={disabled || !lastProvider}
          aria-label="Select AI model"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Select model…</option>
          {filteredModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.isFree ? ' [FREE]' : ''}
            </option>
          ))}
        </select>

        {error && (
          <p role="alert" className="mt-1 text-xs text-red-500 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
