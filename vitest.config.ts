import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@flash-nexus/config': `${root}packages/config/src/index.ts`,
      '@flash-nexus/core': `${root}packages/core/src/index.ts`,
      '@flash-nexus/sdk': `${root}packages/sdk/src/index.ts`,
      '@flash-nexus/types': `${root}packages/types/src/index.ts`,
    },
  },
})
