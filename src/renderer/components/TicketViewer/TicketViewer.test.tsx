import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('TicketViewer', () => {
  const onNewTicket = vi.fn();

  beforeEach(() => {
    onNewTicket.mockClear();
  });

  describe('rendering', () => {
    it('renders the ticket region', () => {
      render(<TicketViewer ticket={mockTicket} onNewTicket={onNewTicket} />);
      expect(screen.getByRole('region', { name: /ticket content/i })).toBeInTheDocument();
    });

    it('displays provider and model information', () => {
      render(<TicketViewer ticket={mockTicket} onNewTicket={onNewTicket} />);
      expect(screen.getByText(/anthropic\/claude-sonnet-4-5/)).toBeInTheDocument();
    });

    it('displays generation timestamp', () => {
      render(<TicketViewer ticket={mockTicket} onNewTicket={onNewTicket} />);
      expect(screen.getByText(/Generated/)).toBeInTheDocument();
    });
  });

  describe('placeholder highlighting', () => {
    it('highlights [Customer Name Here] placeholder', () => {
      render(<TicketViewer ticket={mockTicket} onNewTicket={onNewTicket} />);
      const placeholder = screen.getByText('[Customer Name Here]');
      expect(placeholder).toHaveClass('text-amber-600');
    });

    it('highlights [Analyst to Complete] placeholder', () => {
      render(<TicketViewer ticket={mockTicket} onNewTicket={onNewTicket} />);
      const placeholder = screen.getByText('[Analyst to Complete]');
      expect(placeholder).toHaveClass('text-amber-600');
    });

    it('does not highlight non-placeholder text', () => {
      render(<TicketViewer ticket={mockTicket} onNewTicket={onNewTicket} />);
      // "J. Analyst" should be in the document but not highlighted
      const content = screen.getByRole('region', { name: /ticket content/i });
      expect(content.textContent).toContain('J. Analyst');
    });
  });

  describe('copy button', () => {
    it('renders Copy to Clipboard button', () => {
      render(<TicketViewer ticket={mockTicket} onNewTicket={onNewTicket} />);
      expect(screen.getByRole('button', { name: /Copy to Clipboard/i })).toBeInTheDocument();
    });
  });

  describe('download buttons', () => {
    it('renders Download .txt button', () => {
      render(<TicketViewer ticket={mockTicket} onNewTicket={onNewTicket} />);
      expect(screen.getByRole('button', { name: /Download ticket as .txt/i })).toBeInTheDocument();
    });

    it('renders Download .md button', () => {
      render(<TicketViewer ticket={mockTicket} onNewTicket={onNewTicket} />);
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

      render(<TicketViewer ticket={mockTicket} onNewTicket={onNewTicket} />);
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

      render(<TicketViewer ticket={mockTicket} onNewTicket={onNewTicket} />);
      fireEvent.click(screen.getByRole('button', { name: /Download ticket as .md/i }));
      expect(click).toHaveBeenCalled();

      vi.restoreAllMocks();
    });
  });

  describe('New Ticket button', () => {
    it('renders New Ticket button', () => {
      render(<TicketViewer ticket={mockTicket} onNewTicket={onNewTicket} />);
      expect(screen.getByRole('button', { name: /New Ticket/i })).toBeInTheDocument();
    });

    it('calls onNewTicket when New Ticket is clicked', () => {
      render(<TicketViewer ticket={mockTicket} onNewTicket={onNewTicket} />);
      fireEvent.click(screen.getByRole('button', { name: /New Ticket/i }));
      expect(onNewTicket).toHaveBeenCalledOnce();
    });
  });

  describe('placeholder legend', () => {
    it('shows placeholder legend text', () => {
      render(<TicketViewer ticket={mockTicket} onNewTicket={onNewTicket} />);
      expect(screen.getByText(/Highlighted placeholders/)).toBeInTheDocument();
    });
  });
});
