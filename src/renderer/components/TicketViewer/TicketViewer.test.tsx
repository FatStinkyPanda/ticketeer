import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TicketViewer } from './TicketViewer';
import type { TicketResult } from '../../types/ticket.types';

const mockTicket: TicketResult = {
  content:
    '============================================================\n' +
    '          MSSP INCIDENT TICKET — SECURITY ALERT\n' +
    '============================================================\n' +
    'Customer: [Customer Name Here]\n' +
    'Reported by: J. Analyst\n' +
    'Alert Name: ET EXPLOIT Apache log4j RCE Attempt\n' +
    'Status: [Analyst to Complete]',
  provider: 'anthropic',
  model: 'claude-sonnet-4-5',
  generatedAt: new Date('2026-03-04T00:52:58.000Z'),
};

const onNewTicket = vi.fn();
const onUpdateContent = vi.fn();
const onReviseSection = vi.fn();

const defaultProps = {
  ticket: mockTicket,
  onNewTicket,
  onUpdateContent,
  onReviseSection,
  isRevising: false,
};

describe('TicketViewer', () => {
  beforeEach(() => {
    onNewTicket.mockClear();
    onUpdateContent.mockClear();
    onReviseSection.mockReset();
    onReviseSection.mockResolvedValue(null);
  });

  describe('rendering', () => {
    it('renders the ticket region', () => {
      render(<TicketViewer {...defaultProps} />);
      expect(screen.getByRole('region', { name: /ticket content/i })).toBeInTheDocument();
    });

    it('displays provider and model information', () => {
      render(<TicketViewer {...defaultProps} />);
      expect(screen.getByText(/anthropic\/claude-sonnet-4-5/)).toBeInTheDocument();
    });

    it('displays generation timestamp', () => {
      render(<TicketViewer {...defaultProps} />);
      expect(screen.getByText(/Generated/)).toBeInTheDocument();
    });

    it('renders the AI revision panel', () => {
      render(<TicketViewer {...defaultProps} />);
      expect(screen.getByRole('group', { name: /AI revision panel/i }) ??
        screen.getByLabelText(/AI revision panel/i)).toBeInTheDocument();
    });

    it('renders the Edit button in read mode', () => {
      render(<TicketViewer {...defaultProps} />);
      expect(screen.getByRole('button', { name: /Edit ticket content/i })).toBeInTheDocument();
    });
  });

  describe('placeholder highlighting', () => {
    it('highlights [Customer Name Here] placeholder', () => {
      render(<TicketViewer {...defaultProps} />);
      const placeholder = screen.getByText('[Customer Name Here]');
      expect(placeholder).toHaveClass('text-amber-600');
    });

    it('highlights [Analyst to Complete] placeholder', () => {
      render(<TicketViewer {...defaultProps} />);
      const placeholder = screen.getByText('[Analyst to Complete]');
      expect(placeholder).toHaveClass('text-amber-600');
    });

    it('does not highlight non-placeholder text', () => {
      render(<TicketViewer {...defaultProps} />);
      const content = screen.getByRole('region', { name: /ticket content/i });
      expect(content.textContent).toContain('J. Analyst');
    });
  });

  describe('copy button', () => {
    it('renders Copy to Clipboard button', () => {
      render(<TicketViewer {...defaultProps} />);
      expect(screen.getByRole('button', { name: /Copy to Clipboard/i })).toBeInTheDocument();
    });
  });

  describe('download buttons', () => {
    it('renders Download .txt button', () => {
      render(<TicketViewer {...defaultProps} />);
      expect(screen.getByRole('button', { name: /Download ticket as .txt/i })).toBeInTheDocument();
    });

    it('renders Download .md button', () => {
      render(<TicketViewer {...defaultProps} />);
      expect(screen.getByRole('button', { name: /Download ticket as .md/i })).toBeInTheDocument();
    });

    it('triggers download on .txt click', () => {
      const createObjectURL = vi.fn(() => 'blob:url');
      const revokeObjectURL = vi.fn();
      const click = vi.fn();
      vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag, options) => {
        if (tag === 'a') {
          return { href: '', download: '', click, style: {} } as unknown as HTMLAnchorElement;
        }
        return originalCreateElement(tag, options as ElementCreationOptions);
      });

      render(<TicketViewer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Download ticket as .txt/i }));
      expect(click).toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it('triggers download on .md click', () => {
      const createObjectURL = vi.fn(() => 'blob:url');
      const revokeObjectURL = vi.fn();
      const click = vi.fn();
      vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag, options) => {
        if (tag === 'a') {
          return { href: '', download: '', click, style: {} } as unknown as HTMLAnchorElement;
        }
        return originalCreateElement(tag, options as ElementCreationOptions);
      });

      render(<TicketViewer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Download ticket as .md/i }));
      expect(click).toHaveBeenCalled();

      vi.restoreAllMocks();
    });
  });

  describe('New Ticket button', () => {
    it('renders New Ticket button', () => {
      render(<TicketViewer {...defaultProps} />);
      expect(screen.getByRole('button', { name: /New Ticket/i })).toBeInTheDocument();
    });

    it('calls onNewTicket when New Ticket is clicked', () => {
      render(<TicketViewer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /New Ticket/i }));
      expect(onNewTicket).toHaveBeenCalledOnce();
    });
  });

  describe('placeholder legend', () => {
    it('shows placeholder legend text in read mode', () => {
      render(<TicketViewer {...defaultProps} />);
      expect(screen.getByText(/Highlighted placeholders/)).toBeInTheDocument();
    });

    it('hides placeholder legend in edit mode', () => {
      render(<TicketViewer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Edit ticket content/i }));
      expect(screen.queryByText(/Highlighted placeholders/)).not.toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    it('shows textarea when Edit is clicked', () => {
      render(<TicketViewer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Edit ticket content/i }));
      expect(screen.getByRole('textbox', { name: /Edit ticket content/i })).toBeInTheDocument();
    });

    it('hides pre region when in edit mode', () => {
      render(<TicketViewer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Edit ticket content/i }));
      expect(screen.queryByRole('region', { name: /ticket content/i })).not.toBeInTheDocument();
    });

    it('shows Save and Cancel buttons in edit mode', () => {
      render(<TicketViewer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Edit ticket content/i }));
      expect(screen.getByRole('button', { name: /Save edits/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel editing/i })).toBeInTheDocument();
    });

    it('hides Edit button in edit mode', () => {
      render(<TicketViewer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Edit ticket content/i }));
      expect(screen.queryByRole('button', { name: /Edit ticket content/i })).not.toBeInTheDocument();
    });

    it('textarea is pre-filled with ticket content', () => {
      render(<TicketViewer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Edit ticket content/i }));
      const textarea = screen.getByRole('textbox', { name: /Edit ticket content/i }) as HTMLTextAreaElement;
      expect(textarea.value).toBe(mockTicket.content);
    });

    it('calls onUpdateContent with edited text when Save is clicked', async () => {
      render(<TicketViewer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Edit ticket content/i }));
      const textarea = screen.getByRole('textbox', { name: /Edit ticket content/i });
      await userEvent.clear(textarea);
      await userEvent.type(textarea, 'Edited ticket content');
      fireEvent.click(screen.getByRole('button', { name: /Save edits/i }));
      expect(onUpdateContent).toHaveBeenCalledWith('Edited ticket content');
    });

    it('returns to read mode after Save', () => {
      render(<TicketViewer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Edit ticket content/i }));
      fireEvent.click(screen.getByRole('button', { name: /Save edits/i }));
      expect(screen.getByRole('region', { name: /ticket content/i })).toBeInTheDocument();
    });

    it('returns to read mode after Cancel without saving', () => {
      render(<TicketViewer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Edit ticket content/i }));
      const textarea = screen.getByRole('textbox', { name: /Edit ticket content/i });
      fireEvent.change(textarea, { target: { value: 'Unsaved changes' } });
      fireEvent.click(screen.getByRole('button', { name: /Cancel editing/i }));
      expect(screen.getByRole('region', { name: /ticket content/i })).toBeInTheDocument();
      expect(onUpdateContent).not.toHaveBeenCalled();
    });
  });

  describe('AI revision panel', () => {
    it('renders the Selected section textarea', () => {
      render(<TicketViewer {...defaultProps} />);
      expect(screen.getByLabelText('Selected section')).toBeInTheDocument();
    });

    it('renders the Revision instruction input', () => {
      render(<TicketViewer {...defaultProps} />);
      expect(screen.getByLabelText('Revision instruction')).toBeInTheDocument();
    });

    it('renders the Revise with AI button', () => {
      render(<TicketViewer {...defaultProps} />);
      expect(screen.getByRole('button', { name: /Revise with AI/i })).toBeInTheDocument();
    });

    it('Revise with AI button is disabled when section is empty', () => {
      render(<TicketViewer {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Revision instruction'), { target: { value: 'Make it better' } });
      expect(screen.getByRole('button', { name: /Revise with AI/i })).toBeDisabled();
    });

    it('Revise with AI button is disabled when instruction is empty', () => {
      render(<TicketViewer {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Selected section'), { target: { value: 'some text' } });
      expect(screen.getByRole('button', { name: /Revise with AI/i })).toBeDisabled();
    });

    it('Revise with AI button is disabled when isRevising is true', () => {
      render(<TicketViewer {...defaultProps} isRevising={true} />);
      fireEvent.change(screen.getByLabelText('Selected section'), { target: { value: 'some text' } });
      fireEvent.change(screen.getByLabelText('Revision instruction'), { target: { value: 'improve' } });
      expect(screen.getByRole('button', { name: /Revise with AI/i })).toBeDisabled();
    });

    it('Revise with AI button is enabled when section and instruction are filled', () => {
      render(<TicketViewer {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Selected section'), { target: { value: 'some text' } });
      fireEvent.change(screen.getByLabelText('Revision instruction'), { target: { value: 'improve' } });
      expect(screen.getByRole('button', { name: /Revise with AI/i })).not.toBeDisabled();
    });

    it('shows spinner text when isRevising is true', () => {
      render(<TicketViewer {...defaultProps} isRevising={true} />);
      fireEvent.change(screen.getByLabelText('Selected section'), { target: { value: 'text' } });
      fireEvent.change(screen.getByLabelText('Revision instruction'), { target: { value: 'improve' } });
      expect(screen.getByText(/Revising/)).toBeInTheDocument();
    });

    it('calls onReviseSection with section and instruction when Revise is clicked', async () => {
      render(<TicketViewer {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Selected section'), { target: { value: 'Original section text' } });
      fireEvent.change(screen.getByLabelText('Revision instruction'), { target: { value: 'Be more concise' } });
      fireEvent.click(screen.getByRole('button', { name: /Revise with AI/i }));
      await waitFor(() => {
        expect(onReviseSection).toHaveBeenCalledWith('Original section text', 'Be more concise');
      });
    });

    it('shows revised text preview when onReviseSection returns a string', async () => {
      onReviseSection.mockResolvedValue('Revised content here');
      render(<TicketViewer {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Selected section'), { target: { value: 'Original' } });
      fireEvent.change(screen.getByLabelText('Revision instruction'), { target: { value: 'Improve' } });
      fireEvent.click(screen.getByRole('button', { name: /Revise with AI/i }));
      await waitFor(() => {
        expect(screen.getByLabelText('Revised text preview')).toBeInTheDocument();
        expect(screen.getByLabelText('Revised text preview').textContent).toBe('Revised content here');
      });
    });

    it('shows Apply and Discard buttons after revision', async () => {
      onReviseSection.mockResolvedValue('Revised text');
      render(<TicketViewer {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Selected section'), { target: { value: 'original' } });
      fireEvent.change(screen.getByLabelText('Revision instruction'), { target: { value: 'improve' } });
      fireEvent.click(screen.getByRole('button', { name: /Revise with AI/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Apply revision/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Discard revision/i })).toBeInTheDocument();
      });
    });

    it('hides Revise with AI button when revision result is showing', async () => {
      onReviseSection.mockResolvedValue('Revised text');
      render(<TicketViewer {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Selected section'), { target: { value: 'original' } });
      fireEvent.change(screen.getByLabelText('Revision instruction'), { target: { value: 'improve' } });
      fireEvent.click(screen.getByRole('button', { name: /Revise with AI/i }));
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Revise with AI/i })).not.toBeInTheDocument();
      });
    });

    it('clicking Apply calls onUpdateContent with replaced content', async () => {
      const ticketWithSection: TicketResult = {
        ...mockTicket,
        content: 'Header\nOriginal section text\nFooter',
      };
      onReviseSection.mockResolvedValue('Revised section text');
      render(<TicketViewer {...defaultProps} ticket={ticketWithSection} />);
      fireEvent.change(screen.getByLabelText('Selected section'), {
        target: { value: 'Original section text' },
      });
      fireEvent.change(screen.getByLabelText('Revision instruction'), { target: { value: 'improve' } });
      fireEvent.click(screen.getByRole('button', { name: /Revise with AI/i }));
      await waitFor(() => screen.getByRole('button', { name: /Apply revision/i }));
      fireEvent.click(screen.getByRole('button', { name: /Apply revision/i }));
      expect(onUpdateContent).toHaveBeenCalledWith('Header\nRevised section text\nFooter');
    });

    it('clicking Apply clears the revision panel', async () => {
      onReviseSection.mockResolvedValue('Revised text');
      render(<TicketViewer {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Selected section'), { target: { value: 'original' } });
      fireEvent.change(screen.getByLabelText('Revision instruction'), { target: { value: 'improve' } });
      fireEvent.click(screen.getByRole('button', { name: /Revise with AI/i }));
      await waitFor(() => screen.getByRole('button', { name: /Apply revision/i }));
      fireEvent.click(screen.getByRole('button', { name: /Apply revision/i }));
      expect(screen.queryByLabelText('Revised text preview')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Revise with AI/i })).toBeInTheDocument();
    });

    it('clicking Discard hides revision result and shows Revise button again', async () => {
      onReviseSection.mockResolvedValue('Revised text');
      render(<TicketViewer {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Selected section'), { target: { value: 'original' } });
      fireEvent.change(screen.getByLabelText('Revision instruction'), { target: { value: 'improve' } });
      fireEvent.click(screen.getByRole('button', { name: /Revise with AI/i }));
      await waitFor(() => screen.getByRole('button', { name: /Discard revision/i }));
      fireEvent.click(screen.getByRole('button', { name: /Discard revision/i }));
      expect(screen.queryByLabelText('Revised text preview')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Revise with AI/i })).toBeInTheDocument();
    });

    it('does not show revision result when onReviseSection returns null', async () => {
      onReviseSection.mockResolvedValue(null);
      render(<TicketViewer {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Selected section'), { target: { value: 'text' } });
      fireEvent.change(screen.getByLabelText('Revision instruction'), { target: { value: 'improve' } });
      fireEvent.click(screen.getByRole('button', { name: /Revise with AI/i }));
      await waitFor(() => {
        expect(screen.queryByLabelText('Revised text preview')).not.toBeInTheDocument();
      });
    });
  });

  describe('Use Selection button', () => {
    it('captures window.getSelection text in read mode', () => {
      vi.spyOn(window, 'getSelection').mockReturnValue({
        toString: () => 'highlighted text from pre',
      } as unknown as Selection);

      render(<TicketViewer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Use Selection/i }));
      const sectionTextarea = screen.getByLabelText('Selected section') as HTMLTextAreaElement;
      expect(sectionTextarea.value).toBe('highlighted text from pre');

      vi.restoreAllMocks();
    });

    it('uses empty string when window.getSelection returns null', () => {
      vi.spyOn(window, 'getSelection').mockReturnValue(null);

      render(<TicketViewer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Use Selection/i }));
      const sectionTextarea = screen.getByLabelText('Selected section') as HTMLTextAreaElement;
      expect(sectionTextarea.value).toBe('');

      vi.restoreAllMocks();
    });

    it('captures textarea selection in edit mode', () => {
      render(<TicketViewer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Edit ticket content/i }));
      const editTextarea = screen.getByRole('textbox', {
        name: /Edit ticket content/i,
      }) as HTMLTextAreaElement;

      // Simulate a selection in the edit textarea
      editTextarea.selectionStart = 0;
      editTextarea.selectionEnd = 12;

      fireEvent.click(screen.getByRole('button', { name: /Use Selection/i }));
      const sectionTextarea = screen.getByLabelText('Selected section') as HTMLTextAreaElement;
      expect(sectionTextarea.value).toBe(mockTicket.content.slice(0, 12));
    });
  });
});
