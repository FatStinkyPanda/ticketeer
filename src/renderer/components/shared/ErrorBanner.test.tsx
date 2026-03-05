import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBanner } from './ErrorBanner';
import type { TicketGenerationError } from '../../types/ticket.types';

const networkError: TicketGenerationError = {
  code: 'NETWORK_ERROR',
  message: 'Network error — check your internet connection.',
};

const authError: TicketGenerationError = {
  code: 'AUTH_ERROR',
  message: 'API key invalid or expired — check Settings.',
};

const errorWithDetails: TicketGenerationError = {
  code: 'API_ERROR',
  message: 'Something went wrong.',
  details: 'Detailed technical error message from provider.',
};

describe('ErrorBanner', () => {
  describe('rendering', () => {
    it('renders with role="alert"', () => {
      render(<ErrorBanner error={networkError} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('displays error message', () => {
      render(<ErrorBanner error={networkError} />);
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });

    it('displays correct error label for NETWORK_ERROR', () => {
      render(<ErrorBanner error={networkError} />);
      expect(screen.getByRole('alert')).toHaveAccessibleName('Network Error');
    });

    it('displays correct error label for AUTH_ERROR', () => {
      render(<ErrorBanner error={authError} />);
      expect(screen.getByRole('alert')).toHaveAccessibleName('Authentication Error');
    });

    it('displays correct error label for RATE_LIMIT', () => {
      render(<ErrorBanner error={{ code: 'RATE_LIMIT', message: 'Too many requests.' }} />);
      expect(screen.getByRole('alert')).toHaveAccessibleName('Rate Limit Reached');
    });
  });

  describe('details', () => {
    it('shows details in a collapsible section when provided', () => {
      render(<ErrorBanner error={errorWithDetails} />);
      expect(screen.getByText('Technical details')).toBeInTheDocument();
    });

    it('does not show details section when not provided', () => {
      render(<ErrorBanner error={networkError} />);
      expect(screen.queryByText('Technical details')).not.toBeInTheDocument();
    });
  });

  describe('dismiss button', () => {
    it('renders dismiss button when onDismiss is provided', () => {
      render(<ErrorBanner error={networkError} onDismiss={vi.fn()} />);
      expect(screen.getByRole('button', { name: /Dismiss/i })).toBeInTheDocument();
    });

    it('does not render dismiss button when onDismiss is not provided', () => {
      render(<ErrorBanner error={networkError} />);
      expect(screen.queryByRole('button', { name: /Dismiss/i })).not.toBeInTheDocument();
    });

    it('calls onDismiss when clicked', () => {
      const onDismiss = vi.fn();
      render(<ErrorBanner error={networkError} onDismiss={onDismiss} />);
      fireEvent.click(screen.getByRole('button', { name: /Dismiss/i }));
      expect(onDismiss).toHaveBeenCalledOnce();
    });
  });

  describe('retry button', () => {
    it('renders retry button when onRetry is provided', () => {
      render(<ErrorBanner error={networkError} onRetry={vi.fn()} />);
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    it('calls onRetry when clicked', () => {
      const onRetry = vi.fn();
      render(<ErrorBanner error={networkError} onRetry={onRetry} />);
      fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
      expect(onRetry).toHaveBeenCalledOnce();
    });
  });

  describe('Go to Settings button', () => {
    it('renders Go to Settings for AUTH_ERROR when onGoToSettings provided', () => {
      render(<ErrorBanner error={authError} onGoToSettings={vi.fn()} />);
      expect(screen.getByRole('button', { name: /Go to Settings/i })).toBeInTheDocument();
    });

    it('does not render Go to Settings for non-AUTH errors', () => {
      render(<ErrorBanner error={networkError} onGoToSettings={vi.fn()} />);
      expect(screen.queryByRole('button', { name: /Go to Settings/i })).not.toBeInTheDocument();
    });

    it('calls onGoToSettings when clicked', () => {
      const onGoToSettings = vi.fn();
      render(<ErrorBanner error={authError} onGoToSettings={onGoToSettings} />);
      fireEvent.click(screen.getByRole('button', { name: /Go to Settings/i }));
      expect(onGoToSettings).toHaveBeenCalledOnce();
    });
  });
});
