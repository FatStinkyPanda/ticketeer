import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callAnthropic } from './anthropic';
import type { BuiltPrompt } from '../../types/provider.types';
import type { TicketGenerationError } from '../../types/ticket.types';

const mockPrompt: BuiltPrompt = {
  systemPrompt: 'You are a security ticket agent.',
  userMessage: 'Generate a ticket for: ET EXPLOIT Apache log4j',
};

const MOCK_API_KEY = 'sk-ant-test-key-12345';
const MOCK_MODEL = 'claude-sonnet-4-5';
const MOCK_MAX_TOKENS = 4096;

function mockFetch(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }),
  );
}

function mockFetchNetworkError(): void {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));
}

describe('callAnthropic', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful call', () => {
    it('returns ticket text from response.content[0].text', async () => {
      mockFetch(200, {
        content: [{ type: 'text', text: '=== TICKET ===\nGenerated ticket content' }],
      });

      const result = await callAnthropic(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS);
      expect(result).toBe('=== TICKET ===\nGenerated ticket content');
    });

    it('calls the correct Anthropic endpoint', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ content: [{ type: 'text', text: 'ticket content' }] }),
      });
      vi.stubGlobal('fetch', fetchSpy);

      await callAnthropic(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.any(Object),
      );
    });

    it('sends correct x-api-key header', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ content: [{ type: 'text', text: 'ticket' }] }),
      });
      vi.stubGlobal('fetch', fetchSpy);

      await callAnthropic(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS);

      const callArgs = fetchSpy.mock.calls[0][1] as RequestInit;
      const headers = callArgs.headers as Record<string, string>;
      expect(headers['x-api-key']).toBe(MOCK_API_KEY);
    });

    it('sends anthropic-version header', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ content: [{ type: 'text', text: 'ticket' }] }),
      });
      vi.stubGlobal('fetch', fetchSpy);

      await callAnthropic(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS);

      const callArgs = fetchSpy.mock.calls[0][1] as RequestInit;
      const headers = callArgs.headers as Record<string, string>;
      expect(headers['anthropic-version']).toBe('2023-06-01');
    });

    it('sends system and user message in request body', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ content: [{ type: 'text', text: 'ticket' }] }),
      });
      vi.stubGlobal('fetch', fetchSpy);

      await callAnthropic(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS);

      const callArgs = fetchSpy.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string) as {
        system: string;
        messages: Array<{ role: string; content: string }>;
        model: string;
        max_tokens: number;
      };
      expect(body.system).toBe(mockPrompt.systemPrompt);
      expect(body.messages[0].content).toBe(mockPrompt.userMessage);
      expect(body.model).toBe(MOCK_MODEL);
      expect(body.max_tokens).toBe(MOCK_MAX_TOKENS);
    });
  });

  describe('error handling', () => {
    it('throws AUTH_ERROR on 401', async () => {
      mockFetch(401, { error: { message: 'Invalid API key' } });

      await expect(
        callAnthropic(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'AUTH_ERROR' });
    });

    it('throws AUTH_ERROR on 403', async () => {
      mockFetch(403, { error: { message: 'Forbidden' } });

      await expect(
        callAnthropic(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'AUTH_ERROR' });
    });

    it('throws RATE_LIMIT on 429', async () => {
      mockFetch(429, { error: { message: 'Rate limit exceeded' } });

      await expect(
        callAnthropic(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'RATE_LIMIT' });
    });

    it('throws API_ERROR on 500', async () => {
      mockFetch(500, { error: { message: 'Internal server error' } });

      await expect(
        callAnthropic(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'API_ERROR' });
    });

    it('throws NETWORK_ERROR on fetch failure', async () => {
      mockFetchNetworkError();

      await expect(
        callAnthropic(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'NETWORK_ERROR' });
    });

    it('throws API_ERROR on empty content array', async () => {
      mockFetch(200, { content: [] });

      await expect(
        callAnthropic(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'API_ERROR' });
    });

    it('throws CONTEXT_LENGTH on 400 with context error', async () => {
      mockFetch(400, { error: { message: 'context window exceeded' } });

      await expect(
        callAnthropic(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'CONTEXT_LENGTH' });
    });

    it('throws NETWORK_ERROR with String(cause) when fetch rejects with non-Error value', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue('plain string network failure'));

      await expect(
        callAnthropic(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'NETWORK_ERROR' });
    });

    it('throws AUTH_ERROR with undefined details when error response.json() fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          json: () => Promise.reject(new Error('Invalid JSON')),
        }),
      );

      await expect(
        callAnthropic(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'AUTH_ERROR' });
    });
  });
});
