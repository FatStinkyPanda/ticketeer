import type { TicketGenerationError } from '../../types/ticket.types';

interface ErrorBannerProps {
  error: TicketGenerationError;
  onDismiss?: () => void;
  onRetry?: () => void;
  onGoToSettings?: () => void;
}

const ERROR_LABELS: Record<TicketGenerationError['code'], string> = {
  AUTH_ERROR: 'Authentication Error',
  RATE_LIMIT: 'Rate Limit Reached',
  CONTEXT_LENGTH: 'Context Length Exceeded',
  NETWORK_ERROR: 'Network Error',
  API_ERROR: 'API Error',
  PII_VIOLATION: 'PII Validation Failed',
};

export function ErrorBanner({ error, onDismiss, onRetry, onGoToSettings }: ErrorBannerProps) {
  /* v8 ignore next */
  const label = ERROR_LABELS[error.code] ?? 'Error';

  return (
    <div
      role="alert"
      aria-label={label}
      className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 text-red-500 dark:text-red-400" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">{label}</p>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error.message}</p>

          {error.details && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-red-600 dark:text-red-500 hover:underline">
                Technical details
              </summary>
              <p className="mt-1 font-mono text-xs text-red-600 dark:text-red-500 break-all">
                {error.details}
              </p>
            </details>
          )}

          {(onRetry ?? onGoToSettings) && (
            <div className="mt-3 flex gap-3">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="text-xs font-medium text-red-700 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 underline"
                >
                  Retry
                </button>
              )}
              {onGoToSettings && error.code === 'AUTH_ERROR' && (
                <button
                  type="button"
                  onClick={onGoToSettings}
                  className="text-xs font-medium text-red-700 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 underline"
                >
                  Go to Settings
                </button>
              )}
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss error"
            className="shrink-0 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
