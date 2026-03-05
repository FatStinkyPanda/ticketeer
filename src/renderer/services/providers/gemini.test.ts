import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callGemini } from './gemini';
import type { BuiltPrompt } from '../../types/provider.types';
import type { TicketGenerationError } from '../../types/ticket.types';

const mockPrompt: BuiltPrompt = {
  systemPrompt: 'You are a security ticket agent.',
  userMessage: 'Generate a ticket for: ET EXPLOIT Apache log4j',
};

const MOCK_API_KEY = 'AIzaSyTestGeminiKey123456789';
const MOCK_MODEL = 'gemini-2.0-flash';
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
  candidates: [
    {
      content: {
        parts: [{ text: '=== TICKET ===\nGenerated ticket content' }],
      },
    },
  ],
};

describe('callGemini', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful call', () => {
    it('returns ticket text from response.candidates[0].content.parts[0].text', async () => {
      mockFetch(200, SUCCESS_RESPONSE);

      const result = await callGemini(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS);
      expect(result).toBe('=== TICKET ===\nGenerated ticket content');
    });

    it('calls the correct Gemini endpoint with model and API key', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(SUCCESS_RESPONSE),
      });
      vi.stubGlobal('fetch', fetchSpy);

      await callGemini(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS);

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('generativelanguage.googleapis.com');
      expect(calledUrl).toContain(MOCK_MODEL);
      expect(calledUrl).toContain(MOCK_API_KEY);
    });

    it('sends system_instruction and contents in request body', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(SUCCESS_RESPONSE),
      });
      vi.stubGlobal('fetch', fetchSpy);

      await callGemini(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS);

      const callArgs = fetchSpy.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(callArgs.body as string) as {
        system_instruction: { parts: Array<{ text: string }> };
        contents: Array<{ role: string; parts: Array<{ text: string }> }>;
        generationConfig: { maxOutputTokens: number };
      };
      expect(body.system_instruction.parts[0].text).toBe(mockPrompt.systemPrompt);
      expect(body.contents[0].parts[0].text).toBe(mockPrompt.userMessage);
      expect(body.generationConfig.maxOutputTokens).toBe(MOCK_MAX_TOKENS);
    });
  });

  describe('error handling', () => {
    it('throws AUTH_ERROR on 401', async () => {
      mockFetch(401, { error: { message: 'Unauthorized' } });

      await expect(
        callGemini(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'AUTH_ERROR' });
    });

    it('throws AUTH_ERROR on 403', async () => {
      mockFetch(403, { error: { message: 'Forbidden' } });

      await expect(
        callGemini(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'AUTH_ERROR' });
    });

    it('throws RATE_LIMIT on 429', async () => {
      mockFetch(429, { error: { message: 'Rate limit' } });

      await expect(
        callGemini(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'RATE_LIMIT' });
    });

    it('throws API_ERROR on 500', async () => {
      mockFetch(500, { error: { message: 'Internal server error' } });

      await expect(
        callGemini(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'API_ERROR' });
    });

    it('throws NETWORK_ERROR on fetch failure', async () => {
      mockFetchNetworkError();

      await expect(
        callGemini(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'NETWORK_ERROR' });
    });

    it('throws NETWORK_ERROR with String(cause) when fetch rejects with non-Error value', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue('plain string network failure'));

      await expect(
        callGemini(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'NETWORK_ERROR' });
    });

    it('throws API_ERROR on empty candidates', async () => {
      mockFetch(200, { candidates: [] });

      await expect(
        callGemini(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'API_ERROR' });
    });

    it('throws API_ERROR with blockReason when response is blocked', async () => {
      mockFetch(200, {
        candidates: [],
        promptFeedback: { blockReason: 'SAFETY' },
      });

      await expect(
        callGemini(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({
        code: 'API_ERROR',
        message: expect.stringContaining('SAFETY'),
      });
    });

    it('throws API_ERROR on 400 INVALID_ARGUMENT', async () => {
      mockFetch(400, { error: { message: 'Invalid argument', status: 'INVALID_ARGUMENT' } });

      await expect(
        callGemini(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'API_ERROR' });
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
        callGemini(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'AUTH_ERROR' });
    });

    it('throws CONTEXT_LENGTH when error message mentions context (non-400 status)', async () => {
      mockFetch(500, { error: { message: 'context length exceeded', status: 'RESOURCE_EXHAUSTED' } });

      await expect(
        callGemini(mockPrompt, MOCK_MODEL, MOCK_API_KEY, MOCK_MAX_TOKENS),
      ).rejects.toMatchObject<TicketGenerationError>({ code: 'CONTEXT_LENGTH' });
    });
  });
});
