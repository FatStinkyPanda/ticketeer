import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useModelList } from './useModelList';
import { PROVIDERS } from '../constants/providers';

// Mock the entire modelFetcher module for full control over cache + fetch
vi.mock('../services/modelFetcher', () => ({
  getCachedModels: vi.fn().mockReturnValue(null),
  fetchModelsForProvider: vi.fn(),
  clearModelCache: vi.fn(),
}));

import * as modelFetcher from '../services/modelFetcher';

const anthropicFallback = PROVIDERS.find((p) => p.id === 'anthropic')!.models;
const openrouterFallback = PROVIDERS.find((p) => p.id === 'openrouter')!.models;

beforeEach(() => {
  vi.mocked(modelFetcher.getCachedModels).mockReturnValue(null);
  vi.mocked(modelFetcher.fetchModelsForProvider).mockReset();
});

describe('useModelList — provider is null', () => {
  it('returns empty models, not loading, no error', () => {
    const { result } = renderHook(() => useModelList(null, null));
    expect(result.current.models).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isFallback).toBe(false);
  });
});

describe('useModelList — no API key for anthropic', () => {
  it('returns fallback models immediately without fetching', () => {
    const { result } = renderHook(() => useModelList('anthropic', null));
    expect(result.current.models).toEqual(anthropicFallback);
    expect(result.current.loading).toBe(false);
    expect(result.current.isFallback).toBe(true);
    expect(modelFetcher.fetchModelsForProvider).not.toHaveBeenCalled();
  });
});

describe('useModelList — no API key for gemini', () => {
  it('returns fallback models immediately without fetching', () => {
    const { result } = renderHook(() => useModelList('gemini', null));
    expect(result.current.loading).toBe(false);
    expect(result.current.isFallback).toBe(true);
    expect(modelFetcher.fetchModelsForProvider).not.toHaveBeenCalled();
  });
});

describe('useModelList — cache hit', () => {
  it('returns cached models synchronously without loading', () => {
    vi.mocked(modelFetcher.getCachedModels).mockReturnValue([
      { id: 'cached-1', name: 'Cached 1' },
    ]);
    const { result } = renderHook(() => useModelList('openrouter', null));
    expect(result.current.loading).toBe(false);
    expect(result.current.models).toEqual([{ id: 'cached-1', name: 'Cached 1' }]);
    expect(result.current.isFallback).toBe(false);
    expect(modelFetcher.fetchModelsForProvider).not.toHaveBeenCalled();
  });
});

describe('useModelList — successful fetch', () => {
  it('transitions from loading to loaded state', async () => {
    const fetched = [{ id: 'or-model', name: 'OR Model', isFree: true }];
    vi.mocked(modelFetcher.fetchModelsForProvider).mockResolvedValue(fetched);

    const { result } = renderHook(() => useModelList('openrouter', null));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.models).toEqual(fetched);
    expect(result.current.error).toBeNull();
    expect(result.current.isFallback).toBe(false);
  });

  it('fetches for openrouter even without an API key', async () => {
    vi.mocked(modelFetcher.fetchModelsForProvider).mockResolvedValue([
      { id: 'or-1', name: 'OR 1' },
    ]);
    const { result } = renderHook(() => useModelList('openrouter', null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(modelFetcher.fetchModelsForProvider).toHaveBeenCalledWith('openrouter', null);
  });
});

describe('useModelList — fetch error', () => {
  it('shows error and falls back to static models', async () => {
    vi.mocked(modelFetcher.fetchModelsForProvider).mockRejectedValue(
      new Error('Network failure'),
    );

    const { result } = renderHook(() => useModelList('openrouter', null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network failure');
    expect(result.current.models).toEqual(openrouterFallback);
    expect(result.current.isFallback).toBe(true);
  });

  it('uses generic message for non-Error rejection', async () => {
    vi.mocked(modelFetcher.fetchModelsForProvider).mockRejectedValue('string-error');

    const { result } = renderHook(() => useModelList('openrouter', null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Failed to fetch models');
  });
});

describe('useModelList — refreshTrigger', () => {
  it('re-fetches when refreshTrigger increments (cache cleared between)', async () => {
    vi.mocked(modelFetcher.fetchModelsForProvider).mockResolvedValue([
      { id: 'or-1', name: 'OR 1' },
    ]);

    const { result, rerender } = renderHook(
      ({ trigger }: { trigger: number }) => useModelList('openrouter', null, trigger),
      { initialProps: { trigger: 0 } },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(modelFetcher.fetchModelsForProvider).toHaveBeenCalledTimes(1);

    // Simulate cache cleared + trigger bump
    vi.mocked(modelFetcher.getCachedModels).mockReturnValue(null);
    rerender({ trigger: 1 });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(modelFetcher.fetchModelsForProvider).toHaveBeenCalledTimes(2);
  });
});

describe('useModelList — cancellation', () => {
  it('does not update state after unmount (cancelled closure)', async () => {
    let resolvePromise!: (v: typeof openrouterFallback) => void;
    const pendingFetch = new Promise<typeof openrouterFallback>((r) => {
      resolvePromise = r;
    });
    vi.mocked(modelFetcher.fetchModelsForProvider).mockReturnValue(pendingFetch);

    const { result, unmount } = renderHook(() => useModelList('openrouter', null));
    expect(result.current.loading).toBe(true);

    unmount();

    // Resolve after unmount — should not throw or update
    await act(async () => {
      resolvePromise([{ id: 'late', name: 'Late' }]);
      await pendingFetch;
    });
    // No state assertion — just verifying no React warning/error is thrown
  });

  it('does not update state after error resolution following unmount', async () => {
    let rejectPromise!: (err: unknown) => void;
    const pendingFetch = new Promise<never>((_r, reject) => {
      rejectPromise = reject;
    });
    vi.mocked(modelFetcher.fetchModelsForProvider).mockReturnValue(pendingFetch);

    const { unmount } = renderHook(() => useModelList('openrouter', null));
    unmount();

    await act(async () => {
      rejectPromise(new Error('late error'));
      await pendingFetch.catch(() => {});
    });
    // No state assertion — just verifying no React warning/error is thrown
  });
});
