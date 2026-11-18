export interface FlashNexusCliInput {
  cwd?: string
  envFile?: string
  localUrl?: string
  mode?: 'named' | 'quick'
  hostname?: string
  subdomain?: string
  zone?: string
  dryRun?: boolean
}

export type FlashNexusCliParseResult
  = | { type: 'help' }
    | { type: 'version' }
    | { type: 'run', input: FlashNexusCliInput }
