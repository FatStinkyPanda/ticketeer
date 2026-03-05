interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Generating ticket...' }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-4 py-12"
    >
      <div
        className="h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{message}</p>
    </div>
  );
}
