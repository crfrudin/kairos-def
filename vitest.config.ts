// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',

    // Rodar testes do projeto (inclui middleware)
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],

    // Excluir diretórios que não devem rodar em CI
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/_disabled/**',
    ],

    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),

      // Evita erro "Cannot find package 'server-only'" no Vitest/Node
      'server-only': path.resolve(__dirname, './src/test/stubs/server-only.ts'),
    },
  },
});
