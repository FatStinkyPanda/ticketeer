import { useAlertStore } from '../../store/alertStore';
import { useTicketGeneration } from '../../hooks/useTicketGeneration';
import { IpAddressField } from './IpAddressField';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ErrorBanner } from '../shared/ErrorBanner';
import { validateAlertData } from '../../services/piiGuard';
import type { PiiFieldError } from '../../types/alert.types';

const PROTOCOLS = ['TCP', 'UDP', 'ICMP', 'SCTP', 'GRE', 'ESP', 'AH', 'OSPF'];

interface AlertFormProps {
  onGoToSettings?: () => void;
}

export function AlertForm({ onGoToSettings }: AlertFormProps) {
  const { formData, setField, resetForm } = useAlertStore();
  const { generateTicket, isLoading, error, setError } = useTicketGeneration();

  // Run PII guard for real-time field-level error display
  const piiResult = validateAlertData(formData);
  const fieldErrors: Map<string, PiiFieldError[]> = new Map();
  if (!piiResult.valid) {
    for (const err of piiResult.errors) {
      const existing = fieldErrors.get(err.field) ?? [];
      fieldErrors.set(err.field, [...existing, err]);
    }
  }

  const canSubmit = formData.alert_signature.trim().length > 0 && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    await generateTicket(formData);
  };

  const handleReset = () => {
    resetForm();
    setError(null);
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      aria-label="Alert input form"
      className="space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Timestamp */}
        <div className="sm:col-span-2">
          <label
            htmlFor="timestamp"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Time
          </label>
          <input
            id="timestamp"
            type="text"
            value={formData.timestamp}
            onChange={(e) => setField('timestamp', e.target.value)}
            disabled={isLoading}
            placeholder="e.g., Mar 4, 2026 @ 00:52:58.969"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Alert Category */}
        <div className="sm:col-span-2">
          <label
            htmlFor="alert_category"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Alert Category
          </label>
          <input
            id="alert_category"
            type="text"
            value={formData.alert_category}
            onChange={(e) => setField('alert_category', e.target.value)}
            disabled={isLoading}
            placeholder="e.g., Attempted Administrator Privilege Gain"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Alert Signature — Required */}
        <div className="sm:col-span-2">
          <label
            htmlFor="alert_signature"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Alert Signature
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </label>
          <input
            id="alert_signature"
            type="text"
            value={formData.alert_signature}
            onChange={(e) => setField('alert_signature', e.target.value)}
            disabled={isLoading}
            required
            placeholder="e.g., ET EXPLOIT Apache log4j RCE Attempt (CVE-2021-44228)"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Source IP */}
        <div>
          <IpAddressField
            id="src_ip"
            label="Source IP"
            value={formData.src_ip}
            isPublic={formData.src_ip_is_public}
            onChange={(v) => setField('src_ip', v)}
            onPublicToggle={(v) => setField('src_ip_is_public', v)}
            disabled={isLoading}
          />
        </div>

        {/* Source Port */}
        <div>
          <label
            htmlFor="src_port"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Source Port
          </label>
          <input
            id="src_port"
            type="number"
            min={1}
            max={65535}
            value={formData.src_port}
            onChange={(e) => setField('src_port', e.target.value)}
            disabled={isLoading}
            placeholder="e.g., 54321"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Destination IP */}
        <div>
          <IpAddressField
            id="dest_ip"
            label="Destination IP"
            value={formData.dest_ip}
            isPublic={formData.dest_ip_is_public}
            onChange={(v) => setField('dest_ip', v)}
            onPublicToggle={(v) => setField('dest_ip_is_public', v)}
            disabled={isLoading}
          />
        </div>

        {/* Destination Port */}
        <div>
          <label
            htmlFor="dest_port"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Destination Port
          </label>
          <input
            id="dest_port"
            type="number"
            min={1}
            max={65535}
            value={formData.dest_port}
            onChange={(e) => setField('dest_port', e.target.value)}
            disabled={isLoading}
            placeholder="e.g., 443"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Protocol */}
        <div>
          <label
            htmlFor="proto"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Protocol
          </label>
          <select
            id="proto"
            value={formData.proto}
            onChange={(e) => setField('proto', e.target.value)}
            disabled={isLoading}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">Select protocol...</option>
            {PROTOCOLS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* App Protocol */}
        <div>
          <label
            htmlFor="app_proto"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Application Protocol
          </label>
          <input
            id="app_proto"
            type="text"
            value={formData.app_proto}
            onChange={(e) => setField('app_proto', e.target.value)}
            disabled={isLoading}
            placeholder="e.g., http, https, dns, tls"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Reported By */}
        <div className="sm:col-span-2">
          <label
            htmlFor="reported_by"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Reported by
            <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
              (analyst name — never AI-generated)
            </span>
          </label>
          <input
            id="reported_by"
            type="text"
            value={formData.reported_by}
            onChange={(e) => setField('reported_by', e.target.value)}
            disabled={isLoading}
            placeholder="Your name"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {/* PII field-level warnings (non-blocking) */}
      {!piiResult.valid && piiResult.errors.some((e) => e.severity === 'warn') && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Review before submitting:
          </p>
          <ul className="mt-1 list-disc pl-5 text-xs text-amber-700 dark:text-amber-400">
            {piiResult.errors
              .filter((e) => e.severity === 'warn')
              .map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
          </ul>
        </div>
      )}

      {/* API error display */}
      {error && (
        <ErrorBanner
          error={error}
          onDismiss={() => setError(null)}
          onGoToSettings={onGoToSettings}
        />
      )}

      {/* Loading state */}
      {isLoading && <LoadingSpinner />}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
          aria-disabled={!canSubmit}
          className="flex-1 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-brand-500 dark:hover:bg-brand-400"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Generating, please wait…
            </span>
          ) : (
            'Generate Ticket'
          )}
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={isLoading}
          className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Clear Form
        </button>
      </div>
    </form>
  );
}
