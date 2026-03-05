export type ProviderId = 'anthropic' | 'gemini' | 'openrouter';

export interface ProviderModel {
  id: string;
  name: string;
  isFree?: boolean;
}

export interface Provider {
  id: ProviderId;
  name: string;
  apiKeySettingKey: ApiKeySettingKey;
  apiKeyPrefix: string;
  models: ProviderModel[];
}

export type ApiKeySettingKey = 'anthropicApiKey' | 'geminiApiKey' | 'openrouterApiKey';

export interface BuiltPrompt {
  systemPrompt: string;
  userMessage: string;
}

export interface ApiCallParams {
  provider: ProviderId;
  model: string;
  prompt: BuiltPrompt;
  apiKey: string;
  maxTokens: number;
}
