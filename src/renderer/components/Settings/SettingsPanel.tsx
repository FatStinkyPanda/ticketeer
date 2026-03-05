import { useSettings } from '../../hooks/useSettings';
import { PROVIDERS } from '../../constants/providers';
import { ApiKeyField } from './ApiKeyField';
import type { Theme } from '../../types/settings.types';

export function SettingsPanel() {
  const settings = useSettings();

  return (
    <div role="region" className="space-y-8" aria-label="Settings panel">
      {/* API Keys Section */}
      <section aria-labelledby="api-keys-heading">
        <h2
          id="api-keys-heading"
          className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4"
        >
          API Keys
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          API keys are encrypted and stored locally. They are never sent to any server other than
          the AI provider you select.
        </p>
        <div className="space-y-3">
          {PROVIDERS.map((provider) => (
            <ApiKeyField
              key={provider.id}
              provider={provider.id}
              value={settings.getApiKey(provider.id)}
              onSave={(key) => settings.setApiKey(provider.id, key)}
              onDelete={() => settings.setApiKey(provider.id, null)}
            />
          ))}
        </div>
      </section>

      {/* Preferences Section */}
      <section aria-labelledby="preferences-heading">
        <h2
          id="preferences-heading"
          className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4"
        >
          Preferences
        </h2>

        <div className="space-y-4">
          {/* Theme */}
          <div>
            <label
              htmlFor="theme-select"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Theme
            </label>
            <select
              id="theme-select"
              value={settings.theme}
              onChange={(e) => settings.setTheme(e.target.value as Theme)}
              className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          {/* Max Output Tokens */}
          <div>
            <label
              htmlFor="max-tokens"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Max Output Tokens
            </label>
            <input
              id="max-tokens"
              type="number"
              min={512}
              max={131072}
              step={256}
              value={settings.maxOutputTokens}
              onChange={(e) => settings.setMaxOutputTokens(parseInt(e.target.value, 10))}
              className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Default: 64000. Increase for very large tickets or decrease to save costs.
            </p>
          </div>
        </div>
      </section>

      {/* Security Note */}
      <div className="rounded-lg border border-brand-100 bg-brand-50 p-4 dark:border-brand-900 dark:bg-brand-950">
        <h3 className="text-sm font-semibold text-brand-800 dark:text-brand-300 mb-2">
          Privacy & Security
        </h3>
        <ul className="space-y-1 text-xs text-brand-700 dark:text-brand-400">
          <li>• API keys are encrypted with AES-256 and stored in your browser&apos;s local storage. The encryption key is session-scoped and cleared when the tab closes.</li>
          <li>• A Content Security Policy restricts all network requests to whitelisted AI provider endpoints, blocking unauthorised data exfiltration.</li>
          <li>• No data is sent to any server other than the AI provider you select.</li>
          <li>• PII is detected and blocked locally before any API call is made.</li>
          <li>• Alert data and generated tickets are never persisted to storage.</li>
        </ul>
      </div>
    </div>
  );
}
