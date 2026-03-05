import type { ApiCallParams } from '../../types/provider.types';
import type { TicketGenerationError } from '../../types/ticket.types';
import { callAnthropic } from './anthropic';
import { callGemini } from './gemini';
import { callOpenRouter } from './openrouter';

/**
 * Provider router — dispatches an API call to the correct provider client
 * based on the selected provider ID.
 */
export async function routeToProvider(params: ApiCallParams): Promise<string> {
  const { provider, model, prompt, apiKey, maxTokens } = params;

  switch (provider) {
    case 'anthropic':
      return callAnthropic(prompt, model, apiKey, maxTokens);

    case 'gemini':
      return callGemini(prompt, model, apiKey, maxTokens);

    case 'openrouter':
      return callOpenRouter(prompt, model, apiKey, maxTokens);

    default: {
      const error: TicketGenerationError = {
        code: 'API_ERROR',
        message: `Unknown provider: "${String(provider)}". Check your settings.`,
      };
      throw error;
    }
  }
}
