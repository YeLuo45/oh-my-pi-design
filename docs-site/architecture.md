# Architecture

oh-my-pi is a **3-tier polyglot monorepo**: a Rust core for performance-critical paths, a TypeScript middle for the agent runtime and tools, and a React 19 web layer for the collaborative UI. All 5 crates + 15 TypeScript packages + 1 Python package share a single workspace with version-pinned dependencies via npm catalog.

## High-level diagram

```mermaid
flowchart TB
  subgraph Web["🌐 Web Tier (React 19 + Vite + Tailwind 4)"]
    Collab[collab-web<br/>shared terminal, sessions]
    Stats[omp-stats<br/>OTLP traces + metrics]
  end

  subgraph TS["📦 TypeScript Tier (Bun 1.3.14)"]
    CLI[omp CLI<br/>pi-coding-agent]
    Agent[pi-agent-core<br/>loop + state + compaction]
    AI[pi-ai<br/>40+ providers]
    Catalog[pi-catalog<br/>model identity + compat]
    TUI[pi-tui<br/>differential renderer]
    Hashline[hashline<br/>line:hash edits]
    Mnemopi[pi-mnemopi<br/>memory]
    Wire[pi-wire<br/>JSON-RPC]
    Swarm[swarm-extension<br/>sub-agents]
    Tools[32 tools<br/>read/edit/bash/lsp/dap/...]
  end

  subgraph Rust["🦀 Rust Tier (2024 edition, NAPI)"]
    Ast[pi-ast<br/>AST + edit ops]
    Shell[pi-shell<br/>process + minimizer]
    Iso[pi-iso<br/>APFS/BTRFS/overlay/projfs/reflink]
    Natives[pi-natives<br/>NAPI bindings]
    Vendored["brush-core / brush-builtins<br/>(vendored shell parser)"]
  end

  subgraph Python["🐍 Python (optional)"]
    OmpRpc[omp-rpc<br/>Python server]
    Robomp[robomp<br/>agent as a service]
  end

  Collab <-->|HTTP/WS| CLI
  CLI --> Agent
  Agent --> AI
  AI --> Catalog
  CLI --> TUI
  CLI --> Tools
  Tools --> Hashline
  Tools --> Iso
  Tools --> Shell
  Tools --> Ast
  Tools --> Wire
  Agent --> Mnemopi
  Mnemopi --> Iso
  Swarm --> CLI
  Stats --> AI
  Stats --> Tools
  Ast --> Vendored
  Natives --> Ast
  Natives --> Shell
  Natives --> Iso
  OmpRpc --> Wire
  Robomp --> Wire
```

## Workspace structure

```
oh-my-pi/
├── crates/                          # 🦀 Rust workspace
│   ├── pi-ast/                      # AST parser + edit ops (vendored brush-core)
│   ├── pi-shell/                    # Process spawn + command minimizer
│   ├── pi-iso/                      # Filesystem isolation (APFS, BTRFS, overlay, projfs, reflink)
│   ├── pi-natives/                  # NAPI bindings to Node/Bun
│   ├── brush-core-vendored/         # shell parser (git subtree)
│   └── brush-builtins-vendored/     # shell builtins (git subtree)
├── packages/                        # 📦 TypeScript workspace
│   ├── pi-ai/                       # 40+ LLM providers
│   ├── pi-agent-core/               # Agent runtime
│   ├── pi-catalog/                  # Model identity + compat
│   ├── pi-coding-agent/             # The `omp` CLI binary
│   ├── pi-tui/                      # Terminal UI
│   ├── pi-mnemopi/                  # Memory system
│   ├── pi-wire/                     # JSON-RPC + protobuf
│   ├── pi-utils/                    # Shared utilities
│   ├── pi-natives/                  # NAPI wrapper
│   ├── hashline/                    # Line:hash edit primitive
│   ├── snapcompact/                 # Snapshot+compact persistence
│   ├── omp-stats/                   # OpenTelemetry
│   ├── swarm-extension/             # Sub-agent spawning
│   ├── collab-web/                  # React 19 collaborative UI
│   └── typescript-edit-benchmark/   # Edit primitive benchmarks
├── python/                          # 🐍 Python optional
│   ├── omp-rpc/                     # Python RPC server
│   └── robomp/                      # Agent-as-a-service
├── docs/                            # User-facing docs (markdown)
├── types/                           # Cross-package type declarations
├── scripts/                         # Build + CI scripts
├── Dockerfile                       # Main agent container
├── Dockerfile.robomp                # robomp container
├── Cargo.toml                       # Rust workspace
├── package.json                     # Bun workspace + catalog
└── AGENTS.md                        # 16K LOC of dev conventions
```

## Package dependency graph

```mermaid
graph LR
  coding-agent --> agent-core
  coding-agent --> ai
  coding-agent --> catalog
  coding-agent --> tui
  coding-agent --> utils
  coding-agent --> natives
  coding-agent --> hashline
  coding-agent --> mnemopi
  coding-agent --> wire
  coding-agent --> snapcompact
  coding-agent --> swarm-extension
  
  agent-core --> ai
  agent-core --> catalog
  agent-core --> utils
  agent-core --> mnemopi
  
  ai --> catalog
  ai --> utils
  
  natives --> pi-natives-rs[pi-natives]
  hashline --> utils
  hashline --> natives
  mnemopi --> utils
  mnemopi --> iso[pi-iso]
  wire --> utils
  
  swarm-extension --> coding-agent
  collab-web --> wire
  omp-stats --> utils
  omp-stats --> ai
```

The arrows are **strict**: `pi-coding-agent` depends on `pi-agent-core` and `pi-ai`; `pi-agent-core` depends on `pi-ai`; `pi-ai` depends on `pi-catalog`; native crates are leaf nodes with no upstream TypeScript deps.

## Layered responsibilities

| Layer | Package | Responsibility |
|------|---------|----------------|
| **Native** | `pi-ast`, `pi-shell`, `pi-iso` | Performance-critical: AST parsing, process control, filesystem isolation |
| **Bindings** | `pi-natives` | NAPI bridge: exposes Rust to TypeScript via `.node` addon |
| **Identity** | `pi-catalog` | Model metadata, capability flags, cost, deprecation, compat |
| **Transport** | `pi-ai` | 40+ LLM providers behind a single `streamSimple()` |
| **Runtime** | `pi-agent-core` | Agent loop, state, hooks, compaction, sessions |
| **Wire** | `pi-wire` | JSON-RPC + protobuf for cross-process communication |
| **Memory** | `pi-mnemopi` | Long-term memory, semantic search, knowledge graph |
| **Edit** | `hashline` | Line:hash edit primitive (100% safe file mutations) |
| **Persistence** | `snapcompact` | Hybrid: JSONL for messages, snapshots for filesystem |
| **Tools** | (in `pi-coding-agent/core/tools/`) | 32 tools: file, shell, search, lsp, dap, memory, meta |
| **CLI** | `pi-coding-agent` | The `omp` binary; argv parsing + modes + UI |
| **TUI** | `pi-tui` | Differential terminal renderer + components |
| **Web** | `collab-web` | React 19 collaborative UI |
| **Telemetry** | `omp-stats` | OpenTelemetry SDK + OTLP exporter |
| **Swarm** | `swarm-extension` | Sub-agent spawning + coordination |
| **Python** | `omp-rpc` | Python RPC server + `robomp` service |

## Mode decomposition

The `omp` CLI supports the same 3 modes as pi-mono, plus a 4th: **Web** (spawning collab-web).

```mermaid
flowchart LR
  CLI[omp CLI] --> Main[main.ts]
  Main --> Decide{mode?}
  Decide -->|TTY| Interactive[modes/interactive<br/>TUI]
  Decide -->|--rpc| RPC[modes/rpc<br/>JSON-RPC over stdio]
  Decide -->|--print| Print[modes/print<br/>one-shot]
  Decide -->|--collab| Collab[modes/collab<br/>web server + websocket]
  Interactive --> Session[AgentSession]
  RPC --> Session
  Print --> Session
  Collab --> Session
  Collab --> Web[collab-web<br/>React 19]
```

The 4th mode (`--collab`) starts a local HTTP server + WebSocket that `collab-web` connects to. Multiple users can attach to the same session and see the same messages, with the lead user's input being the canonical one (others can watch or propose).

## TypeBox + protobuf

Two schema systems, used for different boundaries:

- **TypeBox** — internal TypeScript schemas (agent loop, tool definitions, event protocol). Single source of truth, produces JSON Schema for LLM `response_format`.
- **protobuf** — cross-process wire format (`pi-wire` package). Used for:
  - `collab-web` ↔ CLI (protobuf-over-WebSocket)
  - `omp-rpc` (Python) ↔ CLI (protobuf-over-stdio)
  - Future: cross-host agent coordination

The protobuf definitions live in `types/` and are compiled to TypeScript + Python + Rust via `bufbuild/protoc-gen-es`.

## Rust + TypeScript boundary

```mermaid
flowchart LR
  TS[TypeScript] -->|NAPI| Node[.node addon]
  Node -->|FFI| Rust
  
  subgraph pi-natives["pi-natives (TS)"]
    Loader[loadNative.ts<br/>dlopen .node]
    Wrapper[native.ts<br/>typed wrappers]
  end
  
  subgraph pi-natives-rs["pi-natives (Rust)"]
    Napi[napi-rs bindings]
    Napi --> Ast[pi-ast]
    Napi --> Shell[pi-shell]
    Napi --> Iso[pi-iso]
  end
```

The Rust crates are **separately built** (`cargo build --release`) and shipped as platform-specific `.node` files. The `pi-natives` TypeScript package:

1. Detects the platform + arch
2. Loads the right `.node` file from `bin/<platform>-<arch>/`
3. Wraps each native function in a TypeScript-typed async API
4. Falls back to a JS implementation if the native module is missing

This means `omp` **works without the native module** (slower, JS-only) but is **10-50× faster with it**.

## pi-iso: Filesystem isolation

The most novel Rust crate. `pi-iso` picks the right filesystem primitive per OS:

| OS | Primitive | Use case |
|----|-----------|----------|
| macOS | `clonefile()` (APFS) | Cheap COW clones for sandboxed agent workspace |
| Linux (BTRFS) | `ioctl(FICLONE)` reflink | Same as APFS, but BTRFS |
| Linux (overlayfs) | `mount -t overlay` | Container-friendly, in-memory upper layer |
| Linux (dev) | `cp -r` (slow) | Fallback when no COW filesystem |
| Windows | `ProjFS` | Filter driver for virtual filesystems |

The agent uses `pi-iso` to:

1. **Snapshot** the project at session start (1ms via reflink)
2. **Restore** the snapshot on session end or agent failure (1ms)
3. **Sandbox** the agent's edits in a clone (no risk to the host)
4. **Diff** two snapshots to see what the agent changed (via `pi-iso/diff`)

This is **the** missing primitive in pi-mono — and it's why oh-my-pi can do "high-risk" operations like `rm -rf` and `git reset --hard` safely.

## pi-ast: Edit primitive

`pi-ast` parses source files into ASTs (via vendored `brush-core`/tree-sitter) and exposes 4 edit operations:

1. **`findAndReplace`** — locate a unique AST node and replace it (preserving comments + formatting)
2. **`splice`** — insert a node at a specific position
3. **`delete`** — remove a node and shift the rest
4. **`transform`** — apply a function to all matching nodes

The `hashline` TypeScript package is built on `pi-ast` — every line in a file gets a content hash, and edits are specified as `L:hash|new content` lines. The agent can never lose track of the file's state because the hash verifies the line is unchanged.

## pi-shell: Process control

`pi-shell` is a Rust process wrapper that adds:

- **Command minimizer** — turns `npm install && npm test` into a minimal AST, then re-emits it (for `bash` tool safety)
- **Cancel propagation** — SIGTERM on the parent → SIGTERM on all children (no orphans)
- **Output streaming** — chunked stdout/stderr with backpressure
- **Cross-platform** — uses `process.rs` on Unix, `windows.rs` on Windows (with ConPTY for proper TTY)
- **Resource limits** — CPU time, memory, file descriptors (Linux only)

The vendored `brush-core` + `brush-builtins` packages are git-subtree'd — they're the upstream `brush` shell parser, vendored to avoid network dependency.

## Session lifecycle

```mermaid
sequenceDiagram
    participant U as User
    participant CLI
    participant Iso as pi-iso
    participant Session
    participant LLM

    U->>CLI: omp [args]
    CLI->>Iso: snapshot(project)
    Iso-->>CLI: snapshotId
    CLI->>Session: open(snapshotId, model, tools)
    Session->>LLM: streamSimple()
    loop turns
        LLM-->>Session: events
        Session-->>U: render
    end
    U->>CLI: /exit
    CLI->>Iso: diff(snapshotId, current)
    Iso-->>CLI: fileChanges
    CLI->>U: "I changed these files. Commit? Restore?"
    U->>CLI: commit
    CLI->>Iso: keep snapshot
    U->>CLI: restore
    CLI->>Iso: restore(snapshotId)
```

The snapshot boundary makes the agent **reversible** — every session can be undone in 1ms, even if the agent made thousands of edits.

## Multi-user collab

```mermaid
flowchart TB
  subgraph Browser1["👤 User 1 (browser)"]
    Web1[collab-web]
  end
  subgraph Browser2["👤 User 2 (browser)"]
    Web2[collab-web]
  end
  subgraph Browser3["👤 User 3 (TUI)"]
    TUI3[omp TUI]
  end
  
  subgraph Server["omp --collab server"]
    HTTP[HTTP server<br/>Vite SPA]
    WS[WebSocket<br/>protobuf]
    Session[AgentSession]
  end

  Web1 <-->|WS protobuf| WS
  Web2 <-->|WS protobuf| WS
  TUI3 <-->|stdio protobuf| Session
  WS --> Session
```

The collab mode uses `pi-wire` (protobuf) for transport. The TUI and web clients are **peers** — both can send user messages, both can see events. The session is single-threaded; the lead user's input is canonical, others' inputs become suggestions.

## Why Rust + TypeScript

| Concern | TypeScript | Rust | Why Rust wins |
|---------|------------|------|---------------|
| LLM streaming | ✓ (WebStreams, async iter) | ✓ (tokio) | Tie — async story is comparable |
| AST parsing | tree-sitter-js (slow) | tree-sitter-rs | **10× faster**, real-time use |
| Process control | `child_process` (leaky) | `std::process` + libuv | **Safer** — no orphan processes |
| Filesystem ops | `fs` (blocking) | `tokio::fs` + reflink | **Non-blocking + COW** |
| Memory | GC pauses | Zero-cost | **Deterministic** — no GC in hot path |
| Compile time | fast | slow | Trade-off accepted for runtime wins |

The Rust crates are **not in the hot path of every turn** — they're used for:

- File editing (when `hashline` is the active tool)
- Command execution (when `bash` is called)
- Snapshot/restore (once per session)
- AST analysis (when refactoring)

Everything else (the agent loop, the LLM call, the event protocol) is still TypeScript.

## What's NOT Rust

The 4 things that stay TypeScript for ecosystem reasons:

- **LLM HTTP clients** — SDKs are npm packages; the Rust ecosystem is years behind
- **TUI** — terminal handling is OS-quirky and well-served by Node libraries
- **Web UI** — React/Vite is a JS-only stack
- **Telemetry** — OpenTelemetry SDKs are npm packages

## Why Bun 1.3.14

The team switched from Node 22 → Bun 1.3.14 for:

- **Faster startup** — 200ms vs 1.5s for `omp` cold start
- **Built-in TypeScript** — no `tsx` / `ts-node` needed
- **Built-in test runner** — `bun test` replaces vitest for some packages
- **Native fetch / WebStreams** — match the browser, simplify code

Trade-offs accepted: Bun is younger than Node, so some Node-only libs don't work. The team uses `bun install` for speed but tests on Node for compatibility.

## Next

- [Tech Stack](/tech-stack) — exact versions and per-package deps
- [Rust Core](/docs/01-rust-core) — the native layer in detail
- [pi-coding-agent · CLI](/docs/05-pi-coding-agent) — the consumer
- [LSP](/docs/06-lsp) — the IDE integration story
