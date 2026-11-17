# flash-nexus

Configuration and orchestration for local network previews.

The CLI starts or attaches to a local server, provisions a Cloudflare DNS
record through `flash-dns`, and starts a Cloudflare Tunnel through
`flash-tunnel`. DNS ownership stays with the Nexus session and is removed
before the tunnel is deprovisioned.

## Quick start

Create `flash-nexus.config.ts` in the project directory:

```ts
import { defineConfig } from 'flash-nexus'

export default defineConfig({
  server: {
    command: 'pnpm dev',
    port: 5173
  },
  tunnel: {
    mode: 'named'
  },
  dns: {
    zone: 'example.com',
    naming: { template: 'fd-{project}.example.com' }
  }
})
```

Set the Cloudflare adapter credentials in the environment or in `.env`, then run:

```env
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
# Optional when the DNS adapter should skip zone-name lookup.
CLOUDFLARE_ZONE_ID=...
```

```bash
npx flash-nexus
```

Use `--url` to attach to an already-running origin, `--mode quick` for a
temporary `trycloudflare.com` address, or `--dry-run` to inspect the resolved
configuration without creating resources.

## Workspace

- `@flash-nexus/config` loads and resolves configuration with c12.
- `@flash-nexus/types` contains public configuration types.
- `@flash-nexus/core` owns orchestration boundaries.
- `@flash-nexus/sdk` exposes programmatic integration.
- `flash-nexus` provides the CLI entry point.

The build uses obuild. c12 loads `flash-nexus.config.*` and dotenv files, while
the lower-level packages keep tunnel and DNS provider behavior independent.
