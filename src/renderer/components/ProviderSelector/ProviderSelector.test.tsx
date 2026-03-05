import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProviderSelector } from './ProviderSelector';
import { useSettingsStore } from '../../store/settingsStore';

function resetSettings() {
  useSettingsStore.setState({
    anthropicApiKey: null,
    geminiApiKey: null,
    openrouterApiKey: null,
    lastProvider: null,
    lastModel: null,
    theme: 'system',
    maxOutputTokens: 4096,
  });
}

describe('ProviderSelector', () => {
  beforeEach(() => {
    resetSettings();
  });

  describe('rendering', () => {
    it('renders provider and model selectors', () => {
      render(<ProviderSelector />);
      expect(screen.getByLabelText(/Select AI provider/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Select AI model/i)).toBeInTheDocument();
    });

    it('shows all three providers as options', () => {
      render(<ProviderSelector />);
      const select = screen.getByLabelText(/Select AI provider/i);
      expect(select).toHaveTextContent('Anthropic Claude');
      expect(select).toHaveTextContent('Google Gemini');
      expect(select).toHaveTextContent('OpenRouter');
    });

    it('model selector is disabled when no provider is selected', () => {
      render(<ProviderSelector />);
      expect(screen.getByLabelText(/Select AI model/i)).toBeDisabled();
    });

    it('model selector is enabled after provider is selected', () => {
      useSettingsStore.setState({ lastProvider: 'anthropic', lastModel: 'claude-sonnet-4-5' });
      render(<ProviderSelector />);
      expect(screen.getByLabelText(/Select AI model/i)).not.toBeDisabled();
    });
  });

  describe('provider selection', () => {
    it('shows Anthropic models after selecting Anthropic', () => {
      render(<ProviderSelector />);
      fireEvent.change(screen.getByLabelText(/Select AI provider/i), {
        target: { value: 'anthropic' },
      });
      const modelSelect = screen.getByLabelText(/Select AI model/i);
      expect(modelSelect).toHaveTextContent('Claude');
    });

    it('shows Gemini models after selecting Gemini', () => {
      render(<ProviderSelector />);
      fireEvent.change(screen.getByLabelText(/Select AI provider/i), {
        target: { value: 'gemini' },
      });
      const modelSelect = screen.getByLabelText(/Select AI model/i);
      expect(modelSelect).toHaveTextContent('Gemini');
    });

    it('shows OpenRouter models after selecting OpenRouter', () => {
      render(<ProviderSelector />);
      fireEvent.change(screen.getByLabelText(/Select AI provider/i), {
        target: { value: 'openrouter' },
      });
      const modelSelect = screen.getByLabelText(/Select AI model/i);
      expect(modelSelect).toHaveTextContent('GPT');
    });

    it('persists provider selection to settings store', () => {
      render(<ProviderSelector />);
      fireEvent.change(screen.getByLabelText(/Select AI provider/i), {
        target: { value: 'gemini' },
      });
      expect(useSettingsStore.getState().lastProvider).toBe('gemini');
    });

    it('sets model to null when provider is changed to empty string', () => {
      useSettingsStore.setState({ lastProvider: 'anthropic', lastModel: 'claude-sonnet-4-5' });
      render(<ProviderSelector />);
      fireEvent.change(screen.getByLabelText(/Select AI provider/i), {
        target: { value: '' },
      });
      expect(useSettingsStore.getState().lastModel).toBeNull();
    });
  });

  describe('model selection', () => {
    it('persists model selection to settings store', () => {
      useSettingsStore.setState({
        lastProvider: 'anthropic',
        lastModel: 'claude-sonnet-4-5',
      });
      render(<ProviderSelector />);
      fireEvent.change(screen.getByLabelText(/Select AI model/i), {
        target: { value: 'claude-opus-4-5' },
      });
      expect(useSettingsStore.getState().lastModel).toBe('claude-opus-4-5');
    });


    it('shows last-used model as selected', () => {
      useSettingsStore.setState({
        lastProvider: 'anthropic',
        lastModel: 'claude-haiku-4-5-20251001',
      });
      render(<ProviderSelector />);
      expect(screen.getByLabelText(/Select AI model/i)).toHaveValue('claude-haiku-4-5-20251001');
    });

    it('resets model to first available when saved model is not in provider list', () => {
      useSettingsStore.setState({
        lastProvider: 'anthropic',
        lastModel: 'non-existent-model-id-xyz',
      });
      render(<ProviderSelector />);
      // useEffect fires synchronously during render — model resets to first anthropic model
      expect(useSettingsStore.getState().lastModel).toBe('claude-opus-4-5');
    });
  });

  describe('disabled state', () => {
    it('both selectors are disabled when disabled prop is true', () => {
      render(<ProviderSelector disabled={true} />);
      expect(screen.getByLabelText(/Select AI provider/i)).toBeDisabled();
      expect(screen.getByLabelText(/Select AI model/i)).toBeDisabled();
    });
  });
});
