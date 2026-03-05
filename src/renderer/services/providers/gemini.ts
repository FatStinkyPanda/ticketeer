import type { BuiltPrompt } from '../../types/provider.types';
import type { TicketGenerationError } from '../../types/ticket.types';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role?: string;
  parts: GeminiPart[];
}

interface GeminiRequestBody {
  system_instruction: { parts: GeminiPart[] };
  contents: GeminiContent[];
  generationConfig: { maxOutputTokens: number };
}

interface GeminiCandidate {
  content: { parts: GeminiPart[] };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: { message: string; status: string };
  promptFeedback?: { blockReason?: string };
}

/**
 * Call the Google Gemini API to generate a ticket.
 * Throws a TicketGenerationError on failure.
 */
export async function callGemini(
  prompt: BuiltPrompt,
  model: string,
  apiKey: string,
  maxTokens: number,
): Promise<string> {
  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;

  const body: GeminiRequestBody = {
    system_instruction: {
      parts: [{ text: prompt.systemPrompt }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt.userMessage }],
      },
    ],
    generationConfig: {
      maxOutputTokens: maxTokens,
    },
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    await handleGeminiError(response);
    /* v8 ignore next */
  }

  const data = (await response.json()) as GeminiResponse;

  if (
    !data.candidates ||
    data.candidates.length === 0 ||
    !data.candidates[0].content?.parts?.[0]?.text
  ) {
    const blockReason = data.promptFeedback?.blockReason;
    const error: TicketGenerationError = {
      code: 'API_ERROR',
      message: blockReason
        ? `Gemini blocked the request: ${blockReason}.`
        : 'Gemini returned an empty response.',
    };
    throw error;
  }

  return data.candidates[0].content.parts[0].text;
}

async function handleGeminiError(response: Response): Promise<never> {
  let details: string | undefined;
  let status: string | undefined;
  try {
    const errData = (await response.json()) as { error?: { message: string; status: string } };
    details = errData.error?.message;
    status = errData.error?.status;
  } catch {
    details = undefined;
  }

  if (response.status === 400 && status === 'INVALID_ARGUMENT') {
    // Gemini may return 400 for invalid API key or bad request
    const error: TicketGenerationError = {
      code: 'API_ERROR',
      message: 'Gemini rejected the request. Check that your API key is valid.',
      details,
    };
    throw error;
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
    message: `Gemini API error (${response.status}).`,
    details,
  };
  throw error;
}
