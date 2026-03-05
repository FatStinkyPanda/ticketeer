import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { routeToProvider } from './providerRouter';
import type { ApiCallParams } from '../../types/provider.types';
import type { TicketGenerationError } from '../../types/ticket.types';
import * as anthropicModule from './anthropic';
import * as geminiModule from './gemini';
import * as openrouterModule from './openrouter';

const mockPrompt = {
  systemPrompt: 'System instructions',
  userMessage: 'User alert data',
};

const baseParams: ApiCallParams = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-5',
  prompt: mockPrompt,
  apiKey: 'sk-ant-test',
  maxTokens: 4096,
};

describe('routeToProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('routes to Anthropic client for provider "anthropic"', async () => {
    const spy = vi.spyOn(anthropicModule, 'callAnthropic').mockResolvedValue('anthropic ticket');

    const result = await routeToProvider({ ...baseParams, provider: 'anthropic' });

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith(mockPrompt, 'claude-sonnet-4-5', 'sk-ant-test', 4096);
    expect(result).toBe('anthropic ticket');
  });

  it('routes to Gemini client for provider "gemini"', async () => {
    const spy = vi.spyOn(geminiModule, 'callGemini').mockResolvedValue('gemini ticket');

    const result = await routeToProvider({
      ...baseParams,
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      apiKey: 'AIzaSyTestKey',
    });

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith(mockPrompt, 'gemini-2.0-flash', 'AIzaSyTestKey', 4096);
    expect(result).toBe('gemini ticket');
  });

  it('routes to OpenRouter client for provider "openrouter"', async () => {
    const spy = vi.spyOn(openrouterModule, 'callOpenRouter').mockResolvedValue('openrouter ticket');

    const result = await routeToProvider({
      ...baseParams,
      provider: 'openrouter',
      model: 'openai/gpt-4o',
      apiKey: 'sk-or-test',
    });

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith(mockPrompt, 'openai/gpt-4o', 'sk-or-test', 4096);
    expect(result).toBe('openrouter ticket');
  });

  it('passes errors from provider clients through unchanged', async () => {
    const expectedError: TicketGenerationError = {
      code: 'AUTH_ERROR',
      message: 'API key invalid or expired — check Settings.',
    };
    vi.spyOn(anthropicModule, 'callAnthropic').mockRejectedValue(expectedError);

    await expect(routeToProvider({ ...baseParams, provider: 'anthropic' })).rejects.toMatchObject(
      expectedError,
    );
  });

  it('throws API_ERROR for unknown provider', async () => {
    await expect(
      // @ts-expect-error — testing invalid provider
      routeToProvider({ ...baseParams, provider: 'unknown-provider' }),
    ).rejects.toMatchObject<TicketGenerationError>({
      code: 'API_ERROR',
      message: expect.stringContaining('Unknown provider'),
    });
  });
});
