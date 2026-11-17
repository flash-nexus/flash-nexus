import type { DnsConfig } from '@flash-dns/config'
import type { FlashNexusConfig } from '@flash-nexus/types'
import type { FlashTunnelConfig } from '@flash-tunnel/config'
import type { PreviewSession } from '@flash-tunnel/core'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import process, { loadEnvFile } from 'node:process'
import { createCloudflareAdapter } from '@flash-dns/adapter-cloudflare'
import { createDnsManager, resolveDnsConfig } from '@flash-dns/core'
import { loadFlashNexusConfig } from '@flash-nexus/config'
import { createCloudflareTunnel } from '@flash-tunnel/adapter-cloudflare'
import { startPreviewSession } from '@flash-tunnel/core'
import { createFlashDnsAdapter } from './dns-adapter'

export interface FlashNexusStartOptions {
  cwd?: string
  envFile?: string
  config?: FlashNexusConfig
  localUrl?: string
  mode?: FlashNexusConfig['tunnel'] extends infer T
    ? T extends { mode?: infer M } ? M : never
    : never
  hostname?: string
  zone?: string
  signal?: AbortSignal
  onLog?: (line: string, stream: 'stdout' | 'stderr') => void
}

function loadEnvironment(envFile: string | undefined, cwd: string): void {
  const file = envFile
    ? resolve(cwd, envFile)
    : resolve(cwd, '.env')
  if (envFile || existsSync(file)) {
    loadEnvFile(file)
  }
}

function dnsConfigFor(config: FlashNexusConfig): DnsConfig {
  return {
    provider: config.dns?.provider,
    zone: config.dns?.zone ?? config.tunnel?.zone,
    hostname: config.dns?.hostname ?? config.tunnel?.hostname,
    project: config.project,
    naming: config.dns?.naming,
    variables: config.dns?.variables,
    record: {
      type: 'CNAME',
      ttl: config.dns?.record?.ttl,
    },
    providers: config.dns?.providers,
  }
}

function tunnelConfigFor(config: FlashNexusConfig, localUrl?: string): FlashTunnelConfig {
  return {
    server: {
      ...config.server,
      ...(localUrl
        ? { url: localUrl, command: undefined, dir: undefined }
        : {}),
    },
    domain: {
      zone: config.dns?.zone ?? config.tunnel?.zone,
    },
    tunnel: {
      mode: config.tunnel?.mode,
      name: config.tunnel?.name,
    },
    providers: {
      cloudflare: {
        accountId: config.providers?.cloudflare?.accountId,
        zoneId: config.providers?.cloudflare?.zoneId,
        cloudflaredPath: config.tunnel?.cloudflaredPath ?? config.providers?.cloudflare?.cloudflaredPath,
        originRequest: config.tunnel?.originRequest,
      },
    },
  }
}

export async function startFlashNexus(options: FlashNexusStartOptions = {}): Promise<PreviewSession> {
  const cwd = resolve(options.cwd ?? process.cwd())
  loadEnvironment(options.envFile, cwd)
  const loaded = options.config
    ? { config: options.config }
    : await loadFlashNexusConfig({ cwd, envFile: options.envFile })
  const config = loaded.config
  const mode = options.mode ?? config.tunnel?.mode ?? 'named'
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  const cloudflare = config.providers?.cloudflare

  let hostname: string | undefined
  let zone: string | undefined
  let dns: ReturnType<typeof createFlashDnsAdapter> | undefined
  if (mode === 'named') {
    const resolvedDns = resolveDnsConfig({
      cwd,
      config: dnsConfigFor(config),
      env: process.env,
      cli: {
        hostname: options.hostname,
        zone: options.zone,
      },
    })
    hostname = resolvedDns.hostname
    zone = resolvedDns.zone
    const dnsAdapter = createCloudflareAdapter({
      apiToken: apiToken ?? '',
      zoneId: resolvedDns.zoneId ?? cloudflare?.zoneId,
    })
    dns = createFlashDnsAdapter({
      manager: createDnsManager({ adapter: dnsAdapter }),
    })
  }

  const tunnel = createCloudflareTunnel({
    accountId: cloudflare?.accountId,
    apiToken,
    cloudflaredPath: config.tunnel?.cloudflaredPath ?? cloudflare?.cloudflaredPath,
    originRequest: config.tunnel?.originRequest,
  })

  const tunnelConfig = tunnelConfigFor(config, options.localUrl)
  return startPreviewSession({
    cwd,
    config: tunnelConfig,
    adapters: { tunnel, dns },
    mode,
    hostname,
    zone,
    signal: options.signal,
    onLog: options.onLog,
    persist: config.tunnel?.persist,
    keep: config.tunnel?.keep,
    overwrite: config.tunnel?.overwrite,
    autoStopAfterMs: config.tunnel?.autoStopAfterMs,
    verifyTimeoutMs: config.tunnel?.verifyTimeoutMs,
  })
}
