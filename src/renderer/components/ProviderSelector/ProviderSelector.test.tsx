import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProviderSelector } from './ProviderSelector';
import { useSettingsStore } from '../../store/settingsStore';
import type { UseModelListResult } from '../../hooks/useModelList';

// Prevent real network calls — ProviderSelector calls useModelList internally
vi.mock('../../hooks/useModelList', () => ({
  useModelList: vi.fn(),
}));

// Mock modelFetcher so clearModelCache calls can be verified
vi.mock('../../services/modelFetcher', () => ({
  clearModelCache: vi.fn(),
}));

import { useModelList } from '../../hooks/useModelList';
import { clearModelCache } from '../../services/modelFetcher';

const staticResult: UseModelListResult = {
  models: [
    { id: 'claude-opus-4-5', name: 'Claude Opus 4.5' },
    { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
  ],
  loading: false,
  error: null,
  isFallback: false,
};

const openrouterModels: UseModelListResult = {
  models: [
    { id: 'openai/gpt-4o', name: 'GPT-4o', isFree: false },
    { id: 'free/model', name: 'Free Model', isFree: true },
    { id: 'gemini/pro', name: 'Gemini Pro', isFree: false },
  ],
  loading: false,
  error: null,
  isFallback: false,
};

const geminiModels: UseModelListResult = {
  models: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  ],
  loading: false,
  error: null,
  isFallback: false,
};

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
    vi.mocked(useModelList).mockReturnValue(staticResult);
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
      useSettingsStore.setState({ lastProvider: 'anthropic', lastModel: 'claude-opus-4-5' });
      render(<ProviderSelector />);
      expect(screen.getByLabelText(/Select AI model/i)).toHaveTextContent('Claude');
    });

    it('shows Gemini models after selecting Gemini', () => {
      vi.mocked(useModelList).mockReturnValue(geminiModels);
      useSettingsStore.setState({ lastProvider: 'gemini', lastModel: 'gemini-2.0-flash' });
      render(<ProviderSelector />);
      expect(screen.getByLabelText(/Select AI model/i)).toHaveTextContent('Gemini');
    });

    it('shows OpenRouter models after selecting OpenRouter', () => {
      vi.mocked(useModelList).mockReturnValue(openrouterModels);
      useSettingsStore.setState({ lastProvider: 'openrouter', lastModel: 'openai/gpt-4o' });
      render(<ProviderSelector />);
      expect(screen.getByLabelText(/Select AI model/i)).toHaveTextContent('GPT');
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
      useSettingsStore.setState({ lastProvider: 'anthropic', lastModel: 'claude-sonnet-4-5' });
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

    it('resets model to first available when saved model is not in list', () => {
      useSettingsStore.setState({
        lastProvider: 'anthropic',
        lastModel: 'non-existent-model-xyz',
      });
      render(<ProviderSelector />);
      expect(useSettingsStore.getState().lastModel).toBe('claude-opus-4-5');
    });
  });

  describe('disabled state', () => {
    it('both selectors are disabled when disabled prop is true', () => {
      render(<ProviderSelector disabled={true} />);
      expect(screen.getByLabelText(/Select AI provider/i)).toBeDisabled();
      expect(screen.getByLabelText(/Select AI model/i)).toBeDisabled();
    });

    it('search input is disabled when disabled prop is true', () => {
      useSettingsStore.setState({ lastProvider: 'anthropic', lastModel: 'claude-opus-4-5' });
      render(<ProviderSelector disabled={true} />);
      expect(screen.getByLabelText(/Search models/i)).toBeDisabled();
    });

    it('refresh button is disabled when disabled prop is true', () => {
      useSettingsStore.setState({ lastProvider: 'anthropic', lastModel: 'claude-opus-4-5' });
      render(<ProviderSelector disabled={true} />);
      expect(screen.getByRole('button', { name: /Refresh model list/i })).toBeDisabled();
    });
  });

  describe('search', () => {
    it('search input appears when a provider is selected', () => {
      useSettingsStore.setState({ lastProvider: 'anthropic', lastModel: 'claude-opus-4-5' });
      render(<ProviderSelector />);
      expect(screen.getByLabelText(/Search models/i)).toBeInTheDocument();
    });

    it('search input does not appear when no provider is selected', () => {
      render(<ProviderSelector />);
      expect(screen.queryByLabelText(/Search models/i)).not.toBeInTheDocument();
    });

    it('filters models by search term (name match)', () => {
      useSettingsStore.setState({ lastProvider: 'anthropic', lastModel: 'claude-opus-4-5' });
      render(<ProviderSelector />);
      fireEvent.change(screen.getByLabelText(/Search models/i), {
        target: { value: 'Haiku' },
      });
      const modelSelect = screen.getByLabelText(/Select AI model/i);
      expect(modelSelect).toHaveTextContent('Claude Haiku');
      expect(modelSelect).not.toHaveTextContent('Claude Opus');
      expect(modelSelect).not.toHaveTextContent('Claude Sonnet');
    });

    it('filters models by search term (id match)', () => {
      useSettingsStore.setState({ lastProvider: 'anthropic', lastModel: 'claude-opus-4-5' });
      render(<ProviderSelector />);
      fireEvent.change(screen.getByLabelText(/Search models/i), {
        target: { value: 'sonnet' },
      });
      const modelSelect = screen.getByLabelText(/Select AI model/i);
      expect(modelSelect).toHaveTextContent('Claude Sonnet');
      expect(modelSelect).not.toHaveTextContent('Claude Opus');
    });

    it('shows all models when search is cleared', () => {
      useSettingsStore.setState({ lastProvider: 'anthropic', lastModel: 'claude-opus-4-5' });
      render(<ProviderSelector />);
      const searchInput = screen.getByLabelText(/Search models/i);
      fireEvent.change(searchInput, { target: { value: 'Haiku' } });
      fireEvent.change(searchInput, { target: { value: '' } });
      const modelSelect = screen.getByLabelText(/Select AI model/i);
      expect(modelSelect).toHaveTextContent('Claude Opus');
      expect(modelSelect).toHaveTextContent('Claude Sonnet');
      expect(modelSelect).toHaveTextContent('Claude Haiku');
    });
  });

  describe('free models filter (OpenRouter)', () => {
    beforeEach(() => {
      vi.mocked(useModelList).mockReturnValue(openrouterModels);
      useSettingsStore.setState({ lastProvider: 'openrouter', lastModel: 'openai/gpt-4o' });
    });

    it('shows free-only checkbox for OpenRouter', () => {
      render(<ProviderSelector />);
      expect(screen.getByLabelText(/Show free models only/i)).toBeInTheDocument();
    });

    it('does not show free-only checkbox for Anthropic', () => {
      vi.mocked(useModelList).mockReturnValue(staticResult);
      useSettingsStore.setState({ lastProvider: 'anthropic', lastModel: 'claude-opus-4-5' });
      render(<ProviderSelector />);
      expect(screen.queryByLabelText(/Show free models only/i)).not.toBeInTheDocument();
    });

    it('filters to free models only when checkbox is checked', () => {
      render(<ProviderSelector />);
      fireEvent.click(screen.getByLabelText(/Show free models only/i));
      const modelSelect = screen.getByLabelText(/Select AI model/i);
      expect(modelSelect).toHaveTextContent('Free Model');
      expect(modelSelect).not.toHaveTextContent('GPT-4o');
      expect(modelSelect).not.toHaveTextContent('Gemini Pro');
    });

    it('shows all models when free-only is unchecked', () => {
      render(<ProviderSelector />);
      fireEvent.click(screen.getByLabelText(/Show free models only/i));
      fireEvent.click(screen.getByLabelText(/Show free models only/i));
      const modelSelect = screen.getByLabelText(/Select AI model/i);
      expect(modelSelect).toHaveTextContent('GPT-4o');
      expect(modelSelect).toHaveTextContent('Free Model');
    });

    it('free filter combined with search narrows further', () => {
      render(<ProviderSelector />);
      fireEvent.click(screen.getByLabelText(/Show free models only/i));
      fireEvent.change(screen.getByLabelText(/Search models/i), {
        target: { value: 'Paid' },
      });
      const modelSelect = screen.getByLabelText(/Select AI model/i);
      // 'Paid' doesn't match any free model name
      expect(modelSelect).not.toHaveTextContent('Free Model');
    });
  });

  describe('refresh button', () => {
    it('refresh button appears when a provider is selected', () => {
      useSettingsStore.setState({ lastProvider: 'anthropic', lastModel: 'claude-opus-4-5' });
      render(<ProviderSelector />);
      expect(screen.getByRole('button', { name: /Refresh model list/i })).toBeInTheDocument();
    });

    it('refresh button does not appear when no provider is selected', () => {
      render(<ProviderSelector />);
      expect(screen.queryByRole('button', { name: /Refresh model list/i })).not.toBeInTheDocument();
    });

    it('clicking refresh clears the cache and increments trigger', () => {
      useSettingsStore.setState({ lastProvider: 'anthropic', lastModel: 'claude-opus-4-5' });
      render(<ProviderSelector />);
      fireEvent.click(screen.getByRole('button', { name: /Refresh model list/i }));
      expect(vi.mocked(clearModelCache)).toHaveBeenCalledWith('anthropic', null);
    });

    it('refresh button is disabled while loading', () => {
      vi.mocked(useModelList).mockReturnValue({
        ...staticResult,
        loading: true,
      });
      useSettingsStore.setState({ lastProvider: 'anthropic', lastModel: 'claude-opus-4-5' });
      render(<ProviderSelector />);
      expect(screen.getByRole('button', { name: /Refresh model list/i })).toBeDisabled();
    });
  });

  describe('loading and error states', () => {
    it('shows loading indicator when models are loading', () => {
      vi.mocked(useModelList).mockReturnValue({ ...staticResult, loading: true });
      useSettingsStore.setState({ lastProvider: 'anthropic', lastModel: 'claude-opus-4-5' });
      render(<ProviderSelector />);
      expect(screen.getByLabelText(/Loading models/i)).toBeInTheDocument();
    });

    it('shows static list indicator when isFallback is true and not loading', () => {
      vi.mocked(useModelList).mockReturnValue({
        ...staticResult,
        isFallback: true,
        loading: false,
      });
      useSettingsStore.setState({ lastProvider: 'anthropic', lastModel: 'claude-opus-4-5' });
      render(<ProviderSelector />);
      expect(screen.getByLabelText(/Using static model list/i)).toBeInTheDocument();
    });

    it('does not show static list indicator while loading', () => {
      vi.mocked(useModelList).mockReturnValue({
        ...staticResult,
        isFallback: true,
        loading: true,
      });
      useSettingsStore.setState({ lastProvider: 'anthropic', lastModel: 'claude-opus-4-5' });
      render(<ProviderSelector />);
      expect(screen.queryByLabelText(/Using static model list/i)).not.toBeInTheDocument();
    });

    it('shows error message in alert role', () => {
      vi.mocked(useModelList).mockReturnValue({
        ...staticResult,
        error: 'Network failure',
      });
      useSettingsStore.setState({ lastProvider: 'anthropic', lastModel: 'claude-opus-4-5' });
      render(<ProviderSelector />);
      expect(screen.getByRole('alert')).toHaveTextContent('Network failure');
    });
  });

  describe('provider change resets filters', () => {
    it('search is cleared when provider changes', () => {
      useSettingsStore.setState({ lastProvider: 'anthropic', lastModel: 'claude-opus-4-5' });
      render(<ProviderSelector />);
      fireEvent.change(screen.getByLabelText(/Search models/i), {
        target: { value: 'Haiku' },
      });
      fireEvent.change(screen.getByLabelText(/Select AI provider/i), {
        target: { value: 'gemini' },
      });
      expect(screen.getByLabelText(/Search models/i)).toHaveValue('');
    });
  });
});
