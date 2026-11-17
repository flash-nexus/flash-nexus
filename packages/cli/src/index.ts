import process from 'node:process'
import { loadFlashNexusConfig } from '@flash-nexus/config'
import { cac } from 'cac'

export async function runCli(argv: string[] = process.argv): Promise<void> {
  const cli = cac('flash-nexus')

  cli
    .command('[root]', 'Load the Flash Nexus configuration')
    .option('--cwd <dir>', 'Project directory')
    .option('--env-file <path>', 'Environment file')
    .option('--dry-run', 'Print the resolved configuration')
    .action(async (_root: unknown, options: { cwd?: string, envFile?: string, dryRun?: boolean }) => {
      const result = await loadFlashNexusConfig(options)
      if (options.dryRun !== false) {
        process.stdout.write(`${JSON.stringify(result.config, null, 2)}\n`)
      }
    })

  cli.help()
  cli.version('0.1.0')
  cli.parse(argv)
}
