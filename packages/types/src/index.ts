export type FlashNexusProvider = string

export type FlashNexusTunnelMode = 'named' | 'quick'

export interface FlashNexusServerConfig {
  command?: string
  cwd?: string
  port?: number
  url?: string
  dir?: string
  timeout?: number
}

export interface FlashNexusTunnelConfig {
  mode?: FlashNexusTunnelMode
  name?: string
  zone?: string
  hostname?: string
  cloudflaredPath?: string
  originRequest?: {
    httpHostHeader?: string
    noTLSVerify?: boolean
  }
  persist?: boolean
  keep?: boolean
  overwrite?: boolean
  autoStopAfterMs?: number
  verifyTimeoutMs?: number
}

export interface FlashNexusDnsConfig {
  provider?: 'cloudflare'
  zone?: string
  hostname?: string
  naming?: { template?: string }
  variables?: Record<string, string>
  record?: { ttl?: number | 'auto' }
  providers?: {
    cloudflare?: {
      zoneId?: string
      proxied?: boolean
    }
  }
}

export interface FlashNexusCloudflareConfig {
  accountId?: string
  zoneId?: string
  cloudflaredPath?: string
}

export interface FlashNexusConfig {
  project?: {
    name?: string
    id?: string
  }
  server?: FlashNexusServerConfig
  tunnel?: FlashNexusTunnelConfig
  dns?: FlashNexusDnsConfig
  providers?: {
    cloudflare?: FlashNexusCloudflareConfig
  }
}
