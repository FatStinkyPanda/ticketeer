import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callOpenRouter } from './openrouter';
import type { BuiltPrompt } from '../../types/provider.types';
import type { TicketGenerationError } from '../../types/ticket.types';

const mockPrompt: BuiltPrompt = {
  systemPrompt: 'You are a security ticket agent.',
  userMessage: 'Generate a ticket for: ET EXPLOIT Apache log4j',
};

const MOCK_API_KEY = 'sk-or-v1-test-openrouter-key';
const MOCK_MODEL = 'openai/gpt-4o';
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

const SUCCESS_RESPONSE = {
  choices: [
    {
      message: { content: '=== TICKET ===\nGenerated ticket content' },
    },
  ],
};

describe('callOpenRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful call', () => {
    it('returns ticket text from response.choices[0].message.content', async () => {
      mockFetch(200, SUCCESS_RESPONSE);

      const result = await callOpenRouter(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS);
      expect(result).toBe('=== TICKET ===\nGenerated ticket content');
    });

    it('calls the correct OpenRouter endpoint', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(SUCCESS_RESPONSE),
      });
      vi.stubGlobal('fetch', fetchSpy);

      await callOpenRouter(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.any(Object),
      );
    });

    it('sends correct Authorization Bearer header', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(SUCCESS_RESPONSE),
      });
      vi.stubGlobal('fetch', fetchSpy);

      await callOpenRouter(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS);

      const callArgs = fetchSpy.mock.calls[0][1] as RequestInit;
      const headers = callArgs.headers as Record<string, string>;
      expect(headers['Authorization']).toBe(`Bearer ${MOCK_API_KEY}`);
    });

    it('sends HTTP-Referer and X-Title headers', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(SUCCESS_RESPONSE),
      });
      vi.stubGlobal('fetch', fetchSpy);

      await callOpenRouter(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS);

      const callArgs = fetchSpy.mock.calls[0][1] as RequestInit;
      const headers = callArgs.headers as Record<string, string>;
      expect(headers['HTTP-Referer']).toContain('ticketeer');
      expect(headers['X-Title']).toBe('Ticketeer');
    });

    it('sends system and user messages in correct format', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(SUCCESS_RESPONSE),
      });
      vi.stubGlobal('fetch', fetchSpy);

      await callOpenRouter(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS);

      const callArgs = fetchSpy.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string) as {
        model: string;
        max_tokens: number;
        messages: Array<{ role: string; content: string }>;
      };
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[0].content).toBe(mockPrompt.systemPrompt);
      expect(body.messages[1].role).toBe('user');
      expect(body.messages[1].content).toBe(mockPrompt.userMessage);
      expect(body.model).toBe(MOCK_MODEL);
      expect(body.max_tokens).toBe(MOCK_MAX_TOKENS);
    });
  });

  describe('error handling', () => {
    it('throws AUTH_ERROR on 401', async () => {
      mockFetch(401, { error: { message: 'Invalid API key' } });

      await expect(
        callOpenRouter(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'AUTH_ERROR' });
    });

    it('throws AUTH_ERROR on 403', async () => {
      mockFetch(403, { error: { message: 'Forbidden' } });

      await expect(
        callOpenRouter(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'AUTH_ERROR' });
    });

    it('throws RATE_LIMIT on 429', async () => {
      mockFetch(429, { error: { message: 'Too many requests' } });

      await expect(
        callOpenRouter(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'RATE_LIMIT' });
    });

    it('throws API_ERROR on 500', async () => {
      mockFetch(500, { error: { message: 'Internal server error' } });

      await expect(
        callOpenRouter(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'API_ERROR' });
    });

    it('throws NETWORK_ERROR on fetch failure', async () => {
      mockFetchNetworkError();

      await expect(
        callOpenRouter(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'NETWORK_ERROR' });
    });

    it('throws NETWORK_ERROR with String(cause) when fetch rejects with non-Error value', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue('plain string network failure'));

      await expect(
        callOpenRouter(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'NETWORK_ERROR' });
    });

    it('throws API_ERROR on empty choices', async () => {
      mockFetch(200, { choices: [] });

      await expect(
        callOpenRouter(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'API_ERROR' });
    });

    it('throws CONTEXT_LENGTH when error message mentions context', async () => {
      mockFetch(400, { error: { message: 'context window exceeded for this model' } });

      await expect(
        callOpenRouter(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'CONTEXT_LENGTH' });
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
        callOpenRouter(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'AUTH_ERROR' });
    });
  });
});
