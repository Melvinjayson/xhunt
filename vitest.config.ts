import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // ignoreConfigErrors: skip stray tsconfig.json files under .agents/.claude templates.
  plugins: [tsconfigPaths({ ignoreConfigErrors: true })],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
