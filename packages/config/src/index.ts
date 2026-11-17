import type { FlashNexusConfig } from '@flash-nexus/types'
import { createRequire } from 'node:module'
import { loadConfig } from 'c12'
import { createJiti } from 'jiti'

const require = createRequire(import.meta.url)

export type { FlashNexusConfig } from '@flash-nexus/types'

export function defineConfig<T extends FlashNexusConfig>(config: T): T {
  return config
}

export async function loadFlashNexusConfig(options: {
  cwd?: string
  envFile?: string
} = {}): Promise<Awaited<ReturnType<typeof loadConfig<FlashNexusConfig>>>> {
  const configModule = require.resolve('@flash-nexus/config')
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
