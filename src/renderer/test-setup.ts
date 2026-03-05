import '@testing-library/jest-dom';

// Mock window.matchMedia — not available in jsdom.
// Use a plain function (not vi.fn) so vi.restoreAllMocks() cannot clear it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
