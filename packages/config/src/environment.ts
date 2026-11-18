import type { FlashNexusTunnelMode } from '@flash-nexus/types'
import process from 'node:process'

export type FlashNexusEnvironmentScope = 'nexus' | 'debug'
type EnvironmentField = 'mode' | 'zone' | 'hostname' | 'subdomain' | 'cloudflaredPath'

export interface FlashNexusEnvironmentValues {
  mode?: FlashNexusTunnelMode
  zone?: string
  hostname?: string
  subdomain?: string
  cloudflaredPath?: string
  sources: Partial<Record<EnvironmentField, string>>
}

function pick(env: NodeJS.ProcessEnv, field: EnvironmentField, names: string[], sources: FlashNexusEnvironmentValues['sources']): string | undefined {
  for (const name of names) {
    const value = env[name]?.trim()
    if (value) {
      sources[field] = name
      return value
    }
  }
}

export function resolveFlashNexusEnvironment(
  env: NodeJS.ProcessEnv = process.env,
  scope: FlashNexusEnvironmentScope = 'nexus',
): FlashNexusEnvironmentValues {
  const sources: FlashNexusEnvironmentValues['sources'] = {}
  const debug = scope === 'debug'
  const modeNames = debug
    ? ['FLASH_DEBUG_MODE', 'FLASH_NEXUS_MODE', 'FLASH_TUNNEL_MODE']
    : ['FLASH_NEXUS_MODE', 'FLASH_TUNNEL_MODE']
  const zoneNames = debug
    ? ['FLASH_DEBUG_ZONE', 'FLASH_NEXUS_ZONE', 'FLASH_DNS_ZONE']
    : ['FLASH_NEXUS_ZONE', 'FLASH_DNS_ZONE']
  const hostnameNames = debug
    ? [
        'FLASH_DEBUG_HOSTNAME',
        'FLASH_NEXUS_HOSTNAME',
        'FLASH_TUNNEL_HOSTNAME',
        'FLASH_DNS_HOSTNAME',
      ]
    : ['FLASH_NEXUS_HOSTNAME', 'FLASH_TUNNEL_HOSTNAME', 'FLASH_DNS_HOSTNAME']
  const subdomainNames = debug
    ? [
        'FLASH_DEBUG_SUBDOMAIN',
        'FLASH_DEBUG_SUB_DOMAIN',
        'FLASH_NEXUS_SUBDOMAIN',
        'FLASH_TUNNEL_SUBDOMAIN',
      ]
    : ['FLASH_NEXUS_SUBDOMAIN', 'FLASH_TUNNEL_SUBDOMAIN']
  const cloudflaredPathNames = debug
    ? [
        'FLASH_DEBUG_CLOUDFLARED_PATH',
        'FLASH_NEXUS_CLOUDFLARED_PATH',
        'FLASH_TUNNEL_CLOUDFLARED_PATH',
      ]
    : ['FLASH_NEXUS_CLOUDFLARED_PATH', 'FLASH_TUNNEL_CLOUDFLARED_PATH']
  const mode = pick(env, 'mode', modeNames, sources)
  const zone = pick(env, 'zone', zoneNames, sources)
  const hostname = pick(env, 'hostname', hostnameNames, sources)
  const subdomain = pick(env, 'subdomain', subdomainNames, sources)
  const cloudflaredPath = pick(env, 'cloudflaredPath', cloudflaredPathNames, sources)
  let resolvedMode: FlashNexusTunnelMode | undefined
  if (mode === 'quick' || mode === 'named') {
    resolvedMode = mode
  }

  return {
    mode: resolvedMode,
    zone,
    hostname,
    subdomain,
    cloudflaredPath,
    sources,
  }
}
