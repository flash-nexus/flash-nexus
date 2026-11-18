import type { FlashNexusConfig } from '@flash-nexus/types'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { loadConfig } from 'c12'
import { createJiti } from 'jiti'

const require = createRequire(import.meta.url)

export { resolveFlashNexusEnvironment } from './environment'
export type { FlashNexusEnvironmentScope, FlashNexusEnvironmentValues } from './environment'
export type { FlashNexusConfig } from '@flash-nexus/types'

export function defineConfig<T extends FlashNexusConfig>(config: T): T {
  return config
}

export async function loadFlashNexusConfig(options: {
  cwd?: string
  envFile?: string
} = {}): Promise<Awaited<ReturnType<typeof loadConfig<FlashNexusConfig>>>> {
  let configModule = fileURLToPath(new URL('./index.ts', import.meta.url))
  try {
    const resolvedConfigModule = require.resolve('@flash-nexus/config')
    if (existsSync(resolvedConfigModule)) {
      configModule = resolvedConfigModule
    }
  }
  catch {
    // Source tests and workspace typecheck run before the package dist exists.
  }
  const jiti = createJiti(import.meta.url, {
    fsCache: false,
    moduleCache: false,
    alias: {
      'flash-nexus': configModule,
      '@flash-nexus/config': configModule,
    },
  })

  return loadConfig<FlashNexusConfig>({
    cwd: options.cwd,
    name: 'flash-nexus',
    jiti,
    dotenv: options.envFile
      ? {
          fileName: [options.envFile],
        }
      : true,
  })
}
