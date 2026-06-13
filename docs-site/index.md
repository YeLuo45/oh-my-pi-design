---
layout: home

hero:
  name: "oh-my-pi"
  text: "内嵌 IDE 的编码 Agent"
  tagline: "Can Boluk 的 pi-mono 分支 —— Rust 核心带来极致性能、LSP/DAP 实现 IDE 级别能力、40+ 提供方、32 个工具。"
  actions:
    - theme: brand
      text: 快速开始 →
      link: /architecture
    - theme: alt
      text: 在 GitHub 上查看
      link: https://github.com/can1357/oh-my-pi

features:
  - title: "🦀 Rust 核心（约 5.5 万行代码）"
    details: "三个原生 crate —— pi-ast（AST 与编辑）、pi-shell（进程与 minimizer）、pi-iso（文件系统隔离；APFS、BTRFS、overlayfs、projfs、reflink）。通过 NAPI 编译为单一 .node 二进制，热路径提速约 10 倍。"
  - title: "🧠 40+ LLM 提供方"
    details: "在 pi-mono 原有 8 个提供方的基础上扩展 32 个。Anthropic、OpenAI、Google、Mistral,以及 Bedrock、Vertex、Azure、DeepSeek、Groq、Fireworks、Together、OpenRouter、自定义端点等 20+ 平台。"
  - title: "🛠️ 32 个内置工具"
    details: "read、write、edit、bash、glob、grep、process、web_search、fetch_url、memory_*、todo_write、skill、hashline、snap、restore、lsps、daps 等 —— 全部通过 TypeBox schema 保证类型安全，并提供与 Rust 核心对接的 TypeScript 绑定。"
  - title: "🔌 LSP · 14 个操作"
    details: "一等公民级别的 Language Server Protocol 支持。14 个操作，包括 hover、definition、references、completion、signatureHelp、codeAction、rename、format、rangeFormat、prepareRename、documentSymbol、semanticTokens、inlayHint、diagnostic。"
  - title: "🐛 DAP · 28 个操作"
    details: "Debug Adapter Protocol 28 个操作。launch、attach、setBreakpoints、continue、next、stepIn、stepOut、pause、threads、stackTrace、scopes、variables、evaluate、watch、setVariable、source、exceptionInfo、loadedSources 等。"
  - title: "📚 pi-catalog · 模型身份"
    details: "集中化的模型元数据。身份信息（id、name、api、provider、baseUrl）、能力（reasoning、工具、vision、caching）、effort 等级、成本、上下文窗口、废弃状态。提供兼容层支持旧版模型 id。"
  - title: "🧮 snapcompact · 快照+压缩"
    details: "混合持久化方案。消息采用仅追加的 JSONL,文件系统状态采用周期性快照（借助 pi-iso 的 reflink/copy-on-write 实现）。压缩策略同时结合两者 —— 既裁剪旧消息,又能回滚文件系统变更。"
  - title: "🌐 collab-web · React 19 UI"
    details: "与 TUI 并列的协作 Web UI。React 19 + Vite + Tailwind 4。实时多人会话、共享终端、共享消息历史。Web 端与 TUI 是对等节点,而不是一个独立产品。"
  - title: "📊 omp-stats · OpenTelemetry"
    details: "通过 OpenTelemetry SDK 内建遥测。OTLP 导出器输出 traces 与 metrics。追踪 token 用量、延迟、工具执行时间、LLM 往返次数、错误率。Wire 协议与 Datadog、Honeycomb、Tempo 兼容。"
  - title: "🐝 swarm-extension · 子 Agent"
    details: "派生子 Agent 以并行执行任务。每个子 Agent 都是一个完整的 pi-coding-agent 实例,拥有自己的模型、工具与会话。支持递归派生（子 Agent 可以再派生子 Agent）。4 种 swarm 编排策略。"
  - title: "🪟 pi-iso · 文件系统隔离"
    details: "针对不同操作系统选用合适原语实现跨平台文件系统隔离。macOS 上使用 APFS clones、Linux 上使用 BTRFS reflinks、容器内使用 overlayfs、Windows 上使用 projfs。为 Agent 提供廉价 fork,实现即时回滚。"
  - title: "🔐 Bun + Rust + npm catalog"
    details: "Bun 1.3.14 作为运行时、Rust 2024 edition、npm catalog 钉住依赖版本、Biome 用于代码检查、tsgo 提供原生 TS 编译、Cargo workspace 配置 4 个 profile（release、ci、local、dev）。"

---

## 相比 pi-mono 有什么新变化

oh-my-pi 是 **pi-mono + Rust** —— pi-mono 的每一层都获得了更快的原生实现,此外还新增了 4 类能力:

| 层 | pi-mono | oh-my-pi |
|------|---------|----------|
| AST 编辑 | `edit`（子串匹配） | `hashline`（line+hash 格式,100% 安全） |
| Shell | `bash`（Node spawn） | `pi-shell`（Rust,带命令 minimizer） |
| 文件系统 | 直接读写 | `pi-iso`（reflink/overlay/clone 回滚） |
| 提供方 | 8 | 40+（新增 32 个） |
| 工具 | 30+ | 32（整合 + Rust 加速） |
| LSP | 无 | 14 个操作 |
| DAP | 无 | 28 个操作 |
| 持久化 | JSONL | snapcompact（JSONL + 快照） |
| Web UI | pixel-pal-web（Electron） | collab-web（React 19,多用户） |
| 遥测 | 无 | OpenTelemetry（OTLP traces + metrics） |
| 子 Agent | 无 | swarm-extension（可递归） |

## 接下来读什么?

- 新人?阅读 [架构概览](/architecture) 了解全局视图。
- 从 pi-mono 迁移过来?查看 [Rust 核心](/docs/01-rust-core) 了解所有变化。
- 正在开发工具?从 [32 个内置工具](/docs/09-tools) 与 [pi-wire](/docs/12-pi-wire) 入手。
- 想了解 IDE 集成?请看 [LSP](/docs/06-lsp) 与 [DAP](/docs/07-dap)。
- 准备部署?跳转到 [部署](/docs/17-deployment)。
