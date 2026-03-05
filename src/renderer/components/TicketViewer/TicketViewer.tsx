import { useState, useRef } from 'react';
import { CopyButton } from '../shared/CopyButton';
import type { TicketResult } from '../../types/ticket.types';

interface TicketViewerProps {
  ticket: TicketResult;
  onNewTicket: () => void;
  onUpdateContent: (content: string) => void;
  onReviseSection: (selectedText: string, instruction: string) => Promise<string | null>;
  isRevising: boolean;
}

/**
 * Renders a generated ticket with:
 * - Monospaced preformatted text with unfilled placeholder highlighting
 * - Edit mode: inline textarea for direct content editing
 * - AI revision panel: select a section, enter an instruction, get AI-revised text
 * - Provider/model label, generation timestamp
 * - Copy to clipboard, download .txt, and download .md buttons
 */
export function TicketViewer({
  ticket,
  onNewTicket,
  onUpdateContent,
  onReviseSection,
  isRevising,
}: TicketViewerProps) {
  const formattedTime = ticket.generatedAt.toLocaleString();

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editContent, setEditContent] = useState(ticket.content);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // AI revision panel state
  const [selectedSection, setSelectedSection] = useState('');
  const [instruction, setInstruction] = useState('');
  const [revisionResult, setRevisionResult] = useState<string | null>(null);

  const handleEdit = () => {
    setEditContent(ticket.content);
    setIsEditMode(true);
  };

  const handleSaveEdit = () => {
    onUpdateContent(editContent);
    setIsEditMode(false);
  };

  const handleCancelEdit = () => {
    setEditContent(ticket.content);
    setIsEditMode(false);
  };

  const handleUseSelection = () => {
    if (isEditMode && editTextareaRef.current) {
      const { selectionStart, selectionEnd, value } = editTextareaRef.current;
      setSelectedSection(value.slice(selectionStart, selectionEnd));
      return;
    }
    const sel = window.getSelection()?.toString() ?? '';
    setSelectedSection(sel);
  };

  const handleRevise = async () => {
    setRevisionResult(null);
    const result = await onReviseSection(selectedSection, instruction);
    if (result !== null) {
      setRevisionResult(result);
    }
  };

  const handleApplyRevision = () => {
    /* v8 ignore next */
    if (revisionResult === null) return;
    const newContent = ticket.content.replace(selectedSection, revisionResult);
    onUpdateContent(newContent);
    setRevisionResult(null);
    setSelectedSection('');
    setInstruction('');
  };

  const handleDiscardRevision = () => {
    setRevisionResult(null);
  };

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
      {/* Header with metadata and action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300">Generated</span>
          {' '}with{' '}
          <span className="font-medium text-brand-600 dark:text-brand-400">
            {ticket.provider}/{ticket.model}
          </span>
          {' '}at {formattedTime}
        </div>

        <div className="flex gap-2">
          {!isEditMode && (
            <button
              type="button"
              onClick={handleEdit}
              aria-label="Edit ticket content"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Edit
            </button>
          )}
          {isEditMode && (
            <>
              <button
                type="button"
                onClick={handleSaveEdit}
                aria-label="Save edits"
                className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                aria-label="Cancel editing"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onNewTicket}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            New Ticket
          </button>
        </div>
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

      {/* Ticket content — read mode or edit mode */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
        {isEditMode ? (
          <textarea
            ref={editTextareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            aria-label="Edit ticket content"
            rows={20}
            className="w-full p-4 text-xs leading-relaxed font-mono text-slate-800 dark:text-slate-200 bg-transparent resize-none outline-none min-h-64"
          />
        ) : (
          <pre
            role="region"
            aria-label="Ticket content"
            className="overflow-x-auto p-4 text-xs leading-relaxed font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words"
          >
            {renderHighlightedContent()}
          </pre>
        )}
      </div>

      {/* Placeholder legend (read mode only) */}
      {!isEditMode && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-amber-600 dark:text-amber-400">[Highlighted placeholders]</span>
          {' '}require manual completion by the analyst before the ticket is submitted.
        </p>
      )}

      {/* AI Revision Panel */}
      <div
        role="group"
        className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-4"
        aria-label="AI revision panel"
      >
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Revise a Section with AI
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Select text in the ticket above, click &ldquo;Use Selection&rdquo;, add an instruction, then click
          &ldquo;Revise with AI&rdquo;. All text is scanned for PII before being sent.
        </p>

        {/* Selected section */}
        <div className="flex flex-col gap-1 mb-3">
          <div className="flex items-center justify-between">
            <label htmlFor="revision-section" className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Selected section
            </label>
            <button
              type="button"
              onClick={handleUseSelection}
              className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium"
            >
              Use Selection
            </button>
          </div>
          <textarea
            id="revision-section"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            placeholder="Select text in the ticket above and click 'Use Selection', or paste text here."
            rows={4}
            className="w-full rounded-md border border-slate-200 bg-slate-50 p-2 text-xs font-mono text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 resize-none outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Revision instruction */}
        <div className="flex flex-col gap-1 mb-3">
          <label htmlFor="revision-instruction" className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Revision instruction
          </label>
          <input
            id="revision-instruction"
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g. Make this section more concise and professional."
            className="w-full rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Revise button (shown when no revision result pending) */}
        {revisionResult === null && (
          <button
            type="button"
            onClick={handleRevise}
            disabled={!selectedSection.trim() || !instruction.trim() || isRevising}
            aria-label="Revise with AI"
            aria-busy={isRevising}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-brand-500 dark:hover:bg-brand-600"
          >
            {isRevising ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Revising…
              </>
            ) : (
              'Revise with AI'
            )}
          </button>
        )}

        {/* Revision result (shown after AI responds) */}
        {revisionResult !== null && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Revised text preview:</p>
            <pre
              aria-label="Revised text preview"
              className="rounded-md bg-slate-50 dark:bg-slate-900 p-3 text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words border border-slate-200 dark:border-slate-700"
            >
              {revisionResult}
            </pre>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleApplyRevision}
                aria-label="Apply revision"
                className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={handleDiscardRevision}
                aria-label="Discard revision"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
