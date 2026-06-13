# 技术栈

oh-my-pi 在设计上就是多语言的:**Rust 2024 负责性能关键路径,TypeScript 5.x 负责 Agent 运行时,React 19 负责 Web,Python 3.12+ 负责可选的 RPC 服务器,所有这一切由 Bun 1.3.14 串接起来**。版本钉得很死（npm catalog + Cargo workspace）,构建也是逐 crate + 逐包进行的。

## 核心技术栈

| 层 | 技术 | 版本 | 选择理由 |
|------|------|---------|-----|
| 运行时 | Bun | 1.3.14 | `packageManager: "bun@1.3.14"`;冷启动 200ms;内置 TS |
| 编译器 | TypeScript（原生） | 7.0.0-dev（通过 tsgo） | 由 `pi-coding-agent` 等使用 |
| 备用编译器 | TypeScript（标准） | 5.9.x | 由 `collab-web` 等 Web 包使用 |
| 构建 | tsgo + esbuild | 7.0.0-dev / 0.28.0 | 每个包执行 `tsgo -p tsconfig.build.json` |
| Linter | Biome | ^2.4.16 | `biome check --write --error-on-warnings` |
| 原生层 | Rust | 2024 edition | `rust-toolchain.toml` 锁定工具链 |
| Cargo workspace | cargo | 最新 stable | 4 个 profile:release、ci、local、dev |
| 原生绑定 | NAPI | @napi-rs/cli 3.7.0 | `napi build --platform --release` |
| Web 框架 | React | 19.2.x | `collab-web`;concurrent 特性 |
| 构建（Web） | Vite | 6.x | `@tailwindcss/vite` 4.3.0 |
| CSS | Tailwind CSS | 4.3.0 | `tailwindcss/vite` 4.3.0 |
| 遥测 | OpenTelemetry | api 1.9.1 / sdk 2.7.1 | OTLP proto exporter |
| Protobuf | bufbuild | ^2.12.0 | TypeScript + Python 代码生成 |
| Bash 解析器 | brush（vendored） | git subtree | Shell AST + minimizer |
| Python | Python | 3.12+ | `omp-rpc` 与 `robomp` |
| LSP | vscode-languageserver-protocol | latest | 14 个 LSP 操作 |
| DAP | vscode-debugadapter-protocol | latest | 28 个 DAP 操作 |
| 沙箱 | Anthropic sandbox-runtime | 0.0.26 | 可选,通过扩展 |
| VM 隔离 | Gondolin | latest | 可选,通过扩展 |

## Bun catalog

`package.json` 使用 Bun 的 **catalog** 功能来锁定 workspace 内共享依赖的版本:

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
      // ... 50+ 共享依赖
    }
  }
}
```

Bun 把 `catalog:` 引用解析为精确钉住的版本,所有 15 个包使用相同的 `react@19.2.x`（无 semver 范围,无漂移）。

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
inherits = "release"  # dev 构建仍然启用 fat LTO
```

四个 profile,每个都为使用场景精心调优:

- **`release`** —— 生产构建,完整 LTO,符号已剥离,`panic = "abort"` 让二进制更小
- **`ci`** —— 构建稍快（thin LTO、16 个 codegen units）,剥离符号（仍然很小）
- **`local`** —— 构建时间最快（thin LTO、16 个 codegen units、incremental）
- **`dev`** —— 与 local 相同但开启完整 LTO（运行时更快,编译更慢）

`[patch.crates-io]` 块 **钉住** vendored 的 `brush-core` 与 `brush-builtins`,确保它们始终来自 `crates/*`（而非网络）。

## 逐包技术细节

### `crates/pi-ast`

| 依赖 | 用途 |
|-----|---------|
| `brush-core`（vendored） | Shell 解析器 |
| `tree-sitter`（多语言） | AST 解析 |
| `napi` | 到 TS 的 NAPI 绑定 |
| `napi-derive` | `#[napi]` 过程宏 |

### `crates/pi-shell`

| 依赖 | 用途 |
|-----|---------|
| `tokio` | 异步运行时 |
| `processes` | 跨平台进程控制 |
| `brush-builtins`（vendored） | Shell 内建命令 |
| `napi` / `napi-derive` | NAPI 绑定 |

### `crates/pi-iso`

| 依赖 | 用途 |
|-----|---------|
| `tokio` | 异步运行时 |
| `nix` | Unix 系统调用（BTRFS、APFS） |
| `windows` | Windows ProjFS（在 `cfg(windows)` 之后） |
| `capctl` | Linux capabilities |
| `napi` / `napi-derive` | NAPI 绑定 |

### `packages/pi-`（`@oh-my-pi/pi-ai`）

| 依赖 | 版本 | 用途 |
|-----|---------|---------|
| `@oh-my-pi/pi-catalog` | 15.12.3 | 模型身份 |
| `@oh-my-pi/pi-utils` | 15.12.3 | 共享类型 |
| `typebox` | 1.x | JSON schema + 静态类型 |
| `yaml` | 2.9.x | 用于 catalog 的 YAML 解析 |
| `ignore` | 7.x | gitignore 风格 glob |

### `packages/pi-agent-core`（`@oh-my-pi/pi-agent-core`）

| 依赖 | 版本 | 用途 |
|-----|---------|---------|
| `@oh-my-pi/pi-ai` | 15.12.3 | LLM 层 |
| `@oh-my-pi/pi-catalog` | 15.12.3 | 模型身份 |
| `@oh-my-pi/pi-utils` | 15.12.3 | 共享类型 |
| `@oh-my-pi/pi-mnemopi` | 15.12.3 | 记忆 |
| `typebox` | 1.x | 重新导出 |
| `yaml` | 2.9.x | skill manifest |
| `ignore` | 7.x | 工具过滤器 |

### `packages/pi-coding-agent`（`@oh-my-pi/pi-coding-agent`）

| 依赖 | 版本 | 用途 |
|-----|---------|---------|
| `@oh-my-pi/pi-agent-core` | 15.12.3 | 运行时 |
| `@oh-my-pi/pi-ai` | 15.12.3 | LLM |
| `@oh-my-pi/pi-catalog` | 15.12.3 | 模型 |
| `@oh-my-pi/pi-tui` | 15.12.3 | TUI |
| `@oh-my-pi/pi-utils` | 15.12.3 | 类型 |
| `@oh-my-pi/pi-natives` | 15.12.3 | NAPI |
| `@oh-my-pi/hashline` | 15.12.3 | 编辑原语 |
| `@oh-my-pi/pi-mnemopi` | 15.12.3 | 记忆 |
| `@oh-my-pi/pi-wire` | 15.12.3 | 跨进程 |
| `@oh-my-pi/snapcompact` | 15.12.3 | 持久化 |
| `@oh-my-pi/omp-stats` | 15.12.3 | 遥测 |
| `@agentclientprotocol/sdk` | 0.22.1 | Agent Client Protocol |
| `@babel/generator` / `parser` / `traverse` / `types` | ^7.29.7 | AST 操作 |
| `chalk` | 5.6.x | CLI 颜色 |
| `commander` | 12.x | Argv 解析 |
| `cross-spawn` | 7.x | 跨平台 spawn |
| `diff` | 8.x | 差异渲染 |
| `glob` | 13.x | 文件 pattern |
| `highlight.js` | 10.7.x | 代码高亮 |
| `ignore` | 7.x | 工具过滤器 |
| `pino` | 9.x | 结构化日志 |
| `tar` | 7.x | tarball 支持 |
| `turndown` | 7.x | HTML 转 MD |
| `vscode-languageserver-protocol` | 3.x | LSP |
| `vscode-debugadapter-protocol` | 1.x | DAP |
| `vscode-jsonrpc` | 8.x | LSP/DAP 的 JSON-RPC |
| `vscode-uri` | 3.x | URI 处理 |
| `web-tree-sitter` | 0.25.x | WASM tree-sitter |

### `packages/collab-web`（`@oh-my-pi/collab-web`）

| 依赖 | 版本 | 用途 |
|-----|---------|---------|
| `react` | 19.2.x | UI |
| `react-dom` | 19.2.x | 渲染器 |
| `vite` | 6.x | 构建 |
| `@vitejs/plugin-react` | 4.x | React HMR |
| `@tailwindcss/vite` | 4.3.0 | Tailwind |
| `tailwindcss` | 4.3.0 | 工具类 CSS |
| `lucide-react` | 0.4xx | 图标 |
| `xterm` | 5.5.x | 终端模拟器 |
| `xterm-addon-fit` | 0.8.x | 让终端适配容器 |
| `@xterm/xterm` | 5.5.x | 新的 xterm scoped 包 |
| `zustand` | 5.x | 状态管理 |
| `@bufbuild/protobuf` | ^2.12.0 | Protobuf 运行时 |
| `idb` | 8.x | IndexedDB 封装 |

### `packages/omp-stats`（`@oh-my-pi/omp-stats`）

| 依赖 | 版本 | 用途 |
|-----|---------|---------|
| `@opentelemetry/api` | ^1.9.1 | OTel API |
| `@opentelemetry/context-async-hooks` | ^2.7.1 | 异步上下文 |
| `@opentelemetry/exporter-trace-otlp-proto` | ^0.218.0 | OTLP 导出器 |
| `@opentelemetry/resources` | ^2.7.1 | 资源属性 |
| `@opentelemetry/sdk-trace-base` | ^2.7.1 | SDK |
| `@opentelemetry/sdk-trace-node` | ^2.7.1 | Node SDK |
| `@opentelemetry/semantic-conventions` | ^1.x | 语义属性 |
| `@opentelemetry/instrumentation` | ^0.5x.x | 自动插桩 |
| `@huggingface/transformers` | ^4.2.0 | 可选本地 LLM metrics |

### `python/omp-rpc` + `python/robomp`

| 依赖 | 用途 |
|-----|---------|
| `protobuf` | Wire 格式 |
| `grpcio` | RPC 传输 |
| `asyncio` | 异步 I/O |
| `pydantic` | schema 校验 |
| `typer` | CLI |
| `uvicorn` | ASGI 服务器 |
| `httpx` | HTTP 客户端 |

## TypeScript 配置

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

新增的 `noUncheckedIndexedAccess: true` 是相对 pi-mono 的严格化升级 —— 数组下标访问返回 `T | undefined`,强制显式 null 检查。

## Workspace engines

```json
"engines": {
  "bun": ">=1.3.14",
  "node": ">=22.19.0"
}
```

Bun 是首选运行时,Node 是受支持的回退运行时（用于 `collab-web` 部署、CI 等场景）。

## 构建命令

```bash
# 在仓库根目录（Bun）
bun install                    # 填充 workspace
bun run build                  # 构建所有包 + crate
bun run check                  # biome + 类型检查 + lint
bun test                       # 运行测试（Bun 原生）

# 在仓库根目录（Cargo）
cargo build --release          # 构建所有 Rust crate
cargo test --workspace         # 运行所有 Rust 测试

# 单包
cd packages/coding-agent
bun run build                  # 构建此包
bun test                       # 测试此包

# 单 crate
cd crates/pi-iso
cargo build --release          # 构建此 crate
cargo test                     # 测试此 crate
```

## 运行时版本要求

- **Bun ≥ 1.3.14** —— 主要运行时
- **Node ≥ 22.19.0** —— 回退运行时
- **Rust ≥ 1.85** —— 构建原生 crate（2024 edition）
- **Python ≥ 3.12** —— omp-rpc + robomp

## Docker

两个 Dockerfile:

- `Dockerfile`（主）—— `omp` CLI,基于 slim 镜像
- `Dockerfile.robomp` —— `robomp`（agent-as-a-service）,镜像稍大,含 Python

两者都使用多阶段构建:

```dockerfile
# Stage 1: 构建
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

# Stage 2: 运行时
FROM debian:bookworm-slim
COPY --from=rust-build /build/target/release/*.so /usr/local/lib/
COPY --from=ts-build /build/packages/coding-agent/dist /app
COPY --from=ts-build /build/node_modules /app/node_modules
WORKDIR /app
ENTRYPOINT ["node", "cli.js"]
```

## Bun + Cargo 集成

构建系统以 **并行** 方式运行 `cargo build --release` 与 `bun run build`,将 Rust crate 的产物拷贝到 `packages/pi-natives/native/<platform>-<arch>/`。TypeScript 构建随后通过 `pi-natives` 包的 `bin/` 字段取用它们。

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

## 为什么选择这些具体技术

- **Bun 1.3.14** —— 启动最快、原生 TS、catalog 钉版本。取舍:比 Node 年轻。
- **Rust 2024** —— 性能与安全。取舍:编译较慢。
- **React 19** —— concurrent 特性、Server Components 准备就绪。取舍:19.0 尚不稳定（但 19.2 已稳定）。
- **Tailwind 4** —— 工具类 CSS,bundle 更小。取舍:与旧 v3 插件不兼容。
- **Tree-sitter** —— 增量解析,50+ 语言。取舍:WASM blob 体积。
- **protobuf** —— schema 演进、跨语言。取舍:需要维护 schema 文件。
- **OpenTelemetry** —— 与厂商无关的遥测。取舍:SDK 可能较重。

## 团队拒绝的方案

- **Tauri** —— 二进制比 Electron 小,但 Rust + Web 的复杂度已经足够
- **Zod** —— TypeBox 直接生成 JSON Schema,不再需要 `zod-to-json-schema`
- **Vitest** —— Bun 的 `bun test` 更快,复用同一 TS 流水线
- **MUI** —— collab-web 使用 Tailwind 做自定义设计（不用现成组件库）
- **Redis** —— 会话和记忆都是基于文件的;无需管理额外进程

## 接下来

- [Rust 核心](/docs/01-rust-core) —— 原生层
- [pi-ai · 40+ 提供方](/docs/02-pi-ai) —— LLM 层
- [部署](/docs/17-deployment) —— 安装二进制
