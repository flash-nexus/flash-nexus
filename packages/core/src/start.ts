import type { DnsConfig } from '@flash-dns/config'
import type { FlashNexusConfig } from '@flash-nexus/types'
import type { FlashTunnelConfig } from '@flash-tunnel/config'
import type { PreparedSessionResource, PreviewSession } from '@flash-tunnel/core'
import type { AdapterContext, TunnelHandle } from '@flash-tunnel/types'
import { randomInt } from 'node:crypto'
import { resolve } from 'node:path'
import process from 'node:process'
import { createCloudflareAdapter } from '@flash-dns/adapter-cloudflare'
import { createDnsManager, resolveDnsConfig } from '@flash-dns/core'
import { loadFlashNexusConfig, resolveFlashNexusEnvironment } from '@flash-nexus/config'
import { createCloudflareTunnel } from '@flash-tunnel/adapter-cloudflare'
import { startPreviewSession } from '@flash-tunnel/core'
import { loadSessionEnvironment, resolveCloudflareEnvironment } from './session-environment'

export interface FlashNexusStartOptions {
  cwd?: string
  envFile?: string
  config?: FlashNexusConfig
  localUrl?: string
  mode?: FlashNexusConfig['tunnel'] extends infer T
    ? T extends { mode?: infer M } ? M : never
    : never
  hostname?: string
  subdomain?: string
  zone?: string
  cloudflaredPath?: string
  signal?: AbortSignal
  onLog?: (line: string, stream: 'stdout' | 'stderr') => void
}

const SUBDOMAIN_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

function resolveSubdomain(template = 'fd-{rand:4}'): string {
  const resolved = template.replace(/\{rand(?::(\d+))?\}/g, (_match, length: string | undefined) => {
    const size = Number(length ?? 4)
    return Array.from({ length: size }, () => SUBDOMAIN_ALPHABET[randomInt(SUBDOMAIN_ALPHABET.length)]).join('')
  })
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(resolved)) {
    throw new TypeError(`Invalid subdomain template "${template}"`)
  }
  return resolved
}

function createHostname(zone: string, subdomain?: string): string {
  return `${resolveSubdomain(subdomain)}.${zone}`
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

function tunnelConfigFor(config: FlashNexusConfig, localUrl: string | undefined, mode: 'named' | 'quick', hostname: string | undefined, cloudflaredPath: string | undefined): FlashTunnelConfig {
  return {
    server: {
      ...config.server,
      ...(localUrl
        ? { url: localUrl, command: undefined, dir: undefined }
        : {}),
    },
    tunnel: {
      mode,
      name: config.tunnel?.name,
      hostname,
    },
    providers: {
      cloudflare: {
        cloudflaredPath,
        originRequest: config.tunnel?.originRequest,
      },
    },
  }
}

export async function startFlashNexus(options: FlashNexusStartOptions = {}): Promise<PreviewSession> {
  const cwd = resolve(options.cwd ?? process.cwd())
  const projectCredentials = loadSessionEnvironment(cwd, options.envFile)
  const loaded = options.config
    ? { config: options.config }
    : await loadFlashNexusConfig({ cwd, envFile: options.envFile })
  const config = loaded.config
  const environment = resolveFlashNexusEnvironment(process.env)
  const mode = options.mode ?? environment.mode ?? config.tunnel?.mode ?? 'named'
  const zoneOverride = options.zone ?? environment.zone
  const hostnameOverride = options.hostname ?? environment.hostname
  const subdomain = options.subdomain ?? environment.subdomain ?? config.tunnel?.subdomain
  const zoneCandidate = zoneOverride ?? config.dns?.zone ?? config.tunnel?.zone
  const generatedHostname = !hostnameOverride && subdomain && zoneCandidate
    ? createHostname(zoneCandidate, subdomain)
    : undefined
  const cloudflaredPath = options.cloudflaredPath
    ?? environment.cloudflaredPath
    ?? config.tunnel?.cloudflaredPath

  let hostname: string | undefined
  let zone: string | undefined
  let dnsManager: ReturnType<typeof createDnsManager<{ proxied?: boolean }>> | undefined
  const cloudflareEnv = mode === 'named'
    ? resolveCloudflareEnvironment(projectCredentials)
    : undefined
  if (mode === 'named') {
    const resolvedDns = resolveDnsConfig({
      cwd,
      config: dnsConfigFor(config),
      env: process.env,
      cli: {
        hostname: hostnameOverride ?? generatedHostname,
        zone: zoneOverride,
      },
    })
    hostname = resolvedDns.hostname
    zone = resolvedDns.zone
    const dnsAdapter = createCloudflareAdapter({ env: cloudflareEnv })
    dnsManager = createDnsManager({ adapter: dnsAdapter })
  }

  const tunnel = createCloudflareTunnel({
    env: cloudflareEnv,
    cloudflaredPath,
    originRequest: config.tunnel?.originRequest,
  })

  const tunnelConfig = tunnelConfigFor(config, options.localUrl, mode, hostname, cloudflaredPath)
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
