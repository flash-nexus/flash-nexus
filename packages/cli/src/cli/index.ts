import type { FlashNexusCliInput } from './types'
import process from 'node:process'
import { loadFlashNexusConfig } from '@flash-nexus/config'
import { startFlashNexus } from '@flash-nexus/core'
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
  if (options.dryRun) {
    process.stdout.write(`${JSON.stringify(result.config, null, 2)}\n`)
    return
  }

  const session = await startFlashNexus({
    cwd: options.cwd,
    envFile: options.envFile,
    config: result.config,
    localUrl: options.localUrl,
    mode: options.mode,
    hostname: options.hostname,
    subdomain: options.subdomain,
    zone: options.zone,
    onLog: (line, stream) => {
      process[stream === 'stderr'
        ? 'stderr'
        : 'stdout'].write(`${line}\n`)
    },
  })

  process.stdout.write(`local  ${session.localUrl}\n`)
  process.stdout.write(`public ${session.publicUrl}\n`)

  let stopping = false
  const stop = async (code: number): Promise<void> => {
    if (stopping) {
      return
    }
    stopping = true
    await session.stop()
    process.exitCode = code
  }
  const onSigint = (): void => {
    void stop(130)
  }
  const onSigterm = (): void => {
    void stop(143)
  }
  process.once('SIGINT', onSigint)
  process.once('SIGTERM', onSigterm)
  try {
    await session.exited
  }
  finally {
    process.off('SIGINT', onSigint)
    process.off('SIGTERM', onSigterm)
  }
}
