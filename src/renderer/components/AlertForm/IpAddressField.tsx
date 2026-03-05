import { useState } from 'react';
import { validateIpAddress } from '../../constants/rfc1918';

interface IpAddressFieldProps {
  id: string;
  label: string;
  value: string;
  isPublic: boolean;
  onChange: (value: string) => void;
  onPublicToggle: (isPublic: boolean) => void;
  disabled?: boolean;
}

export function IpAddressField({
  id,
  label,
  value,
  isPublic,
  onChange,
  onPublicToggle,
  disabled = false,
}: IpAddressFieldProps) {
  const [touched, setTouched] = useState(false);

  const validationResult = value.trim() ? validateIpAddress(value.trim()) : null;

  let errorMessage: string | null = null;
  if (touched && value.trim()) {
    if (!validationResult?.valid) {
      /* v8 ignore next */
      errorMessage = validationResult ? validationResult.error : null;
    } else if (validationResult.isPublic && !isPublic) {
      errorMessage =
        'Public IP addresses cannot be submitted without marking this field as public. Toggle "Public IP" to acknowledge.';
    }
  }

  const isValid =
    !value.trim() ||
    (validationResult?.valid === true && (!validationResult.isPublic || isPublic));

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>

      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <input
            id={id}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setTouched(true)}
            disabled={disabled}
            placeholder="e.g., 192.168.1.1"
            aria-describedby={errorMessage ? `${id}-error` : undefined}
            aria-invalid={touched && !isValid ? true : undefined}
            className={`w-full rounded-md border px-3 py-2 font-mono text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 ${
              touched && !isValid
                ? 'border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-950'
                : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
            }`}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap pt-2">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => onPublicToggle(e.target.checked)}
            disabled={disabled}
            aria-label="Public IP acknowledgment toggle"
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed"
          />
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Public IP
            <span className="text-slate-400 dark:text-slate-500"> (I acknowledge this)</span>
          </span>
        </label>
      </div>

      {errorMessage && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs text-red-600 dark:text-red-400"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
