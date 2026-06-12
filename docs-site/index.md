---
layout: home

hero:
  name: "oh-my-pi"
  text: "Coding Agent with the IDE Wired In"
  tagline: "Can Boluk's fork of pi-mono — Rust core for performance, LSP/DAP for IDE parity, 40+ providers, and 32 tools."
  actions:
    - theme: brand
      text: Get Started →
      link: /architecture
    - theme: alt
      text: View on GitHub
      link: https://github.com/can1357/oh-my-pi

features:
  - title: "🦀 Rust Core (~55k LOC)"
    details: "Three native crates — pi-ast (AST + editing), pi-shell (process + minimizer), pi-iso (filesystem isolation; APFS, BTRFS, overlayfs, projfs, reflink). Compiled to a single .node binary via NAPI for ~10x faster hot paths."
  - title: "🧠 40+ LLM Providers"
    details: "Extends pi-mono's 8 providers with 32 more. Anthropic, OpenAI, Google, Mistral, plus Bedrock, Vertex, Azure, DeepSeek, Groq, Fireworks, Together, OpenRouter, custom endpoints, and 20+ more."
  - title: "🛠️ 32 Built-in Tools"
    details: "read, write, edit, bash, glob, grep, process, web_search, fetch_url, memory_*, todo_write, skill, hashline, snap, restore, lsps, daps, and 15 more — all type-safe with TypeBox schemas and TypeScript bindings to the Rust core."
  - title: "🔌 LSP · 14 Operations"
    details: "First-class Language Server Protocol support. 14 operations including hover, definition, references, completion, signatureHelp, codeAction, rename, format, rangeFormat, prepareRename, documentSymbol, semanticTokens, inlayHint, diagnostic."
  - title: "🐛 DAP · 28 Operations"
    details: "Debug Adapter Protocol with 28 operations. launch, attach, setBreakpoints, continue, next, stepIn, stepOut, pause, threads, stackTrace, scopes, variables, evaluate, watch, setVariable, source, exceptionInfo, loadedSources, etc."
  - title: "📚 pi-catalog · Model Identity"
    details: "Centralized model metadata. Identity (id, name, api, provider, baseUrl), capability (reasoning, tools, vision, caching), effort levels, cost, context window, deprecation status. Compat layer for legacy model ids."
  - title: "🧮 snapcompact · Snapshot+Compact"
    details: "Hybrid persistence. Append-only JSONL for messages, periodic snapshots for filesystem state (via pi-iso's reflink/copy-on-write). Compaction combines both — prune old messages AND roll back filesystem changes."
  - title: "🌐 collab-web · React 19 UI"
    details: "Collaborative web UI alongside the TUI. React 19 + Vite + Tailwind 4. Real-time multi-user sessions, shared terminal, shared message history. The web is a peer of the TUI, not a separate product."
  - title: "📊 omp-stats · OpenTelemetry"
    details: "Built-in telemetry via OpenTelemetry SDK. OTLP exporter for traces + metrics. Tracks token usage, latency, tool execution time, LLM round-trips, error rates. Wire-compatible with Datadog, Honeycomb, Tempo."
  - title: "🐝 swarm-extension · Sub-agents"
    details: "Spawn sub-agents for parallel work. Each sub-agent is a full pi-coding-agent instance with its own model, tools, and session. Recursion supported (sub-agents can spawn their own sub-agents). 4 swarming strategies."
  - title: "🪟 pi-iso · Filesystem Isolation"
    details: "Cross-platform filesystem isolation via the right primitive per OS. APFS clones on macOS, BTRFS reflinks on Linux, overlayfs in containers, projfs on Windows. Cheap forks for the agent, instant rollback."
  - title: "🔐 Bun + Rust + npm catalog"
    details: "Bun 1.3.14 as runtime, Rust 2024 edition, npm catalog for version-pinned deps, Biome for linting, tsgo for native TS, Cargo workspace with 4 profiles (release, ci, local, dev)."

---

## What's new vs pi-mono

oh-my-pi is **pi-mono + Rust** — every layer of pi-mono gets a faster native implementation, plus 4 new types of capabilities:

| Layer | pi-mono | oh-my-pi |
|------|---------|----------|
| AST editing | `edit` (substring match) | `hashline` (line+hash format, 100% safe) |
| Shell | `bash` (Node spawn) | `pi-shell` (Rust, with command minimizer) |
| Filesystem | Direct read/write | `pi-iso` (reflink/overlay/clone rollback) |
| Providers | 8 | 40+ (added 32) |
| Tools | 30+ | 32 (consolidated + Rust-accelerated) |
| LSP | none | 14 operations |
| DAP | none | 28 operations |
| Persistence | JSONL | snapcompact (JSONL + snapshots) |
| Web UI | pixel-pal-web (Electron) | collab-web (React 19, multi-user) |
| Telemetry | none | OpenTelemetry (OTLP traces + metrics) |
| Sub-agents | none | swarm-extension (recursive) |

## Where to next?

- New here? Read [Architecture](/architecture) for the 10,000-foot view.
- Coming from pi-mono? See [Rust Core](/docs/01-rust-core) for what changed.
- Building tools? Start at [32 Built-in Tools](/docs/09-tools) + [pi-wire](/docs/12-pi-wire).
- Curious about IDE integration? See [LSP](/docs/06-lsp) + [DAP](/docs/07-dap).
- Deploying? Jump to [Deployment](/docs/17-deployment).
