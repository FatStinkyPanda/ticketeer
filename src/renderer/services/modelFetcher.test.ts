import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchModelsForProvider,
  getCachedModels,
  clearModelCache,
} from './modelFetcher';

function makeFetch(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  clearModelCache();
  vi.restoreAllMocks();
});

describe('getCachedModels', () => {
  it('returns null when no cache entry exists', () => {
    expect(getCachedModels('anthropic', 'key')).toBeNull();
  });

  it('returns cached models after a successful fetch', async () => {
    global.fetch = makeFetch({ data: [{ id: 'm1', display_name: 'Model 1' }] });
    await fetchModelsForProvider('anthropic', 'sk-ant-key');
    expect(getCachedModels('anthropic', 'sk-ant-key')).toEqual([{ id: 'm1', name: 'Model 1' }]);
  });
});

describe('clearModelCache', () => {
  it('clears a specific provider+key entry', async () => {
    global.fetch = makeFetch({ data: [{ id: 'm1', display_name: 'M1' }] });
    await fetchModelsForProvider('anthropic', 'sk-ant-key');
    expect(getCachedModels('anthropic', 'sk-ant-key')).not.toBeNull();

    clearModelCache('anthropic', 'sk-ant-key');
    expect(getCachedModels('anthropic', 'sk-ant-key')).toBeNull();
  });

  it('clears entry when only provider is given (apiKey defaults to null)', async () => {
    global.fetch = makeFetch({ data: [{ id: 'or1', name: 'OR 1' }] });
    // Cache openrouter with apiKey=null (cacheKey = 'openrouter:')
    await fetchModelsForProvider('openrouter', null);
    expect(getCachedModels('openrouter', null)).not.toBeNull();

    // clearModelCache('openrouter') — apiKey param is undefined, ?? null covers that branch
    clearModelCache('openrouter');
    expect(getCachedModels('openrouter', null)).toBeNull();
  });

  it('clears the entire cache when called without arguments', async () => {
    global.fetch = makeFetch({ data: [{ id: 'm1', display_name: 'M1' }] });
    await fetchModelsForProvider('anthropic', 'sk-ant-key');

    global.fetch = makeFetch({ data: [{ id: 'or1', name: 'OR1' }] });
    await fetchModelsForProvider('openrouter', null);

    clearModelCache();
    expect(getCachedModels('anthropic', 'sk-ant-key')).toBeNull();
    expect(getCachedModels('openrouter', null)).toBeNull();
  });
});

describe('fetchModelsForProvider — cache hit', () => {
  it('returns cached result without calling fetch again', async () => {
    const fetchFn = makeFetch({ data: [{ id: 'm1', display_name: 'M1' }] });
    global.fetch = fetchFn;

    await fetchModelsForProvider('anthropic', 'sk-ant-key');
    await fetchModelsForProvider('anthropic', 'sk-ant-key');

    expect(fetchFn).toHaveBeenCalledOnce();
  });
});

describe('fetchModelsForProvider — anthropic', () => {
  it('throws when apiKey is null', async () => {
    await expect(fetchModelsForProvider('anthropic', null)).rejects.toThrow(
      'Anthropic API key required',
    );
  });

  it('maps display_name to name', async () => {
    global.fetch = makeFetch({
      data: [
        { id: 'claude-3', display_name: 'Claude 3' },
        { id: 'claude-4', display_name: 'Claude 4' },
      ],
    });
    const models = await fetchModelsForProvider('anthropic', 'sk-ant-key');
    expect(models).toEqual([
      { id: 'claude-3', name: 'Claude 3' },
      { id: 'claude-4', name: 'Claude 4' },
    ]);
  });

  it('falls back to id when display_name is missing', async () => {
    global.fetch = makeFetch({ data: [{ id: 'claude-unknown' }] });
    const models = await fetchModelsForProvider('anthropic', 'sk-ant-key');
    expect(models[0]).toEqual({ id: 'claude-unknown', name: 'claude-unknown' });
  });

  it('throws on non-ok response', async () => {
    global.fetch = makeFetch({}, false, 401);
    await expect(fetchModelsForProvider('anthropic', 'sk-ant-key')).rejects.toThrow(
      'Anthropic API error: 401',
    );
  });
});

describe('fetchModelsForProvider — gemini', () => {
  it('throws when apiKey is null', async () => {
    await expect(fetchModelsForProvider('gemini', null)).rejects.toThrow(
      'Gemini API key required',
    );
  });

  it('filters to generateContent-capable models and strips models/ prefix', async () => {
    global.fetch = makeFetch({
      models: [
        { name: 'models/gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/embedding-001', displayName: 'Embedding 001', supportedGenerationMethods: ['embedContent'] },
        { name: 'models/gemini-1.5-pro', displayName: 'Gemini 1.5 Pro', supportedGenerationMethods: ['generateContent'] },
      ],
    });
    const models = await fetchModelsForProvider('gemini', 'AIzaKey');
    expect(models).toEqual([
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    ]);
  });

  it('falls back to id when displayName is missing', async () => {
    global.fetch = makeFetch({
      models: [
        { name: 'models/gemini-x', supportedGenerationMethods: ['generateContent'] },
      ],
    });
    const models = await fetchModelsForProvider('gemini', 'AIzaKey');
    expect(models[0]).toEqual({ id: 'gemini-x', name: 'gemini-x' });
  });

  it('throws on non-ok response', async () => {
    global.fetch = makeFetch({}, false, 403);
    await expect(fetchModelsForProvider('gemini', 'AIzaKey')).rejects.toThrow(
      'Gemini API error: 403',
    );
  });
});

describe('fetchModelsForProvider — openrouter', () => {
  it('fetches without auth header when apiKey is null', async () => {
    const fetchFn = makeFetch({ data: [{ id: 'or/model1', name: 'OR Model 1' }] });
    global.fetch = fetchFn;
    const models = await fetchModelsForProvider('openrouter', null);
    expect(models).toEqual([{ id: 'or/model1', name: 'OR Model 1', isFree: false }]);
    const callHeaders = fetchFn.mock.calls[0][1].headers as Record<string, string>;
    expect(callHeaders['Authorization']).toBeUndefined();
  });

  it('adds Authorization header when apiKey is provided', async () => {
    const fetchFn = makeFetch({ data: [{ id: 'or/model1', name: 'OR Model 1' }] });
    global.fetch = fetchFn;
    await fetchModelsForProvider('openrouter', 'sk-or-key');
    const callHeaders = fetchFn.mock.calls[0][1].headers as Record<string, string>;
    expect(callHeaders['Authorization']).toBe('Bearer sk-or-key');
  });

  it('marks free models when pricing prompt and completion are "0"', async () => {
    global.fetch = makeFetch({
      data: [
        { id: 'free/model', name: 'Free Model', pricing: { prompt: '0', completion: '0' } },
        { id: 'paid/model', name: 'Paid Model', pricing: { prompt: '0.01', completion: '0.02' } },
        { id: 'noprice/model', name: 'No Price Model' },
      ],
    });
    const models = await fetchModelsForProvider('openrouter', null);
    expect(models[0].isFree).toBe(true);
    expect(models[1].isFree).toBe(false);
    // When pricing is absent, isFree evaluates to false (undefined === '0' is false)
    expect(models[2].isFree).toBe(false);
  });

  it('throws on non-ok response', async () => {
    global.fetch = makeFetch({}, false, 500);
    await expect(fetchModelsForProvider('openrouter', null)).rejects.toThrow(
      'OpenRouter API error: 500',
    );
  });
});
