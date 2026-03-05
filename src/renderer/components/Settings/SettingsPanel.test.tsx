import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from './SettingsPanel';
import { useSettingsStore } from '../../store/settingsStore';

function resetSettings() {
  useSettingsStore.setState({
    anthropicApiKey: null,
    geminiApiKey: null,
    openrouterApiKey: null,
    lastProvider: null,
    lastModel: null,
    theme: 'system',
    maxOutputTokens: 64000,
  });
}

describe('SettingsPanel', () => {
  beforeEach(() => {
    resetSettings();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('rendering', () => {
    it('renders the settings panel', () => {
      render(<SettingsPanel />);
      expect(screen.getByRole('region', { name: /Settings panel/i })).toBeInTheDocument();
    });

    it('renders API Keys section heading', () => {
      render(<SettingsPanel />);
      expect(screen.getByRole('heading', { name: /API Keys/i })).toBeInTheDocument();
    });

    it('renders Preferences section heading', () => {
      render(<SettingsPanel />);
      expect(screen.getByRole('heading', { name: /Preferences/i })).toBeInTheDocument();
    });

    it('renders API key fields for all three providers', () => {
      render(<SettingsPanel />);
      expect(screen.getByRole('region', { name: /Anthropic Claude API key settings/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /Google Gemini API key settings/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /OpenRouter API key settings/i })).toBeInTheDocument();
    });

    it('renders theme selector', () => {
      render(<SettingsPanel />);
      expect(screen.getByLabelText(/Theme/i)).toBeInTheDocument();
    });

    it('renders max tokens input', () => {
      render(<SettingsPanel />);
      expect(screen.getByLabelText(/Max Output Tokens/i)).toBeInTheDocument();
    });

    it('shows security/privacy note', () => {
      render(<SettingsPanel />);
      expect(screen.getByText(/Privacy & Security/i)).toBeInTheDocument();
    });
  });

  describe('theme settings', () => {
    it('shows system as default theme', () => {
      render(<SettingsPanel />);
      expect(screen.getByLabelText(/Theme/i)).toHaveValue('system');
    });

    it('updates theme when changed', () => {
      render(<SettingsPanel />);
      fireEvent.change(screen.getByLabelText(/Theme/i), { target: { value: 'dark' } });
      expect(useSettingsStore.getState().theme).toBe('dark');
    });

    it('persists theme selection to light', () => {
      render(<SettingsPanel />);
      fireEvent.change(screen.getByLabelText(/Theme/i), { target: { value: 'light' } });
      expect(useSettingsStore.getState().theme).toBe('light');
    });
  });

  describe('max output tokens', () => {
    it('shows 64000 as default', () => {
      render(<SettingsPanel />);
      expect(screen.getByLabelText(/Max Output Tokens/i)).toHaveValue(64000);
    });

    it('updates max tokens when changed', () => {
      render(<SettingsPanel />);
      fireEvent.change(screen.getByLabelText(/Max Output Tokens/i), { target: { value: '8192' } });
      expect(useSettingsStore.getState().maxOutputTokens).toBe(8192);
    });
  });

  describe('API key management', () => {
    it('saves Anthropic key through ApiKeyField', async () => {
      render(<SettingsPanel />);
      const input = screen.getByLabelText(/Anthropic Claude API key input/i);
      await userEvent.type(input, 'sk-ant-api03-testkeytestkeytestkey12345678');
      fireEvent.click(screen.getByRole('button', { name: /Save Anthropic/i }));
      expect(useSettingsStore.getState().anthropicApiKey).toBe(
        'sk-ant-api03-testkeytestkeytestkey12345678',
      );
    });

    it('shows masked key after saving', async () => {
      useSettingsStore.setState({ anthropicApiKey: 'sk-ant-api03-testkey1234' });
      render(<SettingsPanel />);
      expect(screen.getByText(/••••••••/)).toBeInTheDocument();
    });

    it('deletes API key when delete is confirmed', () => {
      useSettingsStore.setState({ anthropicApiKey: 'sk-ant-api03-existing-key-1234567890' });
      render(<SettingsPanel />);
      // Click "Delete key"
      fireEvent.click(screen.getByRole('button', { name: /Delete Anthropic Claude API key/i }));
      // Click "Yes, delete"
      fireEvent.click(screen.getByRole('button', { name: /Yes, delete/i }));
      expect(useSettingsStore.getState().anthropicApiKey).toBeNull();
    });
  });
});
