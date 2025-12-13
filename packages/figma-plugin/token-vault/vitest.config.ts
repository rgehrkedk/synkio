import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/backend/**/*.ts', 'src/ui/**/*.ts'],
      exclude: [
        'src/backend/**/*.test.ts',
        'src/ui/**/*.test.ts',
        'src/types/**/*.ts',
        'src/code.ts', // Entry point, tested via integration
        'src/ui/index.ts' // Entry point
      ]
    }
  }
});
