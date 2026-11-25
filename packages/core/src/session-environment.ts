import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { parseEnv } from 'node:util'

function environmentKey(name: string): string {
  return process.platform === 'win32'
    ? name.toUpperCase()
    : name
}

function readEnvironmentFile(cwd: string, envFile?: string): NodeJS.ProcessEnv {
  try {
    return parseEnv(readFileSync(resolve(cwd, envFile || '.env'), 'utf8'))
  }
  catch (error) {
    if (!envFile && (error as NodeJS.ErrnoException).code === 'ENOENT')
      return {}
    throw error
  }
}

export function loadSessionEnvironment(cwd: string, envFile?: string): NodeJS.ProcessEnv {
  const projectCredentials: NodeJS.ProcessEnv = {}
  // Ordinary variables fill gaps in the process environment. Credentials override only the adapter environment.
  for (const [name, value] of Object.entries(readEnvironmentFile(cwd, envFile))) {
    const key = environmentKey(name)
    if (key.startsWith('CLOUDFLARE_')) {
      projectCredentials[key] = value
    }
    else {
      process.env[name] ??= value
    }
  }
  return projectCredentials
}

export function resolveCloudflareEnvironment(projectCredentials: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const inherited = process.platform === 'win32'
    ? Object.fromEntries(Object.entries(process.env).map(([name, value]) => [
        environmentKey(name),
        value,
      ]))
    : process.env

  return {
    ...inherited,
    ...projectCredentials,
  }
}
