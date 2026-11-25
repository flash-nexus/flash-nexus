import { readFileSync } from 'node:fs'
import process from 'node:process'
import { parseEnv } from 'node:util'

export function resolveCloudflareEnvironment(envFile?: string): NodeJS.ProcessEnv {
  if (!envFile)
    return process.env

  const entries = Object.entries(parseEnv(readFileSync(envFile, 'utf8')))
  const env = { ...process.env }
  for (const [name, value] of entries) {
    if (name.startsWith('CLOUDFLARE_'))
      env[name] = value
  }
  return env
}
