## Why

当前 `interactive-workbench 交互工作台` 已能生成文档并驱动 `goal-to-docs 目标到文档` 主流程，但输入体验和执行可见性仍偏生硬。用户在输入 `/` 命令时缺少更顺手的自动补全、在命令后补充自然语言约束时缺少稳定语义边界，而在 AI 长时间生成文档时也还看不到足够明确的阶段进度与草稿输出，导致“能跑通”但“不够顺”。

## What Changes

- In Scope
- 增强 `interactive-workbench 交互工作台` 的 slash command 斜杠命令输入体验，使 `/` 后的命令列表能够随输入动态过滤，并支持 `Tab` 键直接完成当前选中项。
- 为需要参数的命令补齐参数自动补全，优先覆盖 `/session-resume` 与 `/session-fork` 的最近 session 会话列表补全，并显示 `session name 会话名`、`session id 会话标识`、更新时间与 goal 摘要。
- 为适合的 docs 命令增加“命令 + 自然语言描述”输入语义，例如在 `/docs-goal-new`、`/docs-plan-run`、`/docs-plan-retry` 后追加约束文本，并将其纳入命令执行上下文。
- 为 `goal-to-docs 目标到文档` 执行过程增加更细粒度的流式状态反馈，至少向用户持续暴露 `thinking`、`writing`、`reviewing` 等阶段级进度信息。
- 在工作台中增加一个限高的 `live draft 实时草稿` 预览区域，用于显示当前 writer 正在生成的文档片段，同时避免长文本冲散主聊天历史。
- 更新工作台真源文档与回归验证脚本，确保新增交互规则可被稳定复测。
- Out of Scope
- 不在本 change 中重做整体 TUI 布局，不扩展为自由多窗格系统。
- 不把所有 slash command 都改成自然语言自由参数模式；仅覆盖有明确语义收益的命令。
- 不把完整大段最终文档直接灌入主聊天时间线，仍保持主聊天区以对话和状态摘要为主。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `interactive-workbench-chat-first-tui`: 补充 slash command 自动补全与参数补全、命令后的自然语言参数语义，以及执行阶段流式反馈与限高草稿预览要求。

## Impact

- 受影响代码主要在：
  - `apps/oc-pi-cli/src/workbench/index.ts`
  - `apps/oc-pi-cli/src/workbench/views/index.ts`
  - `apps/oc-pi-cli/src/workbench/presenters/present-workbench-state.ts`
  - `apps/oc-pi-cli/src/workbench/state.ts`
  - `apps/oc-pi-cli/src/planning/goal-to-docs/*`
  - `apps/oc-pi-cli/tests/regression/check-workbench-session-smoke.ts`
- 受影响真源文档主要在：
  - `apps/web-docs/content/docs/planning/interactive-workbench.md`
  - 相关 tasks / planning 文档中对工作台输入与流式反馈的说明
- 预期验证命令聚焦：
  - `bun run types:check`（`apps/oc-pi-cli`）
  - `bun run workbench:smoke:sessions`
  - 工作台最小启动与 docs 执行路径的手动 smoke test
