import type { FlashNexusCliParseResult } from './types'
import { cac } from 'cac'

export function createCli() {
  const cli = cac('flash-nexus')
  cli
    .help()
    .command('[root]', 'Load the Flash Nexus configuration')
    .option('--cwd <dir>', 'Project directory')
    .option('--env-file <path>', 'Environment file')
    .option('--url <url>', 'Reuse an already running local server')
    .option('--mode <mode>', 'Tunnel mode: named or quick')
    .option('--hostname <fqdn>', 'Public hostname for named mode')
    .option('--zone <domain>', 'Cloudflare zone for named mode')
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
      localUrl: options.url,
      mode: options.mode,
      hostname: options.hostname,
      zone: options.zone,
      dryRun: options.dryRun,
    },
  }
}
