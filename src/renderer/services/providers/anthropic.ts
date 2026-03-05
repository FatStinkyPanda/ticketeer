import type { BuiltPrompt } from '../../types/provider.types';
import type { TicketGenerationError } from '../../types/ticket.types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';

interface AnthropicRequestBody {
  model: string;
  max_tokens: number;
  system: string;
  messages: Array<{ role: 'user'; content: string }>;
}

interface AnthropicContentBlock {
  type: string;
  text: string;
}

interface AnthropicResponse {
  content: AnthropicContentBlock[];
  error?: { type: string; message: string };
}

/**
 * Call the Anthropic Claude API to generate a ticket.
 * Throws a TicketGenerationError on failure.
 */
export async function callAnthropic(
  prompt: BuiltPrompt,
  model: string,
  apiKey: string,
  maxTokens: number,
): Promise<string> {
  const body: AnthropicRequestBody = {
    model,
    max_tokens: maxTokens,
    system: prompt.systemPrompt,
    messages: [{ role: 'user', content: prompt.userMessage }],
  };

  let response: Response;
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_API_VERSION,
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
    await handleAnthropicError(response);
    /* v8 ignore next */
  }

  const data = (await response.json()) as AnthropicResponse;

  if (!data.content || data.content.length === 0 || !data.content[0].text) {
    const error: TicketGenerationError = {
      code: 'API_ERROR',
      message: 'Anthropic returned an empty response.',
    };
    throw error;
  }

  return data.content[0].text;
}

async function handleAnthropicError(response: Response): Promise<never> {
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

  if (response.status === 400 && details?.toLowerCase().includes('context')) {
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
    message: `Anthropic API error (${response.status}).`,
    details,
  };
  throw error;
}
