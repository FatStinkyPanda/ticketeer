import { useState } from 'react';
import type { ProviderId } from '../../types/provider.types';
import { getProvider } from '../../constants/providers';

interface ApiKeyFieldProps {
  provider: ProviderId;
  value: string | null;
  onSave: (key: string) => void;
  onDelete: () => void;
}

function maskApiKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return '••••••••' + key.slice(-4);
}

function validateKeyFormat(provider: ProviderId, key: string): boolean {
  const providerData = getProvider(provider);
  if (!providerData?.apiKeyPrefix) return key.length > 10; // Gemini — no specific prefix
  return key.startsWith(providerData.apiKeyPrefix) && key.length > 20;
}

export function ApiKeyField({ provider, value, onSave, onDelete }: ApiKeyFieldProps) {
  const [inputValue, setInputValue] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [validationState, setValidationState] = useState<'idle' | 'valid' | 'invalid'>('idle');

  const providerData = getProvider(provider);
  /* v8 ignore next */
  const providerName = providerData?.name ?? provider;
  const prefix = providerData?.apiKeyPrefix;

  const hasKey = Boolean(value);

  const handleSave = () => {
    const trimmed = inputValue.trim();
    /* v8 ignore next */
    if (!trimmed) return;

    const isValid = validateKeyFormat(provider, trimmed);
    setValidationState(isValid ? 'valid' : 'invalid');

    if (isValid) {
      onSave(trimmed);
      setInputValue('');
    }
  };

  const handleReveal = () => setIsRevealed((r) => !r);

  const handleDeleteConfirm = () => {
    onDelete();
    setShowConfirmDelete(false);
    setValidationState('idle');
  };

  return (
    <div
      role="region"
      className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
      aria-label={`${providerName} API key settings`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{providerName}</h3>
        {prefix && (
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Key format: {prefix}...
          </span>
        )}
      </div>

      {hasKey ? (
        /* Key already saved */
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-slate-100 px-3 py-2 text-sm font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {/* v8 ignore next */}
              {isRevealed ? (value ?? '') : maskApiKey(value ?? '')}
            </code>

            <button
              type="button"
              onClick={handleReveal}
              aria-label={isRevealed ? 'Hide API key' : 'Reveal API key'}
              className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            >
              {isRevealed ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z" clipRule="evenodd" />
                  <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                  <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>

          {!showConfirmDelete ? (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              aria-label={`Delete ${providerName} API key`}
              className="text-xs font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 underline"
            >
              Delete key
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Permanently delete this key?
              </span>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="text-xs font-medium text-red-600 hover:text-red-800 dark:text-red-400"
              >
                Yes, delete
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      ) : (
        /* No key saved — show input */
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="password"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setValidationState('idle');
              }}
              placeholder={prefix ? `${prefix}api-...` : 'Paste API key here'}
              aria-label={`${providerName} API key input`}
              className={`flex-1 rounded-md border px-3 py-2 font-mono text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-800 dark:text-slate-100 ${
                validationState === 'invalid'
                  ? 'border-red-400 dark:border-red-600'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={!inputValue.trim()}
              aria-label={`Save ${providerName} API key`}
              className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-brand-500"
            >
              Save
            </button>
          </div>

          {validationState === 'valid' && (
            <p className="text-xs text-green-600 dark:text-green-400" role="status">
              ✓ Key format valid — saved successfully
            </p>
          )}
          {validationState === 'invalid' && (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">
              Key format appears invalid.
              {prefix ? ` Expected to start with "${prefix}".` : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
