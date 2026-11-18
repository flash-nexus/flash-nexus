import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadFlashNexusConfig, resolveFlashNexusEnvironment } from '../src'

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

  it('resolves debug overrides before nexus and lower-level fallbacks', () => {
    const resolved = resolveFlashNexusEnvironment({
      FLASH_DEBUG_ZONE: 'debug.example.com',
      FLASH_NEXUS_ZONE: 'nexus.example.com',
      FLASH_DNS_ZONE: 'dns.example.com',
      FLASH_NEXUS_SUBDOMAIN: 'nexus-{rand:4}',
      FLASH_TUNNEL_SUBDOMAIN: 'tunnel-{rand:4}',
    }, 'debug')

    expect(resolved).toMatchObject({
      zone: 'debug.example.com',
      subdomain: 'nexus-{rand:4}',
      sources: {
        zone: 'FLASH_DEBUG_ZONE',
        subdomain: 'FLASH_NEXUS_SUBDOMAIN',
      },
    })
  })

  it('resolves nexus values before tunnel and dns fallbacks', () => {
    const resolved = resolveFlashNexusEnvironment({
      FLASH_NEXUS_ZONE: 'nexus.example.com',
      FLASH_DNS_ZONE: 'dns.example.com',
      FLASH_TUNNEL_SUBDOMAIN: 'tunnel-{rand:4}',
    })

    expect(resolved).toMatchObject({
      zone: 'nexus.example.com',
      subdomain: 'tunnel-{rand:4}',
      sources: {
        zone: 'FLASH_NEXUS_ZONE',
        subdomain: 'FLASH_TUNNEL_SUBDOMAIN',
      },
    })
  })
})
