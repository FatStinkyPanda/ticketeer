import { useState, useEffect } from 'react';
import { useSettingsStore } from './store/settingsStore';
import { useTicketStore } from './store/ticketStore';
import { AlertForm } from './components/AlertForm';
import { TicketViewer } from './components/TicketViewer';
import { ProviderSelector } from './components/ProviderSelector';
import { SettingsPanel } from './components/Settings';
import type { Theme } from './types/settings.types';

type Tab = 'generate' | 'settings';

function applyTheme(theme: Theme): void {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (theme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    // system — respect OS preference
    const prefersDark =
      typeof window.matchMedia !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', prefersDark);
  }
}

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const theme = useSettingsStore((state) => state.theme);
  const { ticket, clearTicket } = useTicketStore();

  // Apply theme class to <html> and update when theme setting changes
  useEffect(() => {
    applyTheme(theme);

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        document.documentElement.classList.toggle('dark', e.matches);
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  const handleGoToSettings = () => setActiveTab('settings');

  const handleNewTicket = () => {
    clearTicket();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo + wordmark */}
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 dark:bg-brand-500"
                aria-hidden="true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="white"
                  className="h-5 w-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">Ticketeer</span>
              <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                MSSP Incident Ticket Generator
              </span>
            </div>

            {/* Tab navigation */}
            <nav aria-label="App navigation" role="tablist" className="flex gap-1">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'generate'}
                onClick={() => setActiveTab('generate')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'generate'
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Generate Ticket
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'settings'}
                onClick={() => setActiveTab('settings')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────── */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {activeTab === 'generate' ? (
          <div className="space-y-6">
            {/* Provider + model selection — always visible */}
            <ProviderSelector />

            <hr className="border-slate-200 dark:border-slate-700" />

            {/* Show ticket viewer if ticket exists, otherwise show form */}
            {ticket ? (
              <TicketViewer ticket={ticket} onNewTicket={handleNewTicket} />
            ) : (
              <AlertForm onGoToSettings={handleGoToSettings} />
            )}
          </div>
        ) : (
          <SettingsPanel />
        )}
      </main>
    </div>
  );
}
