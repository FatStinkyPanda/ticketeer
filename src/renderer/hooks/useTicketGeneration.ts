import { useTicketStore } from '../store/ticketStore';
import { useSettingsStore } from '../store/settingsStore';
import { validateAlertData } from '../services/piiGuard';
import { buildPrompt } from '../services/promptBuilder';
import { routeToProvider } from '../services/providers/providerRouter';
import type { AlertData } from '../types/alert.types';
import type { TicketGenerationError } from '../types/ticket.types';

/**
 * Hook that orchestrates the full ticket generation pipeline:
 * 1. PII Guard validation
 * 2. Prompt building
 * 3. Provider routing & API call
 * 4. State updates (loading, ticket, error)
 */
export function useTicketGeneration() {
  const ticketStore = useTicketStore();

  const generateTicket = async (formData: AlertData): Promise<void> => {
    // Reset previous state — order matters: setError sets isLoading:false internally,
    // so setLoading(true) must come last to survive React 18 batching.
    ticketStore.setError(null);
    ticketStore.setLoading(true);

    // Step 1: PII Guard
    const piiResult = validateAlertData(formData);
    if (!piiResult.valid) {
      const error: TicketGenerationError = {
        code: 'PII_VIOLATION',
        message: 'PII validation failed. Review the highlighted fields before submitting.',
        details: piiResult.errors
          .filter((e) => e.severity === 'error')
          .map((e) => e.message)
          .join('; '),
      };
      ticketStore.setError(error);
      return;
    }

    // Step 2: Get provider/model/key
    const currentSettings = useSettingsStore.getState();
    const provider = currentSettings.lastProvider;
    const model = currentSettings.lastModel;

    if (!provider || !model) {
      const error: TicketGenerationError = {
        code: 'API_ERROR',
        message: 'No AI provider or model selected. Go to Settings to configure.',
      };
      ticketStore.setError(error);
      return;
    }

    let apiKey: string | null = null;
    switch (provider) {
      case 'anthropic':
        apiKey = currentSettings.anthropicApiKey;
        break;
      case 'gemini':
        apiKey = currentSettings.geminiApiKey;
        break;
      case 'openrouter':
        apiKey = currentSettings.openrouterApiKey;
        break;
    }

    if (!apiKey) {
      const error: TicketGenerationError = {
        code: 'AUTH_ERROR',
        message: `No API key configured for ${provider}. Go to Settings to add your API key.`,
      };
      ticketStore.setError(error);
      return;
    }

    // Step 3: Build prompt
    const prompt = buildPrompt(formData);

    // Step 4: Route to provider
    try {
      const rawTicketText = await routeToProvider({
        provider,
        model,
        prompt,
        apiKey,
        maxTokens: currentSettings.maxOutputTokens,
      });

      ticketStore.setTicket({
        content: rawTicketText,
        provider,
        model,
        generatedAt: new Date(),
      });
    } catch (cause) {
      const error = cause as TicketGenerationError;
      ticketStore.setError(
        error?.code
          ? error
          : {
              code: 'API_ERROR',
              message: 'An unexpected error occurred. Please try again.',
              details: cause instanceof Error ? cause.message : String(cause),
            },
      );
    }
  };

  return {
    ticket: ticketStore.ticket,
    isLoading: ticketStore.isLoading,
    error: ticketStore.error,
    generateTicket,
    clearTicket: ticketStore.clearTicket,
    setError: ticketStore.setError,
  };
}
