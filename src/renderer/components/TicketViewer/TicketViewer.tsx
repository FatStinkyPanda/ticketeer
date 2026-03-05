import { CopyButton } from '../shared/CopyButton';
import type { TicketResult } from '../../types/ticket.types';

interface TicketViewerProps {
  ticket: TicketResult;
  onNewTicket: () => void;
}

/**
 * Renders a generated ticket with:
 * - Monospaced preformatted text
 * - Unfilled placeholder highlighting (amber/orange)
 * - Provider/model label and generation timestamp
 * - Copy to clipboard, download .txt, and download .md buttons
 */
export function TicketViewer({ ticket, onNewTicket }: TicketViewerProps) {
  const formattedTime = ticket.generatedAt.toLocaleString();

  const downloadTicket = (extension: 'txt' | 'md') => {
    const timestamp = ticket.generatedAt.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `ticket_${timestamp}.${extension}`;
    const blob = new Blob([ticket.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Parse content to highlight placeholders
  const renderHighlightedContent = () => {
    // Split on placeholder pattern [Text Here]
    const parts = ticket.content.split(/(\[[^\]]+\])/g);
    return parts.map((part, i) => {
      if (/^\[.+\]$/.test(part)) {
        return (
          <span
            key={i}
            className="text-amber-600 dark:text-amber-400 font-semibold"
            title="This placeholder requires manual completion"
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col gap-4" aria-label="Generated ticket">
      {/* Header with metadata */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300">Generated</span>
          {' '}with{' '}
          <span className="font-medium text-brand-600 dark:text-brand-400">
            {ticket.provider}/{ticket.model}
          </span>
          {' '}at {formattedTime}
        </div>

        <button
          type="button"
          onClick={onNewTicket}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          New Ticket
        </button>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <CopyButton text={ticket.content} label="Copy to Clipboard" />

        <button
          type="button"
          onClick={() => downloadTicket('txt')}
          aria-label="Download ticket as .txt file"
          className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
          </svg>
          Download .txt
        </button>

        <button
          type="button"
          onClick={() => downloadTicket('md')}
          aria-label="Download ticket as .md file"
          className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
          </svg>
          Download .md
        </button>
      </div>

      {/* Ticket content */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
        <pre
          role="region"
          aria-label="Ticket content"
          className="overflow-x-auto p-4 text-xs leading-relaxed font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words"
        >
          {renderHighlightedContent()}
        </pre>
      </div>

      {/* Placeholder legend */}
      <p className="text-xs text-slate-500 dark:text-slate-400">
        <span className="font-semibold text-amber-600 dark:text-amber-400">[Highlighted placeholders]</span>
        {' '}require manual completion by the analyst before the ticket is submitted.
      </p>
    </div>
  );
}
