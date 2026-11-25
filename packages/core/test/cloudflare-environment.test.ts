import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startFlashNexus } from '../src/start'

const { createDnsAdapter, createTunnelAdapter } = vi.hoisted(() => ({
  createDnsAdapter: vi.fn<(options: { env?: NodeJS.ProcessEnv }) => unknown>(),
  createTunnelAdapter: vi.fn<(options: { env?: NodeJS.ProcessEnv }) => unknown>(),
}))

vi.mock('@flash-dns/adapter-cloudflare', () => ({ createCloudflareAdapter: createDnsAdapter }))
vi.mock('@flash-dns/core', async importOriginal => ({
  ...await importOriginal<typeof import('@flash-dns/core')>(),
  createDnsManager: vi.fn(),
}))
vi.mock('@flash-tunnel/adapter-cloudflare', () => ({ createCloudflareTunnel: createTunnelAdapter }))
vi.mock('@flash-tunnel/core', () => ({
  startPreviewSession: vi.fn(),
}))

describe('credentials for Cloudflare named sessions', () => {
  let cwd: string
  const inherited = {
    CLOUDFLARE_API_TOKEN: 'inherited-token',
    CLOUDFLARE_ACCOUNT_ID: 'inherited-account',
    CLOUDFLARE_ZONE_ID: 'inherited-zone',
  }

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'flash-nexus-credentials-'))
    for (const [name, value] of Object.entries(inherited))
      vi.stubEnv(name, value)
    vi.clearAllMocks()
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    await rm(cwd, { recursive: true, force: true })
  })

  async function start(envFile?: string) {
    return startFlashNexus({
      cwd,
      envFile,
      config: {},
      localUrl: 'http://127.0.0.1:5173',
      mode: 'named',
      zone: 'example.com',
      hostname: 'preview.example.com',
    })
  }

  it('uses project credentials for both adapters without replacing the process credentials', async () => {
    const expected = {
      CLOUDFLARE_API_TOKEN: 'project-token',
      CLOUDFLARE_ACCOUNT_ID: 'project-account',
      CLOUDFLARE_ZONE_ID: 'project-zone',
    }
    await writeFile(join(cwd, '.env'), Object.entries(expected).map(([key, value]) => `${key}=${value}`).join('\n'))

    await start()

    expect(createDnsAdapter.mock.lastCall?.[0].env).toMatchObject(expected)
    expect(createTunnelAdapter.mock.lastCall?.[0].env).toBe(createDnsAdapter.mock.lastCall?.[0].env)
    expect(process.env).toMatchObject(inherited)
  })

  it('uses the selected env file and only falls back to process variables for missing keys', async () => {
    await writeFile(join(cwd, '.env'), 'CLOUDFLARE_API_TOKEN=default-file-token')
    await writeFile(join(cwd, 'preview.env'), 'CLOUDFLARE_API_TOKEN=preview-token\nCLOUDFLARE_ZONE_ID=')

    await start('preview.env')

    const expected = {
      ...inherited,
      CLOUDFLARE_API_TOKEN: 'preview-token',
      CLOUDFLARE_ZONE_ID: '',
    }
    expect(createDnsAdapter.mock.lastCall?.[0].env).toMatchObject(expected)
    expect(createTunnelAdapter.mock.lastCall?.[0].env).toMatchObject(expected)
  })

  it('uses process credentials when there is no env file', async () => {
    await start()

    expect(createDnsAdapter.mock.lastCall?.[0].env).toMatchObject(inherited)
    expect(createTunnelAdapter.mock.lastCall?.[0].env).toMatchObject(inherited)
  })

  it('keeps file credentials scoped to the session adapters', async () => {
    vi.stubEnv('CLOUDFLARE_API_TOKEN', undefined)
    await writeFile(join(cwd, '.env'), 'CLOUDFLARE_API_TOKEN=session-token')

    await start()

    expect(createDnsAdapter.mock.lastCall?.[0].env?.CLOUDFLARE_API_TOKEN).toBe('session-token')
    expect(createTunnelAdapter.mock.lastCall?.[0].env?.CLOUDFLARE_API_TOKEN).toBe('session-token')
    expect(process.env.CLOUDFLARE_API_TOKEN).toBeUndefined()
  })

  it.skipIf(process.platform !== 'win32')('uses case-insensitive credential keys on Windows', async () => {
    await writeFile(join(cwd, '.env'), 'cloudflare_api_token=project-token')

    await start()

    expect(createDnsAdapter.mock.lastCall?.[0].env).toMatchObject({
      ...inherited,
      CLOUDFLARE_API_TOKEN: 'project-token',
    })
  })

  it('keeps inherited values for ordinary variables and fills in missing ones', async () => {
    vi.stubEnv('FLASH_NEXUS_MODE', 'named')
    vi.stubEnv('FLASH_NEXUS_SUBDOMAIN', undefined)
    await writeFile(join(cwd, '.env'), 'FLASH_NEXUS_MODE=quick\nFLASH_NEXUS_SUBDOMAIN=preview')

    await start()

    expect(process.env.FLASH_NEXUS_MODE).toBe('named')
    expect(process.env.FLASH_NEXUS_SUBDOMAIN).toBe('preview')
  })

  it('reports a missing file if an explicit path was selected', async () => {
    await expect(start('missing.env')).rejects.toMatchObject({ code: 'ENOENT' })
    expect(createDnsAdapter).not.toHaveBeenCalled()
    expect(createTunnelAdapter).not.toHaveBeenCalled()
  })
})
