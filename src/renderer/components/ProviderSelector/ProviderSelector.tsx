import { useEffect } from 'react';
import { PROVIDERS } from '../../constants/providers';
import { useSettings } from '../../hooks/useSettings';
import type { ProviderId } from '../../types/provider.types';

interface ProviderSelectorProps {
  disabled?: boolean;
}

export function ProviderSelector({ disabled = false }: ProviderSelectorProps) {
  const settings = useSettings();
  const { lastProvider, lastModel, setLastProvider, setLastModel } = settings;

  const currentProvider = lastProvider ? PROVIDERS.find((p) => p.id === lastProvider) : null;
  const models = currentProvider?.models ?? [];

  // If the current model is not in the model list, reset to the first model
  useEffect(() => {
    if (currentProvider && models.length > 0) {
      const modelExists = models.some((m) => m.id === lastModel);
      if (!modelExists) {
        setLastModel(models[0].id);
      }
    }
  }, [currentProvider, models, lastModel, setLastModel]);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as ProviderId;
    setLastProvider(newProvider || null);
    // Reset model to first available for new provider
    const newProviderData = PROVIDERS.find((p) => p.id === newProvider);
    if (newProviderData?.models[0]) {
      setLastModel(newProviderData.models[0].id);
    } else {
      setLastModel(null);
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    /* v8 ignore next */
    setLastModel(e.target.value || null);
  };

  return (
    <div className="flex gap-3 flex-wrap" aria-label="AI provider and model selection">
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

      <div className="flex-1 min-w-48">
        <label
          htmlFor="model-select"
          className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
        >
          Model
        </label>
        <select
          id="model-select"
          value={lastModel ?? ''}
          onChange={handleModelChange}
          disabled={disabled || !currentProvider}
          aria-label="Select AI model"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Select model...</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
