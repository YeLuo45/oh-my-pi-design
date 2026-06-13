# 17 · 部署与安装

oh-my-pi 提供 **5 种可安装形态**：官方安装脚本（推荐）、Homebrew tap、npm、Bun 全局安装，以及 GitHub Release 预编译二进制。这 5 种方式都会安装同一个 `omp` 二进制。选择哪一种取决于你的平台和偏好的更新流程。

**源码：** `install/install.sh`、`install/install.ps1`、`Formula/omp.rb`、`Dockerfile`、`Dockerfile.robomp`

## 5 种安装路径

| 路径 | 平台 | 时间 | 更新方式 |
|------|----------|------|---------|
| **`curl \| sh`** | macOS · Linux | 约 5s | `omp update --self` |
| **Homebrew** | macOS · Linux | 约 30s | `brew upgrade omp` |
| **Bun global** | 全部 | 约 30s | `bun update -g` |
| **PowerShell** | Windows | 约 5s | `omp update --self` |
| **Docker** | 全部 | 约 10s | 重新拉取镜像 |
| **mise** | 全部 | 约 5s | `mise use -g github:can1357/oh-my-pi` |

## 路径 1：安装脚本（推荐）

```sh
# macOS · Linux
curl -fsSL https://omp.sh/install | sh
```

该脚本会：

1. 探测操作系统（macOS / Linux）和架构（arm64 / x64）
2. 从最新的 GitHub Release 下载匹配的 `omp-<version>-<os>-<arch>.tar.gz`
3. 校验 SHA-256 校验和
4. 校验签名（使用 `cosign verify` 校验维护者密钥）
5. 解压到 `/usr/local/bin/omp`（没有 sudo 时解压到 `~/.local/bin/omp`）
6. 加入用户的 `PATH`（若尚未添加）
7. 输出版本号

该脚本是 **幂等** 的 —— 重复运行会更新到最新版本。

### Shell 补全

脚本还会生成 shell 补全：

```sh
# zsh
eval "$(omp completions zsh)"

# bash
eval "$(omp completions bash)"

# fish
omp completions fish > ~/.config/fish/completions/omp.fish
```

补全是根据 **运行时的命令 / 标志元数据** 动态生成的，因此永远不会与实际 CLI 偏离。子命令、标志、枚举值以静态方式补全；模型名（`--model`、`--smol`、`--slow`、`--plan`）对照内置的模型目录解析；`--resume` 对照磁盘上的会话解析。

## 路径 2：Homebrew

```sh
# macOS · Linux
brew install can1357/tap/omp
```

Tap 为 `github.com/can1357/homebrew-tap`（或类似名称 —— 可用 `brew tap-info` 校验）。Formula 是从每个 Release 自动生成的。

## 路径 3：Bun 全局安装

```sh
bun install -g @oh-my-pi/pi-coding-agent
```

这会安装 npm 包。`omp` 二进制位于 `node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js`。Bun 会自动把它加到你的 `PATH`。

这条路径 **推荐给 Bun 用户** —— 二进制是使用 Bun 构建和测试的。

## 路径 4：PowerShell（Windows）

```powershell
irm https://omp.sh/install.ps1 | iex
```

PowerShell 脚本是 bash 脚本的镜像：

1. 探测架构（x64 / arm64）
2. 下载 `omp-<version>-windows-<arch>.zip`
3. 校验 SHA-256 + 签名
4. 解压到 `%LOCALAPPDATA%\Programs\omp\`
5. 加入用户 PATH
6. 将二进制登记到 Windows Defender 白名单（可选）

## 路径 5：Docker

```bash
docker pull ghcr.io/can1357/omp:latest
docker run -it --rm \
  -v $(pwd):/workspace \
  -e ANTHROPIC_API_KEY \
  ghcr.io/can1357/omp:latest
```

镜像基于 `oven/bun:1.3.14-slim`（Debian slim + Bun）。其中包括：

- `omp` 二进制
- 全部 Rust 原生模块
- 默认模型目录
- Shell 补全（zsh、bash、fish）

把你的项目挂载到 `/workspace`。通过环境变量注入 API key。Agent 的写入会落到挂载的卷上。

### `robomp` 镜像

一个独立的镜像，用于 **robomp**（Agent 即服务）服务器：

```bash
docker pull ghcr.io/can1357/robomp:latest
docker run -d -p 8080:8080 \
  -e ANTHROPIC_API_KEY \
  ghcr.io/can1357/robomp:latest
```

`robomp` 是一个长生命周期的 HTTP 服务。协议参见 [pi-wire](/docs/12-pi-wire)。

## 路径 6：mise（版本钉死）

```sh
mise use -g github:can1357/oh-my-pi
```

`mise`（前身是 rtx）是一个版本管理器。它会把 `omp` 钉到 `~/.config/mise/config.toml` 中的某个具体版本。在你希望 **可复现的安装**（比如 CI 中）时使用。

## 首次运行

`omp` 首次运行时会：

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

`omp` 会引导你完成：

1. **选择提供方** — 从 42 个提供方中挑选
2. **API key** — 粘贴即可；`omp` 会存储到操作系统的 keychain（通过 `@napi-rs/keyring`）
3. **选择模型** — 选择默认模型（按能力过滤）
4. **主题** — 选择一个 TUI 主题
5. **项目信任** — 确认是否信任当前目录

设置保存在 `~/.omp/settings.json`。API key 存储在操作系统的 keychain（macOS 的 Keychain、Linux 的 libsecret、Windows 的 Credential Manager）。

## 自更新

```bash
omp update --self
```

自更新流程：

1. 查询 GitHub Releases API 获取最新版本
2. 与当前版本对比
3. 下载当前平台的二进制
4. 校验签名
5. 以原子操作替换运行中的二进制（`mv`）
6. 重启当前会话（如果有）

`--ignore-scripts` 标志会自动设置（自更新不需要 lifecycle 脚本）。

## 通过 Homebrew 更新

```bash
brew update && brew upgrade omp
```

标准 Homebrew 流程。Formula 在每次 GitHub Release 时自动 bump。

## 通过 Bun 更新

```bash
bun update -g @oh-my-pi/pi-coding-agent
```

标准 Bun 流程。

## 配置文件

三个位置：

| 文件 | 作用域 | 优先级 |
|------|-------|----------|
| `~/.omp/settings.json` | 全局 | 低 |
| `.omp/settings.json` | 项目 | 中 |
| CLI 标志 | 会话 | 高 |

设置按优先级顺序 **合并**。CLI 标志覆盖项目设置，项目设置覆盖全局设置。

## API key 解析

omp 按以下顺序解析 API key：

1. **进程环境变量**（`ANTHROPIC_API_KEY`、`OPENAI_API_KEY` 等）
2. **操作系统 keychain**（条目 `omp:<provider>`）
3. **OAuth**（从 `omp-rpc/oauth.json` 刷新得到的 token）
4. **交互式提示**（上述都没有时的回退）

用户可以在 settings 中按提供方覆盖：

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

`${ENV_VAR}` 占位符会在会话开始时被解析。

## 项目专属配置

项目下的 `.omp/settings.json` **默认会被读取但不会被执行**。用户会在首次运行时收到提示信任该项目，确认后 `.omp/settings.json` 才会被应用。

这能防止恶意项目自动应用配置（比如把 API 调用重定向到攻击者）。

## Keychain 存储

API key 存储在操作系统的 keychain 中：

- **macOS** — Keychain
- **Linux** — `libsecret`（GNOME Keyring、KWallet ……）
- **Windows** — Credential Manager

封装层是 `@napi-rs/keyring`（位于 `packages/ai/src/auth-storage.ts`）。Key 按 `omp`（或 `omp-<projectId>` 用于项目专属 key）进行命名空间隔离。

列出 / 移除 key：

```bash
# macOS
security find-generic-password -s omp
security delete-generic-password -s omp

# Linux (GNOME)
secret-tool search service omp
secret-tool clear service omp
```

## 快照系统

`pi-iso` 快照存储于：

```
.omp/snapshots/<projectId>/<sessionId>/
```

每个快照都是一份 `pi-iso` 文件系统克隆（BTRFS reflink、APFS clone，或 overlayfs 挂载）。快照的 **创建是 O(1)**（只写元数据），**恢复是 O(差异大小)**。

## 会话存储

```
.omp/sessions/<projectId>/<sessionId>/
├── session.json
├── messages.jsonl
├── checkpoints/
└── debug/
```

与 pi-mono 相同，新增 `checkpoints/`（文件系统快照）。

## 记忆存储

```
.omp/memory/
├── user/
├── project/
└── sessions/<sessionId>/
```

与 pi-mono 的 `~/.pi/memory/` 相同，新增 `sessions/`（每个会话的记忆）以及 `index.json` 文件（用于语义搜索的 embedding 索引）。

## 遥测配置

```json
{
  "telemetry": {
    "enabled": true,
    "exporter": "otlp",
    "endpoint": "http://localhost:4318/v1/traces"
  }
}
```

遥测默认 **关闭**。要启用，请把 `enabled` 设为 `true` 并指向你的 collector。OTel 配置参见 [omp-stats](/docs/15-omp-stats)。

## 容器化模式

在沙盒中运行 `omp` 有 3 种模式：

### OpenShell

```bash
openshell run --policy=policy.yaml -- omp
```

Policy 控制文件系统、网络、进程、凭据的访问。

### Gondolin

参见 [`swarm-extension`](/docs/16-swarm-extension) 或使用官方 `gondolin` 扩展：

```bash
omp --ext gondolin
```

把 `bash` 和 `!` 命令路由到一个 Linux micro-VM。

### 普通 Docker

```bash
docker run -it --rm \
  -v $(pwd):/workspace \
  -e ANTHROPIC_API_KEY \
  ghcr.io/can1357/omp:latest
```

标准容器隔离。

## 跨平台注意事项

### Windows

- 使用 **PowerShell 7+**（不要使用 `cmd.exe`）
- 二进制名为 `omp.exe`
- 长路径（>260 字符）需要在注册表中开启 `LongPathsEnabled`
- TUI 可以在 Windows Terminal 中运行；使用 ConPTY 进行正确的 TTY 仿真

### macOS

- 同时支持 Apple Silicon（M1+）和 Intel
- 推荐使用 Homebrew 安装
- TUI 使用原生 Cocoa（通过 Rust 键解析器）

### Linux

- glibc 2.31+（Ubuntu 20.04、Debian 11、RHEL 8+）
- 使用 BTRFS 快照时，文件系统必须是 BTRFS（容器中可用 overlayfs）
- TUI 能在所有主流终端中工作（gnome-terminal、konsole、alacritty、kitty、wezterm）

## 校验安装

```bash
omp --version
omp --help
omp doctor         # （规划中）运行诊断
```

`omp doctor` 会检查：

- 二进制版本是否为最新
- API key 解析
- 到提供方 base URL 的网络可达性
- 用于存放会话 JSONL + 快照的磁盘空间
- 遥测端点（如已启用）
- 可用的 LSP 服务器（按检测到的语言）

## 卸载

```bash
# 安装脚本
rm /usr/local/bin/omp              # macOS / Linux
rmdir "%LOCALAPPDATA%\Programs\omp"   # Windows

# Homebrew
brew uninstall omp

# Bun
bun uninstall -g @oh-my-pi/pi-coding-agent

# 清理
rm -rf ~/.omp                      # 设置、会话、记忆
rm -rf .omp                        # 项目本地
```

卸载 **不留下任何痕迹** —— keychain 条目、设置、会话、记忆以及快照全部位于 `~/.omp/` 下。

## CI 中使用

```yaml
# GitHub Actions
- uses: can1357/oh-my-pi/setup-action@v1
  with:
    version: 15.12.3
- run: omp --print "Fix the linter errors" 2>&1 | tee /tmp/omp.log
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

`setup-action` 会把 `omp` 安装到 runner。`--print` 是一次性模式。

## 安装脚本源码

安装脚本位于仓库中的 `install/install.sh` 和 `install/install.ps1`。它们：

- 均 < 200 行（可审计）
- 使用 `set -euo pipefail` / `$ErrorActionPreference = "Stop"`
- 校验 SHA-256 + cosign 签名
- 不直接从网络 pipe 到 `sh`（先下载到临时文件，再执行）

## 下一篇

- [pi-coding-agent · CLI](/docs/05-pi-coding-agent) — 安装的具体内容
- [Build & Release](#build--release) — 二进制是如何产出的
- [Security](#security--supply-chain) — 供应链加固
