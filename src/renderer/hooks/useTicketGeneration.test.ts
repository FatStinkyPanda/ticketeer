import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTicketGeneration } from './useTicketGeneration';
import { useTicketStore } from '../store/ticketStore';
import { useSettingsStore } from '../store/settingsStore';
import * as piiGuardModule from '../services/piiGuard';
import * as promptBuilderModule from '../services/promptBuilder';
import * as providerRouterModule from '../services/providers/providerRouter';
import type { AlertData } from '../types/alert.types';

const validAlert: AlertData = {
  timestamp: 'Mar 4, 2026 @ 00:52:58.969',
  alert_category: 'Exploitation',
  alert_signature: 'ET EXPLOIT Apache log4j RCE Attempt',
  src_ip: '192.168.1.100',
  src_ip_is_public: false,
  src_port: '54321',
  dest_ip: '10.0.0.5',
  dest_ip_is_public: false,
  dest_port: '443',
  proto: 'TCP',
  app_proto: 'https',
  reported_by: 'Test Analyst',
};

describe('useTicketGeneration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Set up valid settings
    useSettingsStore.setState({
      anthropicApiKey: 'sk-ant-test-key',
      geminiApiKey: null,
      openrouterApiKey: null,
      lastProvider: 'anthropic',
      lastModel: 'claude-sonnet-4-5',
      theme: 'system',
      maxOutputTokens: 4096,
    });
    // Reset ticket store
    useTicketStore.setState({
      ticket: null,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('starts with no ticket', () => {
      const { result } = renderHook(() => useTicketGeneration());
      expect(result.current.ticket).toBeNull();
    });

    it('starts with isLoading false', () => {
      const { result } = renderHook(() => useTicketGeneration());
      expect(result.current.isLoading).toBe(false);
    });

    it('starts with no error', () => {
      const { result } = renderHook(() => useTicketGeneration());
      expect(result.current.error).toBeNull();
    });
  });

  describe('generateTicket — pipeline order', () => {
    it('invokes PII guard first', async () => {
      const piiSpy = vi.spyOn(piiGuardModule, 'validateAlertData').mockReturnValue({ valid: false, errors: [{ field: 'general', message: 'PII error', severity: 'error' }] });
      const promptSpy = vi.spyOn(promptBuilderModule, 'buildPrompt');
      const routerSpy = vi.spyOn(providerRouterModule, 'routeToProvider');

      const { result } = renderHook(() => useTicketGeneration());
      await act(async () => {
        await result.current.generateTicket(validAlert);
      });

      expect(piiSpy).toHaveBeenCalledWith(validAlert);
      expect(promptSpy).not.toHaveBeenCalled();
      expect(routerSpy).not.toHaveBeenCalled();
    });

    it('calls prompt builder after PII guard passes', async () => {
      vi.spyOn(piiGuardModule, 'validateAlertData').mockReturnValue({ valid: true });
      const promptSpy = vi.spyOn(promptBuilderModule, 'buildPrompt').mockReturnValue({
        systemPrompt: 'system',
        userMessage: 'user',
      });
      vi.spyOn(providerRouterModule, 'routeToProvider').mockResolvedValue('ticket text');

      const { result } = renderHook(() => useTicketGeneration());
      await act(async () => {
        await result.current.generateTicket(validAlert);
      });

      expect(promptSpy).toHaveBeenCalledWith(validAlert);
    });

    it('calls provider router after prompt builder', async () => {
      vi.spyOn(piiGuardModule, 'validateAlertData').mockReturnValue({ valid: true });
      vi.spyOn(promptBuilderModule, 'buildPrompt').mockReturnValue({
        systemPrompt: 'system',
        userMessage: 'user',
      });
      const routerSpy = vi.spyOn(providerRouterModule, 'routeToProvider').mockResolvedValue('=== TICKET ===');

      const { result } = renderHook(() => useTicketGeneration());
      await act(async () => {
        await result.current.generateTicket(validAlert);
      });

      expect(routerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'anthropic',
          model: 'claude-sonnet-4-5',
          apiKey: 'sk-ant-test-key',
          maxTokens: 4096,
        }),
      );
    });
  });

  describe('generateTicket — success state', () => {
    it('sets ticket content on success', async () => {
      vi.spyOn(piiGuardModule, 'validateAlertData').mockReturnValue({ valid: true });
      vi.spyOn(promptBuilderModule, 'buildPrompt').mockReturnValue({ systemPrompt: 'sys', userMessage: 'usr' });
      vi.spyOn(providerRouterModule, 'routeToProvider').mockResolvedValue('TICKET CONTENT');

      const { result } = renderHook(() => useTicketGeneration());
      await act(async () => {
        await result.current.generateTicket(validAlert);
      });

      expect(result.current.ticket?.content).toBe('TICKET CONTENT');
      expect(result.current.ticket?.provider).toBe('anthropic');
      expect(result.current.ticket?.model).toBe('claude-sonnet-4-5');
    });

    it('sets isLoading false after success', async () => {
      vi.spyOn(piiGuardModule, 'validateAlertData').mockReturnValue({ valid: true });
      vi.spyOn(promptBuilderModule, 'buildPrompt').mockReturnValue({ systemPrompt: 'sys', userMessage: 'usr' });
      vi.spyOn(providerRouterModule, 'routeToProvider').mockResolvedValue('ticket');

      const { result } = renderHook(() => useTicketGeneration());
      await act(async () => {
        await result.current.generateTicket(validAlert);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('clears error on success', async () => {
      useTicketStore.setState({ error: { code: 'NETWORK_ERROR', message: 'Old error' } });
      vi.spyOn(piiGuardModule, 'validateAlertData').mockReturnValue({ valid: true });
      vi.spyOn(promptBuilderModule, 'buildPrompt').mockReturnValue({ systemPrompt: 'sys', userMessage: 'usr' });
      vi.spyOn(providerRouterModule, 'routeToProvider').mockResolvedValue('ticket');

      const { result } = renderHook(() => useTicketGeneration());
      await act(async () => {
        await result.current.generateTicket(validAlert);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('generateTicket — PII violation', () => {
    it('sets PII_VIOLATION error when PII guard fails', async () => {
      vi.spyOn(piiGuardModule, 'validateAlertData').mockReturnValue({
        valid: false,
        errors: [{ field: 'src_ip', message: 'Public IP without toggle', severity: 'error' }],
      });

      const { result } = renderHook(() => useTicketGeneration());
      await act(async () => {
        await result.current.generateTicket(validAlert);
      });

      expect(result.current.error?.code).toBe('PII_VIOLATION');
    });

    it('sets isLoading false after PII violation', async () => {
      vi.spyOn(piiGuardModule, 'validateAlertData').mockReturnValue({
        valid: false,
        errors: [{ field: 'general', message: 'PII error', severity: 'error' }],
      });

      const { result } = renderHook(() => useTicketGeneration());
      await act(async () => {
        await result.current.generateTicket(validAlert);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('generateTicket — no provider configured', () => {
    it('sets error when no provider selected', async () => {
      useSettingsStore.setState({ lastProvider: null });

      vi.spyOn(piiGuardModule, 'validateAlertData').mockReturnValue({ valid: true });

      const { result } = renderHook(() => useTicketGeneration());
      await act(async () => {
        await result.current.generateTicket(validAlert);
      });

      expect(result.current.error?.code).toBe('API_ERROR');
      expect(result.current.error?.message).toContain('No AI provider');
    });

    it('sets AUTH_ERROR when API key is missing for selected provider', async () => {
      useSettingsStore.setState({ anthropicApiKey: null });

      vi.spyOn(piiGuardModule, 'validateAlertData').mockReturnValue({ valid: true });

      const { result } = renderHook(() => useTicketGeneration());
      await act(async () => {
        await result.current.generateTicket(validAlert);
      });

      expect(result.current.error?.code).toBe('AUTH_ERROR');
    });
  });

  describe('generateTicket — provider API key selection', () => {
    it('uses geminiApiKey when provider is gemini', async () => {
      useSettingsStore.setState({
        geminiApiKey: 'AIzaSy-gemini-test-key',
        lastProvider: 'gemini',
        lastModel: 'gemini-2.0-flash',
      });
      vi.spyOn(piiGuardModule, 'validateAlertData').mockReturnValue({ valid: true });
      vi.spyOn(promptBuilderModule, 'buildPrompt').mockReturnValue({ systemPrompt: 'sys', userMessage: 'usr' });
      const routerSpy = vi.spyOn(providerRouterModule, 'routeToProvider').mockResolvedValue('ticket');

      const { result } = renderHook(() => useTicketGeneration());
      await act(async () => {
        await result.current.generateTicket(validAlert);
      });

      expect(routerSpy).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'gemini', apiKey: 'AIzaSy-gemini-test-key' }),
      );
    });

    it('uses openrouterApiKey when provider is openrouter', async () => {
      useSettingsStore.setState({
        openrouterApiKey: 'sk-or-v1-test-key',
        lastProvider: 'openrouter',
        lastModel: 'openai/gpt-4o',
      });
      vi.spyOn(piiGuardModule, 'validateAlertData').mockReturnValue({ valid: true });
      vi.spyOn(promptBuilderModule, 'buildPrompt').mockReturnValue({ systemPrompt: 'sys', userMessage: 'usr' });
      const routerSpy = vi.spyOn(providerRouterModule, 'routeToProvider').mockResolvedValue('ticket');

      const { result } = renderHook(() => useTicketGeneration());
      await act(async () => {
        await result.current.generateTicket(validAlert);
      });

      expect(routerSpy).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'openrouter', apiKey: 'sk-or-v1-test-key' }),
      );
    });
  });

  describe('generateTicket — API error handling', () => {
    it('sets error state on API failure (TicketGenerationError)', async () => {
      vi.spyOn(piiGuardModule, 'validateAlertData').mockReturnValue({ valid: true });
      vi.spyOn(promptBuilderModule, 'buildPrompt').mockReturnValue({ systemPrompt: 'sys', userMessage: 'usr' });
      vi.spyOn(providerRouterModule, 'routeToProvider').mockRejectedValue({
        code: 'RATE_LIMIT',
        message: 'Rate limit reached.',
      });

      const { result } = renderHook(() => useTicketGeneration());
      await act(async () => {
        await result.current.generateTicket(validAlert);
      });

      expect(result.current.error?.code).toBe('RATE_LIMIT');
      expect(result.current.ticket).toBeNull();
    });

    it('wraps plain Error in API_ERROR when routeToProvider throws without code', async () => {
      vi.spyOn(piiGuardModule, 'validateAlertData').mockReturnValue({ valid: true });
      vi.spyOn(promptBuilderModule, 'buildPrompt').mockReturnValue({ systemPrompt: 'sys', userMessage: 'usr' });
      vi.spyOn(providerRouterModule, 'routeToProvider').mockRejectedValue(
        new Error('Something went wrong'),
      );

      const { result } = renderHook(() => useTicketGeneration());
      await act(async () => {
        await result.current.generateTicket(validAlert);
      });

      expect(result.current.error?.code).toBe('API_ERROR');
      expect(result.current.error?.message).toContain('unexpected error');
    });

    it('uses String(cause) in details when routeToProvider rejects with a non-Error value', async () => {
      vi.spyOn(piiGuardModule, 'validateAlertData').mockReturnValue({ valid: true });
      vi.spyOn(promptBuilderModule, 'buildPrompt').mockReturnValue({ systemPrompt: 'sys', userMessage: 'usr' });
      vi.spyOn(providerRouterModule, 'routeToProvider').mockRejectedValue('string-cause-error');

      const { result } = renderHook(() => useTicketGeneration());
      await act(async () => {
        await result.current.generateTicket(validAlert);
      });

      expect(result.current.error?.code).toBe('API_ERROR');
      expect(result.current.error?.details).toBe('string-cause-error');
    });
  });

  describe('clearTicket', () => {
    it('clears ticket, error, and loading state', async () => {
      useTicketStore.setState({
        ticket: { content: 'old ticket', provider: 'anthropic', model: 'test', generatedAt: new Date() },
        error: { code: 'API_ERROR', message: 'old error' },
        isLoading: true,
      });

      const { result } = renderHook(() => useTicketGeneration());
      act(() => {
        result.current.clearTicket();
      });

      expect(result.current.ticket).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });
});
