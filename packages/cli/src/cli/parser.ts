import type { FlashNexusCliParseResult } from './types'
import { cac } from 'cac'

export function createCli() {
  const cli = cac('flash-nexus')
  cli
    .help()
    .command('[root]', 'Load the Flash Nexus configuration')
    .option('--cwd <dir>', 'Project directory')
    .option('--env-file <path>', 'Environment file')
    .option('--dry-run', 'Print the resolved configuration')
    .option('-v, --version', 'Display version number')
  return cli
}

export function parseCliInput(argv: string[]): FlashNexusCliParseResult {
  const cli = createCli()
  const { options } = cli.parse(argv)

  if (options.h || options.help) {
    return { type: 'help' }
  }
  if (options.v || options.version) {
    return { type: 'version' }
  }

  return {
    type: 'run',
    input: {
      cwd: options.cwd,
      envFile: options.envFile,
      dryRun: options.dryRun,
    },
  }
}
