import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CopyButton } from './CopyButton';

describe('CopyButton', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders with default label', () => {
      render(<CopyButton text="test content" />);
      expect(screen.getByRole('button', { name: /Copy/i })).toBeInTheDocument();
    });

    it('renders with custom label', () => {
      render(<CopyButton text="test" label="Copy to Clipboard" />);
      expect(screen.getByRole('button', { name: /Copy to Clipboard/i })).toBeInTheDocument();
    });
  });

  describe('copy behavior', () => {
    it('calls clipboard writeText with the provided text', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { clipboard: { writeText } });

      render(<CopyButton text="ticket content to copy" />);
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith('ticket content to copy');
      });
    });

    it('shows "Copied!" after clicking', async () => {
      vi.stubGlobal('navigator', {
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      });

      render(<CopyButton text="content" />);
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('button')).toHaveAccessibleName('Copied!');
      });
    });

    it('reverts back to original label after 2 seconds', async () => {
      vi.useFakeTimers();
      vi.stubGlobal('navigator', {
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      });

      render(<CopyButton text="content" label="Copy" />);
      fireEvent.click(screen.getByRole('button'));

      // Flush microtasks (clipboard promise resolution) and let React update
      await act(async () => {});

      expect(screen.getByRole('button')).toHaveAccessibleName('Copied!');

      // Advance fake timers inside act so React processes the state update
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByRole('button')).toHaveAccessibleName('Copy');

      vi.useRealTimers();
    });

    it('falls back to execCommand when clipboard API throws', async () => {
      vi.stubGlobal('navigator', {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('clipboard not available')),
        },
      });

      // Render FIRST so React's internal DOM setup (appendChild for root) is unimpeded
      render(<CopyButton text="ticket content" />);

      // Set up DOM interception mocks AFTER render, BEFORE the click
      const select = vi.fn();
      const mockTextArea = {
        value: '',
        style: { position: '', opacity: '' },
        select,
      };
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag, options) => {
        if (tag === 'textarea') return mockTextArea as unknown as HTMLTextAreaElement;
        return originalCreateElement(tag, options as ElementCreationOptions);
      });
      vi.spyOn(document.body, 'appendChild').mockReturnValue(mockTextArea as unknown as Node);
      vi.spyOn(document.body, 'removeChild').mockReturnValue(mockTextArea as unknown as Node);
      // jsdom does not implement execCommand — define it so we can spy on it
      const execCommandSpy = vi.fn().mockReturnValue(true);
      Object.defineProperty(document, 'execCommand', {
        value: execCommandSpy,
        writable: true,
        configurable: true,
      });

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(execCommandSpy).toHaveBeenCalledWith('copy');
      });
    });
  });
});
