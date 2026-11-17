export type FlashNexusProvider = string

export interface FlashNexusConfig {
  project?: {
    name?: string
    id?: string
  }
  tunnel?: Record<string, unknown>
  dns?: Record<string, unknown>
  providers?: Record<string, unknown>
}
