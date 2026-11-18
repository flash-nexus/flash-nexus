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
  subdomain?: string
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
      proxied?: boolean
    }
  }
}

export interface FlashNexusConfig {
  project?: {
    name?: string
    id?: string
  }
  server?: FlashNexusServerConfig
  tunnel?: FlashNexusTunnelConfig
  dns?: FlashNexusDnsConfig
}
