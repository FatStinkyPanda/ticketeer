export interface TicketResult {
  content: string;
  provider: string;
  model: string;
  generatedAt: Date;
}

export interface TicketGenerationState {
  ticket: TicketResult | null;
  isLoading: boolean;
  error: TicketGenerationError | null;
}

export type TicketErrorCode =
  | 'AUTH_ERROR'
  | 'RATE_LIMIT'
  | 'CONTEXT_LENGTH'
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'PII_VIOLATION';

export interface TicketGenerationError {
  code: TicketErrorCode;
  message: string;
  details?: string;
}
