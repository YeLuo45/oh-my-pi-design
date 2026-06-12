# 03 · pi-agent-core — Agent Runtime

`@oh-my-pi/pi-agent-core` is the agent runtime, extended from pi-mono with **append-only context**, **harmony-leak detection**, **capability-driven tool selection**, and **swarm-ready session handoff**. It owns the agent loop, state, hooks, and compaction.

**Source:** `packages/agent/src/` (8 source files + 4 compaction modules + 1 proxy)

## The 11 files

```
packages/agent/src/
├── agent.ts                  # Public Agent class
├── agent-loop.ts             # Loop implementation
├── append-only-context.ts    # Append-only message store
├── harmony-leak.ts           # Detect prompt-leak in outputs
├── proxy.ts                  # Tool dispatch
├── index.ts                  # Public exports
├── types.ts                  # Public types
└── compaction/
    ├── compaction.ts         # Main compaction
    ├── append-compaction.ts  # Compaction that preserves history
    ├── strategy.ts           # Compaction strategies
    └── ...
```

## What changed from pi-mono

| Aspect | pi-mono | oh-my-pi |
|--------|---------|----------|
| Context mutation | In-place array mutation | Append-only context (immutable snapshot) |
| Tool selection | All tools available | **Capability-based** — only tools matching the model's capability flags |
| Compaction | Plain JSONL + summary | **Multi-strategy** — `summary`, `append`, `branch-aware`, `tail-prune` |
| Prompt leak | Not detected | `harmony-leak` detector strips leaked system prompt fragments |
| Session handoff | Single session | **Swarm-ready** — sessions can be cloned, merged, or replaced |
| Recursion | Manual via `beforeToolCall` | First-class `subagent` tool (used by swarm-extension) |

## The `Agent` class

```ts
import { Agent, type AgentState, type AgentTool } from "@oh-my-pi/pi-agent-core";
import { streamSimple } from "@oh-my-pi/pi-ai";

const agent = new Agent({
  initialState: {
    systemPrompt: "You are a helpful coding assistant.",
    model: claudeOpusModel,
    tools: [readTool, hashlineTool, lspsTool, dapsTool, ...],
    thinkingLevel: "high"
  },
  stream: streamSimple,
  toolExecutionMode: "parallel",
  queueMode: "one-at-a-time",
  // oh-my-pi additions:
  appendOnlyContext: true,         // Use immutable snapshots
  capabilityFilter: "strict",      // Only model-capable tools
  harmonyLeakDetection: "auto",    // Strip prompt leaks from outputs
  compactionStrategy: "append",    // Use append-compaction
  swarmReady: true                 // Allow session clone/merge
});
```

The `Agent` class is **transport-agnostic** — the consumer (TUI, RPC, collab-web) only sees `AgentEvent`s.

## The append-only context

The most significant change from pi-mono. In pi-mono, the agent's `messages` array is **mutated in place** — `push` and `slice` are called directly. In oh-my-pi, the context is **append-only**:

```ts
// packages/agent/src/append-only-context.ts
export class AppendOnlyContext {
  private readonly segments: ReadonlyArray<ContextSegment>;
  
  append(segment: ContextSegment): AppendOnlyContext;
  withReplacement(index: number, segment: ContextSegment): AppendOnlyContext;
  tail(n: number): AppendOnlyContext;
  toContext(): Context;
}

export type ContextSegment =
  | { type: "system"; content: string }
  | { type: "user"; content: TextContent[] | ImageContent[] }
  | { type: "assistant"; content: AssistantContent[] }
  | { type: "toolResult"; toolCallId: string; content: TextContent[] }
  | { type: "summary"; content: string; replaces: number };
```

Operations like `append()` and `withReplacement()` return a **new** `AppendOnlyContext` — the old one is untouched. This has three benefits:

1. **Snapshot-ability** — any point in the conversation can be saved as an immutable snapshot (used by snapcompact)
2. **Concurrent safety** — sub-agents can hold a reference to an older snapshot while the parent moves on
3. **Easier debugging** — the context at any time is `segments.slice(0, i)`, no mutation history needed

The overhead is ~5% (one extra object allocation per message), which is negligible vs the LLM call cost.

## harmony-leak detection

LLMs sometimes **leak** parts of their system prompt into visible output (e.g. "I am Claude, an AI assistant..."). oh-my-pi detects and strips this:

```ts
// packages/agent/src/harmony-leak.ts
export function detectHarmonyLeak(
  text: string,
  systemPrompt: string
): { leaked: boolean; leakedPhrases: string[]; cleanedText: string };
```

The detector uses three strategies:

1. **Exact match** — strips lines that exactly match parts of the system prompt
2. **Fuzzy match** — strips lines that are 80%+ similar to system prompt phrases (Levenshtein distance)
3. **Pattern match** — strips lines matching common "I am an AI..." patterns

The cleaned text is sent to the user; the leaked phrases are **logged to OpenTelemetry** (so the team can fix the system prompt).

`harmonyLeakDetection: "auto"` enables this for every assistant message. `"off"` disables it.

## The agent loop (extended)

The loop is the same as pi-mono's, with three additions:

```mermaid
sequenceDiagram
    participant U as User
    participant A as Agent
    participant Ctx as AppendOnlyContext
    participant LLM as streamSimple
    participant HL as harmony-leak
    participant T as Tool
    participant Cap as capabilityFilter

    U->>A: run(message)
    A->>Ctx: append(userMessage)
    A->>Cap: filter(tools, model)
    Cap-->>A: onlyCapableTools
    A->>LLM: streamSimple(model, context)
    loop events
        LLM-->>A: text / thinking / tool_call
        A-->>A: append to context
    end
    LLM-->>A: done
    A->>HL: detect(assistantText, systemPrompt)
    HL-->>A: cleanedText
    A-->>U: text(cleanedText)
    
    A->>T: execute(toolCall, ctx)
    T-->>A: result
    A->>A: append(toolResult)
    
    Note over A: at any point: snapshot() for swarm
```

The `capabilityFilter` is the new step — it filters the tool list to only those the current model can actually use. A model without vision can't use `read-image`; a model without thinking can't use the deep-refactor tools; etc.

## capabilityFilter

```ts
// In agent-loop.ts
function capabilityFilter(tools: AgentTool[], model: Model): AgentTool[] {
  return tools.filter(tool => {
    // Tool declares its required capabilities
    return tool.requiredCapabilities.every(cap => model.capability[cap] === true);
  });
}
```

Each tool declares:

```ts
const readImageTool: AgentTool = {
  name: "read_image",
  inputSchema: ReadImageArgs,
  // ...
  requiredCapabilities: ["imageInput"],
  optionalCapabilities: ["thinking"]
};
```

The filter is strict by default — tools requiring a missing capability are **hidden** from the LLM's tool list. `"warn"` mode includes them but warns; `"off"` disables filtering.

## The 4 compaction strategies

`packages/agent/src/compaction/strategy.ts` exports 4 strategies:

```ts
export type CompactionStrategy = "summary" | "append" | "branch" | "tail-prune";
```

### 1. `summary` (default in pi-mono)

```ts
export async function summaryCompaction(
  state: AgentState,
  model: Model,
  config: CompactionConfig
): Promise<CompactionResult>;
```

Old: keep the first N + summary of the rest. Same as pi-mono.

### 2. `append` (default in oh-my-pi)

```ts
export async function appendCompaction(
  state: AgentState,
  model: Model,
  config: CompactionConfig
): Promise<CompactionResult>;
```

**Don't delete — summarize and append.** Replace the oldest M messages with a summary, but **append the summary to the segment list** instead of replacing. The LLM sees:

```
[s1, s2, s3, s4, s5, s6, summary(s1-s3), s4, s5, s6, s7, ...]
```

The trade-off: the context grows slightly (summaries are kept) but the agent retains the **arc** of the conversation. Useful for long tasks where the agent needs to remember its own decisions.

### 3. `branch` (same as pi-mono's branch-aware)

```ts
export async function branchCompaction(
  state: AgentState,
  model: Model,
  config: CompactionConfig
): Promise<CompactionResult>;
```

For multi-branch conversations, keep per-branch summaries.

### 4. `tail-prune`

```ts
export async function tailPruneCompaction(
  state: AgentState,
  model: Model,
  config: CompactionConfig
): Promise<CompactionResult>;
```

Drop the **middle** of the conversation, keep the start (anchor) + end (current focus). Useful for very long sessions where the agent is on a side quest — the LLM only needs the anchor + the recent context.

### Choosing a strategy

| Use case | Strategy |
|----------|----------|
| Default (most users) | `append` |
| Long debugging session | `tail-prune` |
| Multi-branch (user goes back and forth) | `branch` |
| Strict token budget | `summary` |

Configurable in `~/.omp/settings.json`:

```json
{
  "compaction": {
    "strategy": "append",
    "thresholdFraction": 0.8,
    "summaryModel": "claude-haiku-4"
  }
}
```

## The 17-event protocol (extended)

Same as pi-mono's 17 events, plus 4 new:

| Event | Type | Purpose |
|-------|------|---------|
| `compaction_start` | existing | Compaction begins |
| `compaction_end` | existing | Compaction completes |
| `compaction_strategy_changed` | **new** | Strategy switched mid-session |
| `snapshot_taken` | **new** | Context snapshot saved (for swarm) |
| `snapshot_restored` | **new** | Context snapshot restored (from swarm handoff) |
| `capability_filtered` | **new** | Tool hidden due to missing capability |

The 4 new events let the UI show "compaction strategy switched to tail-prune" and "tool `read_image` hidden — model doesn't support vision".

## The swarm-ready session

The `AgentSession` can be **cloned** for sub-agent spawning (used by `swarm-extension`):

```ts
// In the swarm-extension
const subAgentSession = parentSession.clone({
  model: cheaperModel,
  tools: [readTool, grepTool, globTool],  // read-only subset
  prompt: "You are a search sub-agent. Find X and report back."
});

const result = await subAgentSession.run(searchQuery);
parentSession.appendToolResult(result);
```

The clone is **deep** — it gets its own append-only context, its own tool list, its own compaction. The parent's context is **untouched** during the sub-agent's work. When the sub-agent returns, its result is appended to the parent as a single tool result.

This is the **the** pattern for `swarm-extension` — see [swarm-extension](/docs/16-swarm-extension).

## The proxy.ts (extended)

`proxy.ts` is the tool dispatch chokepoint, same as pi-mono. New additions:

```ts
export async function dispatchToolCall(
  tools: AgentTool[],
  toolCall: AgentToolCall,
  beforeHook?: BeforeToolCallFn,
  afterHook?: AfterToolCallFn,
  options?: DispatchOptions
): Promise<ToolResultMessage>;

export interface DispatchOptions {
  capabilityFilter?: "strict" | "warn" | "off";
  swappableHook?: (toolCall: AgentToolCall) => AgentTool | null;  // for sub-agents
  // ...
}
```

The `swappableHook` lets a sub-agent replace a tool with a "callback to parent" tool — the sub-agent's `read` returns the parent's read result, but the call is logged in the sub-agent's context for transparency.

## What hasn't changed

- The `Agent` class API is **backward-compatible** with pi-mono (same constructor, same events, same hooks)
- The `AgentState` shape is the same
- The `AgentTool` interface is the same
- The `beforeToolCall` / `afterToolCall` hooks work the same way
- The `toolExecutionMode` and `queueMode` settings are the same

So a pi-mono agent can be ported to oh-my-pi by changing imports (`@earendil-works/pi-agent-core` → `@oh-my-pi/pi-agent-core`) and adding the new `appendOnlyContext`, `capabilityFilter`, `compactionStrategy` settings.

## The `compaction.ts` orchestrator

```ts
// packages/agent/src/compaction.ts
export async function compact(
  state: AgentState,
  model: Model,
  stream: StreamFn,
  config: CompactionConfig
): Promise<CompactionResult> {
  switch (config.strategy) {
    case "summary": return summaryCompaction(state, model, config);
    case "append": return appendCompaction(state, model, config);
    case "branch": return branchCompaction(state, model, config);
    case "tail-prune": return tailPruneCompaction(state, model, config);
  }
}

export function shouldCompact(state: AgentState, config: CompactionConfig): boolean {
  const tokens = estimateContextTokens(state);
  return tokens > state.model.contextWindow * config.thresholdFraction;
}
```

The orchestrator picks the right strategy at runtime. The user can change the strategy mid-session (e.g. switch from `summary` to `tail-prune` for the final stretch).

## Debugging the loop

```ts
// Set in ~/.omp/settings.json
{
  "agent": {
    "debug": {
      "logEvents": true,           // Log every AgentEvent
      "logContext": true,          // Log the full context per turn
      "logToolCalls": true,        // Log every tool call
      "snapshotEveryTurn": true    // Save a context snapshot per turn
    }
  }
}
```

The snapshots are saved to `.omp/debug/snapshots/<sessionId>/<turnId>.json`. Useful for replay and for swarm-extension debugging.

## Next

- [pi-coding-agent · CLI](/docs/05-pi-coding-agent) — the consumer
- [snapcompact](/docs/10-snapcompact) — the persistence layer
- [swarm-extension](/docs/16-swarm-extension) — the multi-agent pattern
- [32 Built-in Tools](/docs/09-tools) — the tools the agent dispatches to
