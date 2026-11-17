import type { FlashNexusConfig } from '@flash-nexus/types'
import { loadConfig } from 'c12'

export type { FlashNexusConfig } from '@flash-nexus/types'

export function defineConfig<T extends FlashNexusConfig>(config: T): T {
  return config
}

export async function loadFlashNexusConfig(options: {
  cwd?: string
  envFile?: string
} = {}): Promise<Awaited<ReturnType<typeof loadConfig<FlashNexusConfig>>>> {
  return loadConfig<FlashNexusConfig>({
    cwd: options.cwd,
    name: 'flash-nexus',
    dotenv: options.envFile
      ? {
          fileName: [options.envFile],
        }
      : true,
  })
}
