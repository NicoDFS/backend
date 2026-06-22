import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  // Backend has no CSS; override so Vite does not try to load Next's
  // postcss.config.mjs (a Next-only plugin shape Vite cannot parse).
  css: {
    postcss: { plugins: [] },
  },
  test: {
    globals: true,
    environment: 'node',
    // Only look under src/ — keeps the scanner away from node_modules,
    // .next, and the root-owned subgraphs/data/postgres docker volume.
    dir: 'src',
    include: ['**/__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', 'subgraphs/**'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
