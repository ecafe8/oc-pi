## Why

当前 `goal-to-docs 目标到文档` 已经具备四阶段闭环、review loop 稳定化、real docs guard 真实写入守卫与 regression fixtures 回归样本，但用户仍然主要通过一次性 CLI 命令触发流程，缺少真正的人工参与入口。由于 `goal-to-docs 目标到文档` 本质上需要“讨论 -> 方案 -> 用户确认 -> 执行 -> 审查 -> 再修正”的协作循环，现在最需要的不是继续扩充纯生成能力，而是把 `interactive-workbench 交互工作台` 落为第一版可用的 `chat-first 对话优先` TUI 主入口。

## What Changes

- In Scope
- 为 `interactive-workbench 交互工作台` 建立第一版 `chat-first 对话优先` TUI 闭环，固定为 `top status bar 顶部状态条 + left chat 左侧主聊天区 + right info 右侧信息区 + composer 输入区`。
- 为工作台补齐第一版必须的状态模型，包括 `context 上下文`、`plan 执行计划`、`execution 执行过程` 与 `waiting-user 等待用户确认` 状态。
- 为工作台建立稳定的 presenter 展示适配层，输出顶部状态、聊天消息流、右侧项目信息/计划/执行摘要。
- 基于仓库已存在的 `@earendil-works/pi-tui` 依赖搭建最小 TUI 外壳，并通过统一 CLI 入口进入。
- 定义第一版 `slash command 斜杠命令` 规范，统一采用 `/docs-goal-new` 这类 `kebab-case 连字符命名` 单段命令，而不是 `/goal new` 这种层级命令。
- 将 `goal-to-docs 目标到文档` 接入“AI 先给方案、用户确认后执行、执行过程可见、结果文件可见”的最小交互闭环。
- Out of Scope
- 不在第一版中做自由多窗格系统、复杂 artifact diff viewer 差异查看器、artifact 原地编辑、多会话分支管理或默认真实 docs 写入主路径。
- 不在本 change 中重写现有 `goal-to-docs` runner，只复用当前四阶段执行链路。

## Capabilities

### New Capabilities
- `interactive-workbench-chat-first-tui`: 为 `apps/oc-pi-cli` 引入第一版对话优先 TUI 工作台，支持方案确认后执行与过程可见化。

### Modified Capabilities

None.

## Impact

- 受影响代码主要在 `apps/oc-pi-cli/src/workbench/*`、`apps/oc-pi-cli/src/index.ts`，并会复用 `apps/oc-pi-cli/src/planning/goal-to-docs/*` 的现有四阶段执行结果。
- 受影响真源文档包括：
  - `apps/web-docs/content/docs/planning/interactive-workbench.md`
  - `apps/web-docs/content/docs/planning/goal-to-docs.md`
  - `apps/web-docs/content/docs/tasks/dev-tasks/01-workbench-chat-state-model.md`
  - `apps/web-docs/content/docs/tasks/dev-tasks/02-workbench-chat-presenters.md`
  - `apps/web-docs/content/docs/tasks/dev-tasks/03-workbench-pi-tui-shell-layout.md`
  - `apps/web-docs/content/docs/tasks/dev-tasks/04-workbench-plan-confirm-run-loop.md`
  - `apps/web-docs/content/docs/tasks/dev-tasks/05-workbench-right-pane-project-plan-execution.md`
  - `apps/web-docs/content/docs/tasks/dev-tasks/06-workbench-tui-cli-entry.md`
- 预期验证命令应聚焦：
  - `bun run types:check`（`apps/oc-pi-cli`）
  - 工作台入口的最小启动验证
  - 已有 `goal-to-docs:check:*` 回归命令中与工作台接入直接相关的路径验证
