# Tech Stack

oh-my-pi is polyglot by design: **Rust 2024 for performance-critical paths, TypeScript 5.x for the agent runtime, React 19 for the web, Python 3.12+ for the optional RPC server, all wired together by Bun 1.3.14**. The version pinning is strict (npm catalog + Cargo workspace) and the build is per-crate + per-package.

## Core stack

| Layer | Tech | Version | Why |
|------|------|---------|-----|
| Runtime | Bun | 1.3.14 | `packageManager: "bun@1.3.14"`; 200ms cold start; built-in TS |
| Compiler | TypeScript (native) | 7.0.0-dev (via tsgo) | Used by `pi-coding-agent` and friends |
| Alt compiler | TypeScript (standard) | 5.9.x | Used by `collab-web` and other web packages |
| Build | tsgo + esbuild | 7.0.0-dev / 0.28.0 | `tsgo -p tsconfig.build.json` per package |
| Linter | Biome | ^2.4.16 | `biome check --write --error-on-warnings` |
| Native | Rust | 2024 edition | `rust-toolchain.toml` pins the toolchain |
| Cargo workspace | cargo | latest stable | 4 profiles: release, ci, local, dev |
| Native bindings | NAPI | @napi-rs/cli 3.7.0 | `napi build --platform --release` |
| Web framework | React | 19.2.x | `collab-web`; concurrent features |
| Build (web) | Vite | 6.x | `@tailwindcss/vite` 4.3.0 |
| CSS | Tailwind CSS | 4.3.0 | `tailwindcss/vite` 4.3.0 |
| Telemetry | OpenTelemetry | api 1.9.1 / sdk 2.7.1 | OTLP proto exporter |
| Protobuf | bufbuild | ^2.12.0 | TypeScript + Python code-gen |
| Bash parser | brush (vendored) | git subtree | Shell AST + minimizer |
| Python | Python | 3.12+ | `omp-rpc` and `robomp` |
| LSP | vscode-languageserver-protocol | latest | 14 LSP operations |
| DAP | vscode-debugadapter-protocol | latest | 28 DAP operations |
| Sandbox | Anthropic sandbox-runtime | 0.0.26 | Optional, via extension |
| VM isolation | Gondolin | latest | Optional, via extension |

## Bun catalog

`package.json` uses Bun's **catalog** feature to pin shared dependencies across the workspace:

```json
{
  "workspaces": {
    "packages": ["packages/*", "python/robomp/web"],
    "catalog": {
      "@oh-my-pi/hashline": "15.12.3",
      "@oh-my-pi/omp-stats": "15.12.3",
      "@oh-my-pi/pi-agent-core": "15.12.3",
      "@oh-my-pi/pi-ai": "15.12.3",
      "@oh-my-pi/pi-catalog": "15.12.3",
      "@oh-my-pi/pi-coding-agent": "15.12.3",
      "@oh-my-pi/pi-mnemopi": "15.12.3",
      "@oh-my-pi/pi-natives": "15.12.3",
      "@oh-my-pi/pi-tui": "15.12.3",
      "@oh-my-pi/pi-utils": "15.12.3",
      "@oh-my-pi/pi-wire": "15.12.3",
      "@oh-my-pi/snapcompact": "15.12.3",
      "@biomejs/biome": "^2.4.16",
      "@napi-rs/cli": "3.7.0",
      "react": "19.2.x",
      // ... 50+ shared deps
    }
  }
}
```

Bun resolves `catalog:` references to the exact pinned version, so all 15 packages use the same `react@19.2.x` (no semver range, no drift).

## Rust workspace

`Cargo.toml`:

```toml
[workspace]
members = ["crates/*"]
exclude = ["crates/brush-core-vendored", "crates/brush-builtins-vendored"]
resolver = "3"

[workspace.package]
version = "15.12.3"
edition = "2024"
license = "MIT"
authors = ["Can Boluk"]
homepage = "https://omp.sh/"
repository = "https://github.com/can1357/oh-my-pi"

[patch.crates-io]
brush-core = { path = "crates/brush-core-vendored" }
brush-builtins = { path = "crates/brush-builtins-vendored" }

[profile.release]
opt-level = 3
lto = "fat"
codegen-units = 1
strip = true
panic = "abort"

[profile.ci]
inherits = "release"
lto = "thin"
codegen-units = 16
debug = false
strip = "symbols"
split-debuginfo = "off"

[profile.local]
inherits = "release"
lto = "thin"
codegen-units = 16
incremental = true
strip = false

[profile.dev]
inherits = "release"  # dev builds still get fat LTO
```

Four profiles, each tuned for its use case:

- **`release`** — production builds, full LTO, symbols stripped, `panic = "abort"` for smaller binary
- **`ci`** — slightly faster builds (thin LTO, 16 codegen units), symbols stripped (still small)
- **`local`** — fastest build time (thin LTO, 16 codegen units, incremental)
- **`dev`** — same as local but with full LTO (faster runtime, slower compile)

The `[patch.crates-io]` block **pins** the vendored `brush-core` and `brush-builtins` so they always come from `crates/*` (not from the network).

## Per-package technology

### `crates/pi-ast`

| Dep | Purpose |
|-----|---------|
| `brush-core` (vendored) | Shell parser |
| `tree-sitter` (multiple langs) | AST parsing |
| `napi` | NAPI bindings to TS |
| `napi-derive` | `#[napi]` proc macros |

### `crates/pi-shell`

| Dep | Purpose |
|-----|---------|
| `tokio` | Async runtime |
| `processes` | Cross-platform process control |
| `brush-builtins` (vendored) | Shell builtins |
| `napi` / `napi-derive` | NAPI bindings |

### `crates/pi-iso`

| Dep | Purpose |
|-----|---------|
| `tokio` | Async runtime |
| `nix` | Unix syscalls (BTRFS, APFS) |
| `windows` | Windows ProjFS (behind `cfg(windows)`) |
| `capctl` | Linux capabilities |
| `napi` / `napi-derive` | NAPI bindings |

### `packages/pi-ai` (`@oh-my-pi/pi-ai`)

| Dep | Version | Purpose |
|-----|---------|---------|
| `@oh-my-pi/pi-catalog` | 15.12.3 | Model identity |
| `@oh-my-pi/pi-utils` | 15.12.3 | Shared types |
| `typebox` | 1.x | JSON schema + static types |
| `yaml` | 2.9.x | YAML parsing for catalog |
| `ignore` | 7.x | gitignore-style globs |

### `packages/pi-agent-core` (`@oh-my-pi/pi-agent-core`)

| Dep | Version | Purpose |
|-----|---------|---------|
| `@oh-my-pi/pi-ai` | 15.12.3 | LLM layer |
| `@oh-my-pi/pi-catalog` | 15.12.3 | Model identity |
| `@oh-my-pi/pi-utils` | 15.12.3 | Shared types |
| `@oh-my-pi/pi-mnemopi` | 15.12.3 | Memory |
| `typebox` | 1.x | Re-exported |
| `yaml` | 2.9.x | Skill manifests |
| `ignore` | 7.x | Tool filters |

### `packages/pi-coding-agent` (`@oh-my-pi/pi-coding-agent`)

| Dep | Version | Purpose |
|-----|---------|---------|
| `@oh-my-pi/pi-agent-core` | 15.12.3 | Runtime |
| `@oh-my-pi/pi-ai` | 15.12.3 | LLM |
| `@oh-my-pi/pi-catalog` | 15.12.3 | Models |
| `@oh-my-pi/pi-tui` | 15.12.3 | TUI |
| `@oh-my-pi/pi-utils` | 15.12.3 | Types |
| `@oh-my-pi/pi-natives` | 15.12.3 | NAPI |
| `@oh-my-pi/hashline` | 15.12.3 | Edit primitive |
| `@oh-my-pi/pi-mnemopi` | 15.12.3 | Memory |
| `@oh-my-pi/pi-wire` | 15.12.3 | Cross-process |
| `@oh-my-pi/snapcompact` | 15.12.3 | Persistence |
| `@oh-my-pi/omp-stats` | 15.12.3 | Telemetry |
| `@agentclientprotocol/sdk` | 0.22.1 | Agent Client Protocol |
| `@babel/generator` / `parser` / `traverse` / `types` | ^7.29.7 | AST operations |
| `chalk` | 5.6.x | CLI colors |
| `commander` | 12.x | Argv parsing |
| `cross-spawn` | 7.x | Cross-platform spawn |
| `diff` | 8.x | Diff rendering |
| `glob` | 13.x | File patterns |
| `highlight.js` | 10.7.x | Code highlighting |
| `ignore` | 7.x | Tool filters |
| `pino` | 9.x | Structured logging |
| `tar` | 7.x | Tarball support |
| `turndown` | 7.x | HTML to MD |
| `vscode-languageserver-protocol` | 3.x | LSP |
| `vscode-debugadapter-protocol` | 1.x | DAP |
| `vscode-jsonrpc` | 8.x | JSON-RPC for LSP/DAP |
| `vscode-uri` | 3.x | URI handling |
| `web-tree-sitter` | 0.25.x | WASM tree-sitter |

### `packages/collab-web` (`@oh-my-pi/collab-web`)

| Dep | Version | Purpose |
|-----|---------|---------|
| `react` | 19.2.x | UI |
| `react-dom` | 19.2.x | Renderer |
| `vite` | 6.x | Build |
| `@vitejs/plugin-react` | 4.x | React HMR |
| `@tailwindcss/vite` | 4.3.0 | Tailwind |
| `tailwindcss` | 4.3.0 | Utility CSS |
| `lucide-react` | 0.4xx | Icons |
| `xterm` | 5.5.x | Terminal emulator |
| `xterm-addon-fit` | 0.8.x | Fit terminal to container |
| `@xterm/xterm` | 5.5.x | New xterm scoped package |
| `zustand` | 5.x | State management |
| `@bufbuild/protobuf` | ^2.12.0 | Protobuf runtime |
| `idb` | 8.x | IndexedDB wrapper |

### `packages/omp-stats` (`@oh-my-pi/omp-stats`)

| Dep | Version | Purpose |
|-----|---------|---------|
| `@opentelemetry/api` | ^1.9.1 | OTel API |
| `@opentelemetry/context-async-hooks` | ^2.7.1 | Async context |
| `@opentelemetry/exporter-trace-otlp-proto` | ^0.218.0 | OTLP exporter |
| `@opentelemetry/resources` | ^2.7.1 | Resource attrs |
| `@opentelemetry/sdk-trace-base` | ^2.7.1 | SDK |
| `@opentelemetry/sdk-trace-node` | ^2.7.1 | Node SDK |
| `@opentelemetry/semantic-conventions` | ^1.x | Semantic attrs |
| `@opentelemetry/instrumentation` | ^0.5x.x | Auto-instrumentation |
| `@huggingface/transformers` | ^4.2.0 | Optional local LLM metrics |

### `python/omp-rpc` + `python/robomp`

| Dep | Purpose |
|-----|---------|
| `protobuf` | Wire format |
| `grpcio` | RPC transport |
| `asyncio` | Async I/O |
| `pydantic` | Schema validation |
| `typer` | CLI |
| `uvicorn` | ASGI server |
| `httpx` | HTTP client |

## TypeScript configuration

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "noUncheckedIndexedAccess": true
  }
}
```

The added `noUncheckedIndexedAccess: true` is the strict upgrade over pi-mono — array index access returns `T | undefined`, forcing explicit null checks.

## Workspace engines

```json
"engines": {
  "bun": ">=1.3.14",
  "node": ">=22.19.0"
}
```

Bun is the primary runtime, Node is the supported fallback (for `collab-web` deploy, CI, etc.).

## Build commands

```bash
# From repo root (Bun)
bun install                    # Hydrate workspace
bun run build                  # Build all packages + crates
bun run check                  # biome + type-check + lint
bun test                       # Run tests (Bun native)

# From repo root (Cargo)
cargo build --release          # Build all Rust crates
cargo test --workspace         # Run all Rust tests

# Per-package
cd packages/coding-agent
bun run build                  # Build this package
bun test                       # Test this package

# Per-crate
cd crates/pi-iso
cargo build --release          # Build this crate
cargo test                     # Test this crate
```

## Runtime versions

- **Bun ≥ 1.3.14** — primary runtime
- **Node ≥ 22.19.0** — fallback runtime
- **Rust ≥ 1.85** — for building native crates (2024 edition)
- **Python ≥ 3.12** — for omp-rpc + robomp

## Docker

Two Dockerfiles:

- `Dockerfile` (main) — `omp` CLI in a slim image
- `Dockerfile.robomp` — `robomp` (agent-as-a-service) in a slightly larger image with Python

Both use multi-stage builds:

```dockerfile
# Stage 1: Build
FROM rust:1.85 AS rust-build
WORKDIR /build
COPY crates/ crates/
RUN cargo build --release --workspace

FROM oven/bun:1.3.14 AS ts-build
WORKDIR /build
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Stage 2: Runtime
FROM debian:bookworm-slim
COPY --from=rust-build /build/target/release/*.so /usr/local/lib/
COPY --from=ts-build /build/packages/coding-agent/dist /app
COPY --from=ts-build /build/node_modules /app/node_modules
WORKDIR /app
ENTRYPOINT ["node", "cli.js"]
```

## Bun + Cargo integration

The build system runs `cargo build --release` and `bun run build` in **parallel** with the output of the Rust crates copied to `packages/pi-natives/native/<platform>-<arch>/`. The TypeScript build then picks them up via the `pi-natives` package's `bin/` field.

```json
// packages/pi-natives/package.json
{
  "bin": {
    "pi-iso-darwin-arm64": "native/darwin-arm64/libpi_iso.node",
    "pi-iso-darwin-x64": "native/darwin-x64/libpi_iso.node",
    "pi-iso-linux-x64": "native/linux-x64/libpi_iso.node",
    "pi-iso-win32-x64": "native/win32-x64/libpi_iso.node"
  }
}
```

## Why these specific technologies

- **Bun 1.3.14** — fastest startup, native TS, catalog pinning. Trade-off: younger than Node.
- **Rust 2024** — performance + safety. Trade-off: slower compile.
- **React 19** — concurrent features, server components ready. Trade-off: not stable in 19.0 (but 19.2 is).
- **Tailwind 4** — utility CSS, smaller bundle. Trade-off: not compatible with old v3 plugins.
- **Tree-sitter** — incremental parsing, 50+ languages. Trade-off: WASM blob size.
- **protobuf** — schema evolution, cross-language. Trade-off: schema files to maintain.
- **OpenTelemetry** — vendor-neutral telemetry. Trade-off: SDK can be heavy.

## What the team rejected

- **Tauri** — smaller binary than Electron, but Rust + Web is enough complexity already
- **Zod** — TypeBox produces JSON Schema directly, no need for `zod-to-json-schema`
- **Vitest** — Bun's `bun test` is faster and uses the same TS pipeline
- **MUI** — collab-web uses Tailwind for custom design (no off-the-shelf)
- **Redis** — sessions and memory are file-based; no separate process to manage

## Next

- [Rust Core](/docs/01-rust-core) — the native layer
- [pi-ai · 40+ Providers](/docs/02-pi-ai) — the LLM layer
- [Deployment](/docs/17-deployment) — installing the binary
