# 17 · Deployment & Installation

oh-my-pi ships in **5 installable shapes**: the official install script (recommended), Homebrew tap, npm, Bun global, and the pre-built GitHub release binary. All 5 install the same `omp` binary. The right choice depends on your platform and preferred update flow.

**Source:** `install/install.sh`, `install/install.ps1`, `Formula/omp.rb`, `Dockerfile`, `Dockerfile.robomp`

## The 5 install paths

| Path | Platform | Time | Updates |
|------|----------|------|---------|
| **`curl \| sh`** | macOS · Linux | ~5s | `omp update --self` |
| **Homebrew** | macOS · Linux | ~30s | `brew upgrade omp` |
| **Bun global** | all | ~30s | `bun update -g` |
| **PowerShell** | Windows | ~5s | `omp update --self` |
| **Docker** | all | ~10s | re-pull image |
| **mise** | all | ~5s | `mise use -g github:can1357/oh-my-pi` |

## Path 1: Install script (recommended)

```sh
# macOS · Linux
curl -fsSL https://omp.sh/install | sh
```

The script:

1. Detects the OS (macOS / Linux) and arch (arm64 / x64)
2. Downloads the matching `omp-<version>-<os>-<arch>.tar.gz` from the latest GitHub release
3. Verifies the SHA-256 checksum
4. Verifies the signature (`cosign verify` against the maintainer's key)
5. Extracts to `/usr/local/bin/omp` (or `~/.local/bin/omp` if no sudo)
6. Adds to the user's `PATH` (if not already)
7. Prints the version

The script is **idempotent** — re-running updates to the latest version.

### Shell completions

The script also generates shell completions:

```sh
# zsh
eval "$(omp completions zsh)"

# bash
eval "$(omp completions bash)"

# fish
omp completions fish > ~/.config/fish/completions/omp.fish
```

The completions are generated **from the live command/flag metadata**, so they never drift from the actual CLI. Subcommands, flags, and enum values complete statically; model names (`--model`, `--smol`, `--slow`, `--plan`) resolve against the bundled model catalog; `--resume` against your on-disk sessions.

## Path 2: Homebrew

```sh
# macOS · Linux
brew install can1357/tap/omp
```

The tap is `github.com/can1357/homebrew-tap` (or similar — verify with `brew tap-info`). The formula is auto-generated from each release.

## Path 3: Bun global

```sh
bun install -g @oh-my-pi/pi-coding-agent
```

This installs the npm package. The `omp` binary is at `node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js`. Bun adds it to your `PATH` automatically.

This path is **recommended for Bun users** — the binary is built and tested with Bun.

## Path 4: PowerShell (Windows)

```powershell
irm https://omp.sh/install.ps1 | iex
```

The PowerShell script mirrors the bash script:

1. Detects arch (x64 / arm64)
2. Downloads `omp-<version>-windows-<arch>.zip`
3. Verifies SHA-256 + signature
4. Extracts to `%LOCALAPPDATA%\Programs\omp\`
5. Adds to user PATH
6. Registers the binary in Windows Defender allowlist (optional)

## Path 5: Docker

```bash
docker pull ghcr.io/can1357/omp:latest
docker run -it --rm \
  -v $(pwd):/workspace \
  -e ANTHROPIC_API_KEY \
  ghcr.io/can1357/omp:latest
```

The image is based on `oven/bun:1.3.14-slim` (Debian slim + Bun). It includes:

- The `omp` binary
- All Rust native modules
- The default model catalog
- Shell completions (zsh, bash, fish)

Mount your project at `/workspace`. Inject API keys via env vars. The agent's writes go to the mounted volume.

### The `robomp` image

A separate image for the **robomp** (agent-as-a-service) server:

```bash
docker pull ghcr.io/can1357/robomp:latest
docker run -d -p 8080:8080 \
  -e ANTHROPIC_API_KEY \
  ghcr.io/can1357/robomp:latest
```

`robomp` is a long-running HTTP service. See [pi-wire](/docs/12-pi-wire) for the protocol.

## Path 6: mise (version pinning)

```sh
mise use -g github:can1357/oh-my-pi
```

`mise` (formerly rtx) is a version manager. It pins `omp` to a specific version in `~/.config/mise/config.toml`. Use this if you want **reproducible installs** (e.g. in CI).

## First-run

When `omp` runs for the first time:

```bash
$ omp
╭──────────────────────────────────────╮
│ omp · v15.12.3                       │
│ claude-opus-4-5 · 0.79.1             │
╰──────────────────────────────────────╯

No API key found for anthropic. Choose a provider:
  1. Anthropic (API key)
  2. OpenAI (API key)
  3. OpenAI Codex (OAuth)
  4. Google Gemini (API key or OAuth)
  5. OpenRouter (API key)
  ... (40+ providers)

>
```

`omp` walks you through:

1. **Provider selection** — pick from 42 providers
2. **API key** — paste it; `omp` stores in the OS keychain (via `@napi-rs/keyring`)
3. **Model selection** — pick the default model (filtered by capability)
4. **Theme** — pick a TUI theme
5. **Project trust** — confirm whether to trust the current directory

Settings are persisted at `~/.omp/settings.json`. API keys are in the OS keychain (Keychain on macOS, libsecret on Linux, Credential Manager on Windows).

## Self-update

```bash
omp update --self
```

The self-update:

1. Queries the GitHub releases API for the latest version
2. Compares to the current version
3. Downloads the binary for the current platform
4. Verifies the signature
5. Atomically replaces the running binary (`mv`)
6. Restarts the current session (if any)

The `--ignore-scripts` flag is set automatically (self-update doesn't need lifecycle scripts).

## Updating via Homebrew

```bash
brew update && brew upgrade omp
```

Standard Homebrew flow. The formula auto-bumps on each GitHub release.

## Updating via Bun

```bash
bun update -g @oh-my-pi/pi-coding-agent
```

Standard Bun flow.

## Configuration files

Three locations:

| File | Scope | Priority |
|------|-------|----------|
| `~/.omp/settings.json` | Global | Low |
| `.omp/settings.json` | Project | Medium |
| CLI flags | Session | High |

Settings are **merged** in priority order. CLI flags override project overrides global.

## API key resolution

omp resolves API keys in this order:

1. **Process env** (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc.)
2. **OS keychain** (the entry `omp:<provider>`)
3. **OAuth** (refreshed token from `omp-rpc/oauth.json`)
4. **Interactive prompt** (fallback if none of the above)

The user can override per-provider in settings:

```json
{
  "providers": {
    "anthropic": {
      "apiKey": "${ANTHROPIC_API_KEY}",
      "host": "https://api.anthropic.com"
    }
  }
}
```

`${ENV_VAR}` placeholders are resolved at session start.

## Project-specific config

`.omp/settings.json` in a project is **read but not executed by default**. The user is prompted to trust the project on first run, then `.omp/settings.json` is applied.

This protects against a malicious project from auto-applying settings (e.g. redirecting API calls to an attacker).

## Keychain storage

API keys are stored in the OS keychain:

- **macOS** — Keychain
- **Linux** — `libsecret` (GNOME Keyring, KWallet, ...)
- **Windows** — Credential Manager

The wrapper is `@napi-rs/keyring` (in `packages/ai/src/auth-storage.ts`). Keys are namespaced to `omp` (or `omp-<projectId>` for project-specific keys).

To list/remove keys:

```bash
# macOS
security find-generic-password -s omp
security delete-generic-password -s omp

# Linux (GNOME)
secret-tool search service omp
secret-tool clear service omp
```

## The snapshot system

`pi-iso` snapshots are stored at:

```
.omp/snapshots/<projectId>/<sessionId>/
```

Each snapshot is a `pi-iso` filesystem clone (BTRFS reflink, APFS clone, or overlayfs mount). The snapshots are **O(1) to create** (metadata only) and **O(diff size) to restore**.

## The session store

```
.omp/sessions/<projectId>/<sessionId>/
├── session.json
├── messages.jsonl
├── checkpoints/
└── debug/
```

Same as pi-mono, with the addition of `checkpoints/` (filesystem snapshots).

## The memory store

```
.omp/memory/
├── user/
├── project/
└── sessions/<sessionId>/
```

Same as pi-mono's `~/.pi/memory/`, with the addition of `sessions/` (per-session memory) and the `index.json` files (embedding index for semantic search).

## The telemetry config

```json
{
  "telemetry": {
    "enabled": true,
    "exporter": "otlp",
    "endpoint": "http://localhost:4318/v1/traces"
  }
}
```

By default, telemetry is **disabled**. To enable, set `enabled: true` and point to your collector. See [omp-stats](/docs/15-omp-stats) for the OTel setup.

## The containerization patterns

Three patterns for running `omp` in a sandbox:

### OpenShell

```bash
openshell run --policy=policy.yaml -- omp
```

Policy controls filesystem, network, process, credential access.

### Gondolin

See [`swarm-extension`](/docs/16-swarm-extension) or use the official `gondolin` extension:

```bash
omp --ext gondolin
```

Routes `bash` and `!` commands into a Linux micro-VM.

### Plain Docker

```bash
docker run -it --rm \
  -v $(pwd):/workspace \
  -e ANTHROPIC_API_KEY \
  ghcr.io/can1357/omp:latest
```

Standard container isolation.

## Cross-platform notes

### Windows

- Use **PowerShell 7+** (not `cmd.exe`)
- The binary is named `omp.exe`
- Long paths (>260 chars) need `LongPathsEnabled` in the registry
- The TUI works in Windows Terminal; ConPTY is used for proper TTY emulation

### macOS

- Apple Silicon (M1+) and Intel are both supported
- Homebrew is the recommended install path
- The TUI uses native Cocoa (via the Rust key parser)

### Linux

- glibc 2.31+ (Ubuntu 20.04, Debian 11, RHEL 8+)
- For BTRFS snapshots, the filesystem must be BTRFS (or overlayfs in containers)
- The TUI works in all major terminals (gnome-terminal, konsole, alacritty, kitty, wezterm)

## Verifying the install

```bash
omp --version
omp --help
omp doctor         # (planned) — runs diagnostics
```

`omp doctor` checks:

- Binary version vs latest
- API key resolution
- Network reachability to the provider's base URL
- Disk space for session JSONL + snapshots
- Telemetry endpoint (if enabled)
- LSP servers available (per detected language)

## Uninstalling

```bash
# Install script
rm /usr/local/bin/omp              # macOS / Linux
rmdir "%LOCALAPPDATA%\Programs\omp"   # Windows

# Homebrew
brew uninstall omp

# Bun
bun uninstall -g @oh-my-pi/pi-coding-agent

# Cleanup
rm -rf ~/.omp                      # settings, sessions, memory
rm -rf .omp                        # project-local
```

The uninstall leaves **no traces** — the keychain entries, settings, sessions, memory, and snapshots are all under `~/.omp/`.

## CI usage

```yaml
# GitHub Actions
- uses: can1357/oh-my-pi/setup-action@v1
  with:
    version: 15.12.3
- run: omp --print "Fix the linter errors" 2>&1 | tee /tmp/omp.log
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

The `setup-action` installs `omp` to the runner. `--print` is the one-shot mode.

## The install script source

The install script is in `install/install.sh` and `install/install.ps1` in the repo. They:

- Are < 200 lines each (auditable)
- Use `set -euo pipefail` / `$ErrorActionPreference = "Stop"`
- Verify SHA-256 + cosign signature
- Don't pipe to `sh` from the network (download to a temp file first, then execute)

## Next

- [pi-coding-agent · CLI](/docs/05-pi-coding-agent) — what gets installed
- [Build & Release](#build--release) — how the binary is produced
- [Security](#security--supply-chain) — supply-chain hardening
