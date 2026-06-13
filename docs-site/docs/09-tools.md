# 09 · 32 个内建工具

oh-my-pi 内置 **32 个工具**，按用途分类。Agent 把它们当作普通工具调用；运行时分派到正确的实现（TypeScript、Rust NAPI、LSP server、DAP adapter 等）。本页面是每个工具的作用及何时使用的规范参考。

**源码：** `packages/coding-agent/src/core/tools/`（10 个类别，32 个工具定义）

## 10 个类别

```mermaid
graph TB
  Tools[32 个内建工具]
  Tools --> File[File I/O · 5]
  Tools --> Shell[Shell · 2]
  Tools --> Edit[Edit Rust · 3]
  Tools --> Snap[Snapshot · 2]
  Tools --> LSP[LSP · 14]
  Tools --> DAP[DAP · 28]
  Tools --> Search[Search · 2]
  Tools --> Memory[Memory · 3]
  Tools --> Meta[Meta · 3]
  Tools --> Research[Research · 1]
```

## File I/O (5)

| 工具 | 用途 | 原生? |
|------|---------|---------|
| `read` | 读取带行号的文件 | ✗ |
| `write` | 创建/覆盖文件 | ✗ |
| `edit` | 子串查找并替换 | ✗ |
| `glob` | 查找匹配模式的文件 | ✗ |
| `grep` | 搜索文件内容（正则） | ✗ |

标准文件操作，全部用 TypeScript 实现。工具列表见上表 —— 接口与 pi-mono 一致。

`read` 工具以**标准**格式（而非 hashline）返回内容。如需 hashline 格式，请使用 [`hashline` 工具](/docs/08-hashline)。

## Shell (2)

| 工具 | 用途 | 原生? |
|------|---------|---------|
| `bash` | 运行 shell 命令 | ✓ `pi-shell` |
| `process` | 管理后台进程 | ✓ `pi-shell` |

两者都委托给 **Rust `pi-shell` crate** 以保证安全（进程组 kill、输出流式传输、命令最小化）。实现见 [Rust Core](/docs/01-rust-core)。

## Edit (Rust) (3)

| 工具 | 用途 | 原生? |
|------|---------|---------|
| `hashline` | 以 line:hash 格式读取文件 | ✓ `pi-ast` |
| `hashline_replace` | 替换行（带哈希校验） | ✓ `pi-ast` |
| `hashline_insert` | 插入行（带哈希校验） | ✓ `pi-ast` |

标志性的编辑原语。见 [hashline](/docs/08-hashline)。

## Snapshot (2)

| 工具 | 用途 | 原生? |
|------|---------|---------|
| `snap` | 快照项目文件系统 | ✓ `pi-iso` |
| `restore` | 恢复一个快照 | ✓ `pi-iso` |

通过 Rust `pi-iso` crate 实现的廉价 copy-on-write 快照。见 [Rust Core](/docs/01-rust-core) + [snapcompact](/docs/10-snapcompact)。

## LSP (14)

| 工具 | LSP Method |
|------|------------|
| `lsp_hover` | `textDocument/hover` |
| `lsp_definition` | `textDocument/definition` |
| `lsp_references` | `textDocument/references` |
| `lsp_completion` | `textDocument/completion` |
| `lsp_signature` | `textDocument/signatureHelp` |
| `lsp_codeAction` | `textDocument/codeAction` |
| `lsp_rename` | `textDocument/rename` |
| `lsp_format` | `textDocument/formatting` |
| `lsp_rangeFormat` | `textDocument/rangeFormatting` |
| `lsp_prepareRename` | `textDocument/prepareRename` |
| `lsp_documentSymbol` | `textDocument/documentSymbol` |
| `lsp_semanticTokens` | `textDocument/semanticTokens` |
| `lsp_inlayHint` | `textDocument/inlayHint` |
| `lsp_diagnostic` | `textDocument/diagnostic` |

见 [LSP](/docs/06-lsp)。

## DAP (28)

| 工具 | DAP Method |
|------|------------|
| `dap_launch` | `launch` |
| `dap_attach` | `attach` |
| `dap_configurationDone` | `configurationDone` |
| `dap_setBreakpoints` | `setBreakpoints` |
| `dap_setExceptionBreakpoints` | `setExceptionBreakpoints` |
| `dap_continue` | `continue` |
| `dap_next` | `next` |
| `dap_stepIn` | `stepIn` |
| `dap_stepOut` | `stepOut` |
| `dap_pause` | `pause` |
| `dap_threads` | `threads` |
| `dap_stackTrace` | `stackTrace` |
| `dap_scopes` | `scopes` |
| `dap_variables` | `variables` |
| `dap_setVariable` | `setVariable` |
| `dap_evaluate` | `evaluate` |
| `dap_watch` | `watch` |
| `dap_source` | `source` |
| `dap_exceptionInfo` | `exceptionInfo` |
| `dap_loadedSources` | `loadedSources` |
| `dap_completions` | `completions` |
| `dap_runInTerminal` | `runInTerminal` |
| `dap_startDebugging` | `startDebugging` |
| `dap_disconnect` | `disconnect` |
| `dap_terminate` | `terminate` |
| `dap_restart` | `restart` |
| `dap_goto` | `goto` |
| `dap_reverseContinue` | `reverseContinue` |

见 [DAP](/docs/07-dap)。

## Search (2)

| 工具 | 用途 | 原生? |
|------|---------|---------|
| `web_search` | 搜索网络 | ✗ |
| `fetch_url` | 抓取 URL 并转为 Markdown | ✗ |

标准外部查询。提供方：Tavily、Brave 或自定义（通过 `HttpDispatcher`）。

## Memory (3)

| 工具 | 用途 | 原生? |
|------|---------|---------|
| `memory_read` | 读取一条 memory | ✗ |
| `memory_write` | 写入一条 memory | ✗ |
| `memory_list` | 列出 memory 条目 | ✗ |

由 [`pi-mnemopi`](/docs/11-pi-mnemopi) 提供支持 —— 带语义搜索的长期 memory 系统。

## Meta (3)

| 工具 | 用途 | 原生? |
|------|---------|---------|
| `todo_write` | 管理内部任务列表 | ✗ |
| `skill` | 激活/停用一个 skill | ✗ |
| `mode_switch` | 在模式之间切换 | ✗ |

标准 meta 工具，与 pi-mono 相同。

## Research (1)

| 工具 | 用途 | 原生? |
|------|---------|---------|
| `autoresearch` | 在 Agent 自己的代码库中搜索上下文 | ✗ |

oh-my-pi 独有的新工具。Agent 可以问 "hashline 工具是怎么工作的？"，并从预嵌入的 omp 代码库中拿到相关代码片段。

## 工具契约

和 pi-mono 一样 —— TypeBox schema + execute 函数：

```ts
import { Type, type Static } from "typebox";
import type { AgentTool } from "@oh-my-pi/pi-agent-core";

const MyArgs = Type.Object({
  input: Type.String()
});

type MyArgs = Static<typeof MyArgs>;

const myTool: AgentTool<typeof MyArgs> = {
  name: "my_tool",
  description: "An example tool",
  inputSchema: MyArgs,
  requiredCapabilities: [],  // oh-my-pi 新增
  optionalCapabilities: ["thinking"],
  async execute(args, ctx) {
    return { content: [{ type: "text", text: `Got: ${args.input}` }] };
  }
};
```

`requiredCapabilities` 与 `optionalCapabilities` 字段是 oh-my-pi 新加的。Agent 循环中的 `capabilityFilter` 会用它们来隐藏当前模型无法使用的工具。

## `ToolContext`

与 pi-mono 相同，但新增了 4 个字段：

```ts
type ToolContext = {
  // 原有的 pi-mono 字段
  fs: FileSystem;
  process: ProcessRunner;
  fetch: HttpDispatcher;
  signal: AbortSignal;
  state: AgentState;
  config: Config;
  log: Logger;

  // oh-my-pi 新增
  lsp: LspClientPool;          // LSP 工具分派
  dap: DapClient;              // DAP 工具分派
  hashline: HashlineNative;    // 原生 hashline 操作
  iso: IsoNative;              // 原生 pi-iso 操作
};
```

新增的 4 个字段在原生实现可用时绑定到原生实现，否则使用 JS 回退。

## 工具过滤

基于能力的过滤器：

```ts
function filterToolsForModel(tools: AgentTool[], model: Model): AgentTool[] {
  return tools.filter(tool => {
    return tool.requiredCapabilities.every(cap => model.capability[cap] === true);
  });
}
```

对于没有 `imageInput` 的模型，`read_image` 工具会被隐藏。对于没有 `thinking` 的模型，深度重构工具会被隐藏。LLM 永远不会看到它不能用的工具。

## 工具输出格式

与 pi-mono 相同：

```ts
{
  content: (TextContent | ImageContent)[],
  details?: unknown,
  isError?: boolean,
  terminate?: boolean
}
```

`terminate: true` 字段是一个提示：在当前工具批次结束后停止 Agent（仅当该批次中的所有工具都设置了它时）。

## 工具并发

Agent 可以**并行**运行工具（只读工具的默认行为）：

```ts
// LLM 在一条 assistant 消息中发送多个工具调用
[
  { name: "lsp_hover", args: { file, line, char } },
  { name: "lsp_definition", args: { file, line, char } },
  { name: "lsp_references", args: { file, line, char } }
]

// Agent 循环并发执行
// tool_execution_end 事件按完成顺序触发
```

对于有副作用的工具（write、bash、hashline_replace），默认是**串行**。

## 取消

`ctx.signal.aborted()` 会在工具操作之间被检查。Agent 可被以下方式中止：

- 用户按下 Ctrl-C
- TUI 中的停止按钮
- 超时（可按工具配置）
- 子 Agent 完成（针对 `swarm-extension`）

## 工具遥测

每次工具调用都会通过 `omp-stats`（OpenTelemetry）记录：

```ts
{
  toolName: "bash",
  duration: 1234,  // ms
  success: true,
  input: { command: "npm test", timeout: 30000 },
  output: { exitCode: 0, stdout: "...", stderr: "" }
}
```

通过 OTLP 导出到 Datadog / Honeycomb / Tempo 用于监控。

## 编写新工具

三步：

1. 创建 `packages/coding-agent/src/core/tools/my-tool/index.ts`：

```ts
import { Type, type Static } from "typebox";
import type { AgentTool } from "@oh-my-pi/pi-agent-core";

const MyArgs = Type.Object({ input: Type.String() });
type MyArgs = Static<typeof MyArgs>;

const myTool: AgentTool<typeof MyArgs> = {
  name: "my_tool",
  description: "An example tool",
  inputSchema: MyArgs,
  requiredCapabilities: [],
  async execute(args, ctx) {
    return { content: [{ type: "text", text: `Got: ${args.input}` }] };
  }
};

export default myTool;
```

2. 在 `packages/coding-agent/src/core/tools/index.ts` 中注册：

```ts
import myTool from "./my-tool/index.js";

export const BUILTIN_TOOLS: AgentTool[] = [
  // ... 现有 32 个
  myTool
];
```

3. 如果该工具需要使用指引，加入系统提示词（位于 `harness/system-prompt.ts`）。

不需要修改 Agent 循环。

## 工具发现

TUI 的 `/tools` 命令会展示：

- 所有可用工具
- 必需的能力
- 当前调用次数（按会话）
- 平均耗时
- 成功率

可用于排查 "为什么 Agent 这么慢？" 或 "为什么 X 工具没被调用？"。

## 相比 pi-mono 没变化的部分

5 个文件 I/O 工具、2 个 shell 工具、2 个搜索工具、3 个 memory 工具、3 个 meta 工具**与 pi-mono 相同** —— 接口、行为都一样。Agent 代码是直接可替换兼容的。

14 个 LSP 工具、28 个 DAP 工具、3 个 hashline 工具、2 个 snapshot 工具、1 个 autoresearch 工具是 **oh-my-pi 新增**。

总计：32 个独立工具（62 个工具名，但 DAP 和 LSP 拥有很多共用基础设施的子命令）。

## 接下来

- [LSP](/docs/06-lsp) — 14 个 LSP 操作
- [DAP](/docs/07-dap) — 28 个 DAP 操作
- [hashline](/docs/08-hashline) — 3 个 hashline 工具
- [snapcompact](/docs/10-snapcompact) — 2 个 snapshot 工具
- [pi-mnemopi](/docs/11-pi-mnemopi) — 3 个 memory 工具
- 完整列表见 [本文件工具参考](/docs/09-tools#the-10-categories)
