# flash-nexus

Configuration and orchestration for local network previews.

The project composes lower-level tunnel and DNS capabilities while keeping
project configuration in `flash-nexus.config.ts` and `.env` files.

## Workspace

- `@flash-nexus/config` loads and resolves configuration with c12.
- `@flash-nexus/types` contains public configuration types.
- `@flash-nexus/core` owns orchestration boundaries.
- `@flash-nexus/sdk` exposes programmatic integration.
- `flash-nexus` provides the CLI entry point.

The build uses obuild. Runtime portability is reserved for the parts that need
unenv; c12 remains responsible for configuration and dotenv loading.
