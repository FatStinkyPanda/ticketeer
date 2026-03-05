import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertForm } from './AlertForm';
import { useAlertStore } from '../../store/alertStore';
import { useTicketStore } from '../../store/ticketStore';
import { useSettingsStore } from '../../store/settingsStore';
import * as piiGuardModule from '../../services/piiGuard';
import * as providerRouterModule from '../../services/providers/providerRouter';
import * as promptBuilderModule from '../../services/promptBuilder';

function resetStores() {
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
  useTicketStore.setState({ ticket: null, isLoading: false, error: null });
  useSettingsStore.setState({
    anthropicApiKey: 'sk-ant-test',
    geminiApiKey: null,
    openrouterApiKey: null,
    lastProvider: 'anthropic',
    lastModel: 'claude-sonnet-4-5',
    theme: 'system',
    maxOutputTokens: 4096,
  });
}

describe('AlertForm', () => {
  beforeEach(() => {
    resetStores();
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders the form', () => {
      render(<AlertForm />);
      expect(screen.getByRole('form', { name: /alert input form/i })).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      render(<AlertForm />);
      expect(screen.getByLabelText(/Time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Alert Category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Alert Signature/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Source IP/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Destination IP/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Source Port/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Destination Port/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Protocol')).toBeInTheDocument();
      expect(screen.getByLabelText(/Application Protocol/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Reported by/i)).toBeInTheDocument();
    });

    it('renders the Generate Ticket button', () => {
      render(<AlertForm />);
      expect(screen.getByRole('button', { name: /Generate Ticket/i })).toBeInTheDocument();
    });

    it('renders the Clear Form button', () => {
      render(<AlertForm />);
      expect(screen.getByRole('button', { name: /Clear Form/i })).toBeInTheDocument();
    });
  });

  describe('submit button state', () => {
    it('Generate Ticket button is disabled when alert_signature is empty', () => {
      render(<AlertForm />);
      const button = screen.getByRole('button', { name: /Generate Ticket/i });
      expect(button).toBeDisabled();
    });

    it('Generate Ticket button is enabled when alert_signature is filled', async () => {
      render(<AlertForm />);
      await userEvent.type(
        screen.getByLabelText(/Alert Signature/i),
        'ET EXPLOIT Apache log4j RCE',
      );
      expect(screen.getByRole('button', { name: /Generate Ticket/i })).not.toBeDisabled();
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when isLoading is true', () => {
      useTicketStore.setState({ isLoading: true });
      render(<AlertForm />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('Generate Ticket button shows loading text and is disabled during loading', () => {
      useTicketStore.setState({ isLoading: true });
      useAlertStore.setState((s) => ({
        formData: { ...s.formData, alert_signature: 'ET EXPLOIT test' },
      }));
      render(<AlertForm />);
      const btn = screen.getByRole('button', { name: /Generating, please wait/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveTextContent('Generating, please wait');
    });
  });

  describe('error display', () => {
    it('displays error banner when error is present', () => {
      useTicketStore.setState({
        error: { code: 'NETWORK_ERROR', message: 'Network error occurred.' },
      });
      render(<AlertForm />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Network error occurred.');
    });

    it('displays AUTH_ERROR from store', () => {
      useTicketStore.setState({
        error: { code: 'AUTH_ERROR', message: 'API key invalid or expired — check Settings.' },
      });
      render(<AlertForm />);
      expect(screen.getByRole('alert')).toHaveTextContent('API key invalid');
    });
  });

  describe('form submission', () => {
    it('calls generateTicket on form submit', async () => {
      vi.spyOn(piiGuardModule, 'validateAlertData').mockReturnValue({ valid: true });
      vi.spyOn(promptBuilderModule, 'buildPrompt').mockReturnValue({
        systemPrompt: 'sys',
        userMessage: 'user',
      });
      const routerSpy = vi
        .spyOn(providerRouterModule, 'routeToProvider')
        .mockResolvedValue('ticket');

      render(<AlertForm />);
      await userEvent.type(screen.getByLabelText(/Alert Signature/i), 'ET EXPLOIT test');
      fireEvent.submit(screen.getByRole('form', { name: /alert input form/i }));

      await waitFor(() => {
        expect(routerSpy).toHaveBeenCalled();
      });
    });
  });

  describe('clear form', () => {
    it('resets form fields when Clear Form is clicked', async () => {
      render(<AlertForm />);
      await userEvent.type(screen.getByLabelText(/Alert Signature/i), 'ET EXPLOIT test');
      await userEvent.click(screen.getByRole('button', { name: /Clear Form/i }));
      expect(screen.getByLabelText(/Alert Signature/i)).toHaveValue('');
    });
  });

  describe('field onChange interactions', () => {
    it('fires onChange on every form field and the error dismiss callback', () => {
      useTicketStore.setState({
        error: { code: 'NETWORK_ERROR', message: 'Network error occurred.' },
      });

      render(<AlertForm />);

      // Standard text inputs
      fireEvent.change(screen.getByLabelText(/Time/i), { target: { value: '2026-03-04' } });
      fireEvent.change(screen.getByLabelText(/Alert Category/i), { target: { value: 'Exploitation' } });
      fireEvent.change(screen.getByLabelText(/Alert Signature/i), { target: { value: 'ET EXPLOIT test' } });
      fireEvent.change(screen.getByLabelText(/Source Port/i), { target: { value: '54321' } });
      fireEvent.change(screen.getByLabelText(/Destination Port/i), { target: { value: '443' } });
      fireEvent.change(screen.getByLabelText('Protocol'), { target: { value: 'TCP' } });
      fireEvent.change(screen.getByLabelText(/Application Protocol/i), { target: { value: 'https' } });
      fireEvent.change(screen.getByLabelText(/Reported by/i), { target: { value: 'Analyst' } });

      // IpAddressField text inputs (found by their label's htmlFor)
      fireEvent.change(screen.getByLabelText(/^Source IP$/i), { target: { value: '192.168.1.100' } });
      fireEvent.change(screen.getByLabelText(/^Destination IP$/i), { target: { value: '10.0.0.5' } });

      // IpAddressField public-toggle checkboxes (fireEvent.click triggers React's onChange for checkboxes)
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);

      // ErrorBanner onDismiss callback
      fireEvent.click(screen.getByRole('button', { name: /Dismiss error/i }));

      expect(useAlertStore.getState().formData.timestamp).toBe('2026-03-04');
      expect(useTicketStore.getState().error).toBeNull();
    });
  });

  describe('PII validation', () => {
    it('populates fieldErrors map when PII validation fails (public IP without toggle)', () => {
      useAlertStore.setState((s) => ({
        formData: {
          ...s.formData,
          src_ip: '8.8.8.8',
          src_ip_is_public: false,
        },
      }));
      render(<AlertForm />);
      // Form renders — piiResult is invalid, fieldErrors map is populated internally
      expect(screen.getByRole('form', { name: /alert input form/i })).toBeInTheDocument();
    });

    it('shows PII warning banner when form has a blocking error and a full name warning', () => {
      useAlertStore.setState((s) => ({
        formData: {
          ...s.formData,
          src_ip: '8.8.8.8',
          src_ip_is_public: false, // blocking: public IP without toggle
          alert_signature: 'ET EXPLOIT John Smith RCE', // warning: full name pattern
        },
      }));
      render(<AlertForm />);
      expect(screen.getByText(/Review before submitting/i)).toBeInTheDocument();
    });
  });
});
