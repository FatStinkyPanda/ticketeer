import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    // Ensure React's development build is always loaded during tests.
    // Without this, an unset system NODE_ENV can cause Vite to bundle
    // react.production.min.js, which throws on act() usage.
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/renderer/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/renderer/**/*.{ts,tsx}'],
      exclude: [
        'src/renderer/main.tsx',
        'src/renderer/test-setup.ts',
        'src/renderer/**/*.d.ts',
        'src/renderer/**/*.test.{ts,tsx}',
        'src/renderer/**/*.test.ts',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
    },
  },
});
