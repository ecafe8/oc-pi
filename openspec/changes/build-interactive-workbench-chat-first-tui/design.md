## Context

当前产品已经完成了 `goal-to-docs 目标到文档` 的四阶段闭环：Stage 1 `goal-framing`、Stage 2 `capability-breakdown`、Stage 3 `feature-planning`、Stage 4 `handoff-summary`，并且 Stage 4 已包含 `handoff-summary 交接摘要` 主输出与 `handoff-next-up 下一步指引` 附加输出。与此同时，review loop 稳定化、preview / sandbox 验证边界与 real-write guard 真实写入守卫也已经建立。

现在的主要缺口不再是“能否生成文档”，而是“用户如何进入这条主循环，并在关键节点参与讨论、确认、修正”。现有 `workbench` 代码已经有 `session 会话`、`timeline 时间线`、`inspector 检查面板`、`review 审查`、`statusBar 状态栏` 等基础状态骨架，但尚未补齐 `context 上下文`、`plan 执行计划`、`execution 执行过程`，也还没有真正的 `pi-tui` 视图层、CLI 入口与 `waiting-user 等待用户确认` 的执行门控。

Pi 侧已经提供了足够的 TUI 基础设施：`TUI`、`ProcessTerminal`、`Editor`、`Text`、`Markdown`、`TruncatedText`、`SelectList`、`showOverlay`、`CombinedAutocompleteProvider`、`KeybindingsManager` 等。因此这次 change 的重点不是重新搭终端框架，而是为 `apps/oc-pi-cli` 定义产品层信息架构与工作流边界。

## Goals / Non-Goals

**Goals:**
- 为 `interactive-workbench 交互工作台` 建立第一版 `chat-first 对话优先` TUI 主入口。
- 固定第一版布局为：顶部状态条、左侧主聊天区、右侧信息区、底部输入区。
- 让用户在 TUI 中先看到 AI 方案，再进入 `waiting-user 等待用户确认`，确认后才执行 `goal-to-docs`。
- 让执行过程与最终文件路径在 UI 中持续可见，而不是继续停留在黑盒 CLI 输出。
- 保持实现最小化，优先复用现有 `goal-to-docs` runner、`workbench` 状态骨架与已安装的 `@earendil-works/pi-tui` 依赖。

**Non-Goals:**
- 不做自由多窗格布局、复杂 diff 预览器、artifact 原地编辑、多会话分支或复杂按钮系统。
- 不重写 `goal-to-docs` 四阶段执行引擎。
- 不把 `--write-docs 真实文档写入模式` 作为第一版 TUI 默认主路径。

## Decisions

### Decision 1: 采用 chat-first 对话优先布局，而不是 command-first 命令优先面板

采纳方案：固定为 `top status bar 顶部状态条 + left chat 左侧主聊天区 + right info 右侧信息区 + composer 输入区`。

理由：
- 当前产品主循环是“讨论 -> 方案 -> 确认 -> 执行 -> 修正”，聊天是主操作入口，命令只是辅助。
- 这与 `goal-to-docs 目标到文档` 的人工参与特性更一致。

备选方案 A：先做 command bar 命令栏主导的工作台。
- 不采纳原因：更像命令控制台，不像对话式规划工作台。

备选方案 B：先做多 pane 自由布局。
- 不采纳原因：复杂度过高，且当前没有足够稳定的信息架构支撑自由布局。

### Decision 2: 保留自然语言输入为主，同时引入单段 slash command

采纳方案：显式命令统一采用 `/goal-new`、`/status-show`、`/review-latest` 这种 `kebab-case 连字符命名` 单段命令，而不是 `/goal new` 层级命令。

理由：
- 更适合 TUI 输入框补全与解析。
- 可保持自然语言讨论与结构化动作并存。

备选方案：复刻 CLI 的空格命令，例如 `/goal new`。
- 不采纳原因：在聊天输入框里解析更复杂，也更容易和自然语言混淆。

### Decision 3: 先补状态模型与 presenter，再做 TUI 视图壳

采纳方案：按 `状态模型 -> 展示适配 -> TUI 壳 -> CLI 入口 -> 方案确认执行 -> 右侧信息区` 顺序推进。

理由：
- 当前 `WorkbenchState 工作台状态` 还缺 `context`、`plan`、`execution`。
- 如果先做视图，很快会陷入 UI 自己拼字段的局面，后续更难稳定。

备选方案：先直接搭 `pi-tui` 页面，再边做边补状态。
- 不采纳原因：容易让 UI 和领域状态耦合失控。

### Decision 4: 第一版执行边界优先接 `preview` 与 `sandbox`

采纳方案：TUI 的最小执行闭环优先打通 `preview 预览模式` 与 `sandbox 沙盒模式`，让用户在确认后可以看到执行过程与文件落点，但不默认走真实 docs 写入。

理由：
- 当前真实 docs 写入已有 guard 保护，但不适合作为工作台第一版默认主路径。
- 先稳定用户交互闭环，再扩真实写入确认链更稳妥。

备选方案：第一版直接开放 `--write-docs` 主路径。
- 不采纳原因：把人机交互问题与真实写入治理问题混在一起，定位成本更高。

### Decision 5: 单独保留 TUI CLI 入口接线任务

采纳方案：将 `src/index.ts` 与 `workbench/index.ts` 的接线明确为单独任务，而不是隐含并入布局任务。

理由：
- 这是最容易被遗漏但又会直接影响“用户能否进入工作台”的关键步骤。

备选方案：把入口接线混入布局任务。
- 不采纳原因：容易在任务执行时被忽略或降级成内部模块导出。

## Risks / Trade-offs

- [状态模型扩展过快] → 先只补第一版必要字段：`context`、`plan`、`execution`，避免一次做成完整 runtime dashboard。
- [TUI 视图先于 presenter 稳定] → 强制 presenter 先行，避免 UI 直接读取底层结构。
- [工作台与现有 CLI 语义冲突] → 单独做 CLI 入口接线任务，要求保持现有非交互式命令路径不被破坏。
- [用户误以为第一版已支持真实 docs 写入主流程] → 在 UI 中明确显示当前边界，并默认优先 `preview` / `sandbox`。

## Compatibility

- 对现有 `goal new`、`status show`、`review latest` 等非交互式 CLI 路径保持兼容。
- 对现有 `workbench` 状态骨架保持增量扩展，不整体重构模块边界。
- 对当前 `@earendil-works/pi-tui` 依赖保持直接复用，不新增额外 TUI 基础库。

## Migration Plan

1. 先补 `WorkbenchState 工作台状态` 的第一版 TUI 必要字段与状态枚举。
2. 再补 `presenters 展示适配层` 输出，确保顶部状态、聊天消息、右侧信息区字段稳定。
3. 基于 `pi-tui` 搭出最小固定布局壳。
4. 为 TUI 建立明确 CLI 启动入口，并保持旧 CLI 路径兼容。
5. 接入“AI 先给方案 -> waiting-user -> 用户确认 -> 执行 -> 展示结果”的主循环。
6. 最后补右侧信息区对 project / plan / execution 三组摘要的展示。

预期验证命令：
- `bun run types:check`（`apps/oc-pi-cli`）
- 工作台入口最小启动验证命令
- 与工作台直接相关的 `goal-to-docs:check:*` 路径验证

## Open Questions

- 第一版 TUI CLI 入口是新增 `workbench` scope，还是保留在现有 `goal` / `status` 体系旁边？
- 第一版是否需要在聊天时间线中直接显示结构化 tool step 摘要，还是先只展示高层执行消息？
