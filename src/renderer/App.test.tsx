import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { App } from './App';
import { useSettingsStore } from './store/settingsStore';
import { useTicketStore } from './store/ticketStore';
import { useAlertStore } from './store/alertStore';

const mockTicket = {
  content: 'TICKET CONTENT\n[Analyst to Complete]',
  provider: 'anthropic' as const,
  model: 'claude-sonnet-4-5',
  generatedAt: new Date('2026-03-04T00:52:58.000Z'),
};

function resetStores() {
  useSettingsStore.setState({
    anthropicApiKey: null,
    geminiApiKey: null,
    openrouterApiKey: null,
    lastProvider: 'anthropic',
    lastModel: 'claude-sonnet-4-5',
    theme: 'system',
    maxOutputTokens: 4096,
  });
  useTicketStore.setState({ ticket: null, isLoading: false, error: null });
  useAlertStore.setState({
    formData: {
      timestamp: '',
      alert_category: '',
      alert_signature: '',
      src_ip: '',
      src_ip_is_public: false,
      src_port: '',
      dest_ip: '',
      dest_ip_is_public: false,
      dest_port: '',
      proto: '',
      app_proto: '',
      reported_by: '',
    },
  });
}

describe('App', () => {
  beforeEach(() => {
    resetStores();
    vi.restoreAllMocks();
    // Ensure html element starts without dark class
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  describe('header and navigation', () => {
    it('renders the app wordmark', () => {
      render(<App />);
      expect(screen.getByText('Ticketeer')).toBeInTheDocument();
    });

    it('renders Generate Ticket and Settings tabs', () => {
      render(<App />);
      expect(screen.getByRole('tab', { name: /Generate Ticket/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Settings/i })).toBeInTheDocument();
    });

    it('Generate Ticket tab is selected by default', () => {
      render(<App />);
      expect(screen.getByRole('tab', { name: /Generate Ticket/i })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });

    it('Settings tab is not selected by default', () => {
      render(<App />);
      expect(screen.getByRole('tab', { name: /Settings/i })).toHaveAttribute(
        'aria-selected',
        'false',
      );
    });
  });

  describe('Generate Ticket tab', () => {
    it('shows the alert form by default', () => {
      render(<App />);
      expect(screen.getByRole('form', { name: /alert input form/i })).toBeInTheDocument();
    });

    it('shows provider selector on Generate Ticket tab', () => {
      render(<App />);
      expect(screen.getByLabelText(/Select AI provider/i)).toBeInTheDocument();
    });

    it('shows TicketViewer when a ticket exists', () => {
      useTicketStore.setState({ ticket: mockTicket });
      render(<App />);
      expect(screen.getByRole('region', { name: /ticket content/i })).toBeInTheDocument();
    });

    it('does not show alert form when ticket exists', () => {
      useTicketStore.setState({ ticket: mockTicket });
      render(<App />);
      expect(screen.queryByRole('form', { name: /alert input form/i })).not.toBeInTheDocument();
    });

    it('clicking New Ticket clears ticket and shows form', () => {
      useTicketStore.setState({ ticket: mockTicket });
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /New Ticket/i }));
      expect(screen.getByRole('form', { name: /alert input form/i })).toBeInTheDocument();
      expect(useTicketStore.getState().ticket).toBeNull();
    });
  });

  describe('Settings tab navigation', () => {
    it('shows Settings panel after clicking Settings tab', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('tab', { name: /Settings/i }));
      expect(screen.getByRole('region', { name: /Settings panel/i })).toBeInTheDocument();
    });

    it('Settings tab is selected after click', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('tab', { name: /Settings/i }));
      expect(screen.getByRole('tab', { name: /Settings/i })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });

    it('Generate Ticket tab is deselected after switching to Settings', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('tab', { name: /Settings/i }));
      expect(screen.getByRole('tab', { name: /Generate Ticket/i })).toHaveAttribute(
        'aria-selected',
        'false',
      );
    });

    it('switching back to Generate Ticket shows alert form', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('tab', { name: /Settings/i }));
      fireEvent.click(screen.getByRole('tab', { name: /Generate Ticket/i }));
      expect(screen.getByRole('form', { name: /alert input form/i })).toBeInTheDocument();
    });

    it('onGoToSettings from AlertForm switches to Settings tab', () => {
      render(<App />);
      // Simulate an AUTH_ERROR that triggers the Go to Settings action
      useTicketStore.setState({
        error: { code: 'AUTH_ERROR', message: 'No API key — check Settings.' },
      });
      // Re-render with the error
      const { unmount } = render(<App />);
      fireEvent.click(screen.getAllByRole('button', { name: /Go to Settings/i })[0]);
      expect(screen.getAllByRole('region', { name: /Settings panel/i })[0]).toBeInTheDocument();
      unmount();
    });
  });

  describe('theme', () => {
    it('adds dark class to html when theme is dark', () => {
      useSettingsStore.setState({ theme: 'dark' });
      render(<App />);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('removes dark class from html when theme is light', () => {
      document.documentElement.classList.add('dark');
      useSettingsStore.setState({ theme: 'light' });
      render(<App />);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('uses matchMedia for system theme', () => {
      useSettingsStore.setState({ theme: 'system' });
      render(<App />);
      // matchMedia is mocked to return matches: false, so no dark class
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('theme system handler toggles dark class when media query fires', () => {
      let capturedHandler: ((e: MediaQueryListEvent) => void) | null = null;
      const mockMq = {
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_event: string, handler: (e: MediaQueryListEvent) => void) => {
          capturedHandler = handler;
        },
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: () => mockMq,
      });

      useSettingsStore.setState({ theme: 'system' });
      render(<App />);

      expect(capturedHandler).not.toBeNull();
      // Trigger the handler — covers the handler body (line 38)
      capturedHandler!({ matches: true } as MediaQueryListEvent);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('theme system cleanup removes listener when theme changes from system', () => {
      const removeEventListener = vi.fn();
      const mockMq = {
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener,
        dispatchEvent: () => false,
      };
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: () => mockMq,
      });

      useSettingsStore.setState({ theme: 'system' });
      render(<App />);

      // Change theme — triggers useEffect cleanup (the return fn, line 41)
      act(() => {
        useSettingsStore.setState({ theme: 'dark' });
      });

      expect(removeEventListener).toHaveBeenCalled();
    });
  });
});
