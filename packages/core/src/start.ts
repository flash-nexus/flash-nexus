import type { DnsConfig } from '@flash-dns/config'
import type { FlashNexusConfig } from '@flash-nexus/types'
import type { FlashTunnelConfig } from '@flash-tunnel/config'
import type { PreparedSessionResource, PreviewSession } from '@flash-tunnel/core'
import type { AdapterContext, TunnelHandle } from '@flash-tunnel/types'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import process, { loadEnvFile } from 'node:process'
import { createCloudflareAdapter } from '@flash-dns/adapter-cloudflare'
import { createDnsManager, resolveDnsConfig } from '@flash-dns/core'
import { loadFlashNexusConfig } from '@flash-nexus/config'
import { createCloudflareTunnel } from '@flash-tunnel/adapter-cloudflare'
import { startPreviewSession } from '@flash-tunnel/core'

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
    tunnel: {
      mode: config.tunnel?.mode,
      name: config.tunnel?.name,
      hostname: config.tunnel?.hostname ?? config.dns?.hostname,
    },
    providers: {
      cloudflare: {
        cloudflaredPath: config.tunnel?.cloudflaredPath,
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

  let hostname: string | undefined
  let zone: string | undefined
  let dnsManager: ReturnType<typeof createDnsManager<{ proxied?: boolean }>> | undefined
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
    const dnsAdapter = createCloudflareAdapter()
    dnsManager = createDnsManager({ adapter: dnsAdapter })
  }

  const tunnel = createCloudflareTunnel({
    cloudflaredPath: config.tunnel?.cloudflaredPath,
    originRequest: config.tunnel?.originRequest,
  })

  const tunnelConfig = tunnelConfigFor(config, options.localUrl)
  return startPreviewSession({
    cwd,
    config: tunnelConfig,
    adapters: { tunnel },
    mode,
    hostname,
    prepare: mode === 'named'
      ? createDnsPreparation({
          manager: dnsManager!,
          hostname: hostname!,
          zone: zone!,
        })
      : undefined,
    signal: options.signal,
    onLog: options.onLog,
    persist: config.tunnel?.persist,
    keep: config.tunnel?.keep,
    autoStopAfterMs: config.tunnel?.autoStopAfterMs,
    verifyTimeoutMs: config.tunnel?.verifyTimeoutMs,
  })
}

export function createDnsPreparation(options: {
  manager: ReturnType<typeof createDnsManager<{ proxied?: boolean }>>
  hostname: string
  zone: string
}): (ctx: AdapterContext, handle: TunnelHandle) => Promise<PreparedSessionResource> {
  return async (ctx, handle) => {
    if (!handle.target) {
      throw new Error('Named tunnel did not provide a DNS target')
    }
    const result = await options.manager.ensure({
      zone: options.zone,
      name: options.hostname,
      type: handle.target.type,
      content: handle.target.target,
      owner: { application: 'flash-nexus', id: ctx.sessionId },
      ttl: 'auto',
      providerOptions: handle.target.proxied === undefined
        ? {}
        : { proxied: handle.target.proxied },
    }, {
      signal: ctx.signal,
      requestId: ctx.sessionId,
    })

    return {
      provider: result.ref.provider,
      ref: result.ref,
      dispose: async () => {
        await options.manager.remove(result.ref, {
          signal: ctx.signal,
          requestId: ctx.sessionId,
        })
      },
    }
  }
}
