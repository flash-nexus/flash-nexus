export interface FlashNexusCliInput {
  cwd?: string
  envFile?: string
  dryRun?: boolean
}

export type FlashNexusCliParseResult
  = | { type: 'help' }
    | { type: 'version' }
    | { type: 'run', input: FlashNexusCliInput }
