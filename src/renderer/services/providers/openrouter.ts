import type { BuiltPrompt } from '../../types/provider.types';
import type { TicketGenerationError } from '../../types/ticket.types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_REFERER = 'https://github.com/FatStinkyPanda/ticketeer';
const OPENROUTER_TITLE = 'Ticketeer';

interface OpenRouterMessage {
  role: 'system' | 'user';
  content: string;
}

interface OpenRouterRequestBody {
  model: string;
  max_tokens: number;
  messages: OpenRouterMessage[];
}

interface OpenRouterChoice {
  message: { content: string };
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
  error?: { message: string; code?: number };
}

/**
 * Call the OpenRouter API to generate a ticket.
 * Throws a TicketGenerationError on failure.
 */
export async function callOpenRouter(
  prompt: BuiltPrompt,
  model: string,
  apiKey: string,
  maxTokens: number,
): Promise<string> {
  const body: OpenRouterRequestBody = {
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: prompt.systemPrompt },
      { role: 'user', content: prompt.userMessage },
    ],
  };

  let response: Response;
  try {
    response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': OPENROUTER_REFERER,
        'X-Title': OPENROUTER_TITLE,
      },
      body: JSON.stringify(body),
    });
  } catch (cause) {
    const error: TicketGenerationError = {
      code: 'NETWORK_ERROR',
      message: 'Network error — check your internet connection and try again.',
      details: cause instanceof Error ? cause.message : String(cause),
    };
    throw error;
  }

  if (!response.ok) {
    /* v8 ignore next */
    await handleOpenRouterError(response);
    /* v8 ignore next */
  }

  const data = (await response.json()) as OpenRouterResponse;

  if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
    const error: TicketGenerationError = {
      code: 'API_ERROR',
      message: 'OpenRouter returned an empty response.',
    };
    throw error;
  }

  return data.choices[0].message.content;
}

async function handleOpenRouterError(response: Response): Promise<never> {
  let details: string | undefined;
  try {
    const errData = (await response.json()) as { error?: { message: string } };
    details = errData.error?.message;
  } catch {
    details = undefined;
  }

  if (response.status === 401 || response.status === 403) {
    const error: TicketGenerationError = {
      code: 'AUTH_ERROR',
      message: 'API key invalid or expired — check Settings.',
      details,
    };
    throw error;
  }

  if (response.status === 429) {
    const error: TicketGenerationError = {
      code: 'RATE_LIMIT',
      message: 'Rate limit reached. Please wait and try again.',
      details,
    };
    throw error;
  }

  if (details?.toLowerCase().includes('context')) {
    const error: TicketGenerationError = {
      code: 'CONTEXT_LENGTH',
      message:
        'The prompt exceeded the model\'s context limit. Try a shorter alert or a model with a larger context window.',
      details,
    };
    throw error;
  }

  const error: TicketGenerationError = {
    code: 'API_ERROR',
    message: `OpenRouter API error (${response.status}).`,
    details,
  };
  throw error;
}
