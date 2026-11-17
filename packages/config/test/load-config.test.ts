import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadFlashNexusConfig } from '../src'

describe('loadFlashNexusConfig', () => {
  it('resolves config files that import defineConfig from flash-nexus', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'flash-nexus-config-'))
    try {
      await writeFile(join(cwd, 'flash-nexus.config.ts'), `
        import { defineConfig } from 'flash-nexus'

        export default defineConfig({
          tunnel: { mode: 'quick' }
        })
      `)

      const result = await loadFlashNexusConfig({ cwd })
      expect(result.config).toEqual({
        tunnel: { mode: 'quick' },
      })
    }
    finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })
})
