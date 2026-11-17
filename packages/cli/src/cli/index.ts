import type { FlashNexusCliInput } from './types'
import process from 'node:process'
import { loadFlashNexusConfig } from '@flash-nexus/config'
import pkgJson from '../../package.json'
import { parseCliInput } from './parser'

export async function runCliFromProcess(): Promise<number> {
  const parsed = parseCliInput(process.argv)
  if (parsed.type === 'help') {
    return 0
  }
  if (parsed.type === 'version') {
    process.stdout.write(`${pkgJson.version}\n`)
    return 0
  }

  await runCli(parsed.input)
  return 0
}

async function runCli(options: FlashNexusCliInput): Promise<void> {
  const result = await loadFlashNexusConfig(options)
  if (options.dryRun !== false) {
    process.stdout.write(`${JSON.stringify(result.config, null, 2)}\n`)
  }
}
