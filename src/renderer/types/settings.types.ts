import type { ProviderId } from './provider.types';

export type Theme = 'light' | 'dark' | 'system';

export interface TicketeerSettings {
  anthropicApiKey: string | null;
  geminiApiKey: string | null;
  openrouterApiKey: string | null;
  lastProvider: ProviderId | null;
  lastModel: string | null;
  theme: Theme;
  maxOutputTokens: number;
}

export type SettingKey = keyof TicketeerSettings;

export const DEFAULT_SETTINGS: TicketeerSettings = {
  anthropicApiKey: null,
  geminiApiKey: null,
  openrouterApiKey: null,
  lastProvider: null,
  lastModel: null,
  theme: 'system',
  maxOutputTokens: 64000,
};
