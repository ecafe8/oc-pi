## Context

当前 `interactive-workbench 交互工作台` 已经具备 chat-first 对话优先布局、slash command 斜杠命令、Pi-backed session 会话真源与 `goal-to-docs 目标到文档` 执行闭环，但实际交互中仍有三个明显缺口：

1. 命令输入虽然已接入 `Editor 编辑器` 与 `CombinedAutocompleteProvider 组合补全提供器`，但缺少针对工作台语义打磨后的自动完成与参数候选体验，尤其是 `/session-resume` 这类需要引用现有 session 的命令。
2. 命令目前主要是“命令名 + 少量技术参数”，还没有把“命令 + 自然语言补充意图”稳定纳入工作流，导致用户需要在聊天和命令之间来回切换。
3. `goal-to-docs` 执行过程虽然会输出结果，但用户还看不到足够连续的阶段状态与 writer 草稿增量，因此在长时间生成时容易失去方向感。

约束也很明确：
- 保持现有固定布局，不把本次 change 扩展成整体 UI 重构。
- 优先复用 Pi `Editor` 与 `CombinedAutocompleteProvider` 的现成底层能力，而不是重写整套补全系统。
- 继续把主聊天区保留给对话与高层状态，不让大段流式文档正文冲散历史信息。

## Goals / Non-Goals

**Goals:**
- 让 slash command 斜杠命令在输入 `/` 后即可动态过滤，并支持 `Tab` 键直接完成。
- 让 `/session-resume`、`/session-fork` 等带参数命令可以自动补全最近 session 列表。
- 为适合的 docs 命令建立“命令 + 自然语言描述”语义，并将描述纳入执行上下文。
- 为 `goal-to-docs` 增加阶段级流式进度反馈，并新增限高的 `live draft 实时草稿` 预览区域。
- 保持工作台顶部与右侧信息区在 session 切换和执行阶段推进时持续可读。

**Non-Goals:**
- 不在本次 change 中改成多窗格自由布局。
- 不把所有 slash command 都支持为任意自然语言参数。
- 不把完整最终文档全文持续写入聊天时间线。
- 不改变 Pi session 真源、write policy 写入策略与 sandbox / production 边界规则。

## Decisions

### Decision 1: 复用 Pi `CombinedAutocompleteProvider`，并为 session 参数补全增加工作台自定义候选

采纳方案：继续以 `Editor 编辑器` + `CombinedAutocompleteProvider 组合补全提供器` 为底座，为 `WORKBENCH_COMMANDS` 增加 `getArgumentCompletions`，在 `/session-resume` 与 `/session-fork` 后动态读取最近 session 列表并参与过滤与 `Tab` 完成。

理由：
- Pi 底层已经支持命令补全、参数补全、上下选择与 `Tab` 应用，不需要重复造轮子。
- session 候选来自当前工作台运行时状态，最适合由 workbench 自己提供动态参数列表。

备选方案 A：自定义一套独立的命令面板与补全状态机。
- 不采纳原因：实现成本高，且会与 Pi `Editor` 现有行为重复。

备选方案 B：只保留静态命令名补全，不做参数候选。
- 不采纳原因：`/session-resume` 的主要痛点就在“用户记不住 session id”。

### Decision 2: 只为有限的 docs 命令开放“命令 + 自然语言描述”语义

采纳方案：仅为 `docs-goal-new`、`docs-plan-run`、`docs-plan-retry`、`session-new` 这类天然适合附加描述的命令开放 inline 自然语言参数；`docs-exec-confirm`、`docs-exec-cancel`、`docs-status-show`、`docs-review-latest` 继续保持确定性动作语义。

理由：
- 这样可以把“命令负责动作，参数负责补充意图”的边界保持清晰。
- 可以减少用户误以为所有命令后面的任意文本都会被 AI 理解的问题。

备选方案 A：让所有 slash command 都接受自由文本。
- 不采纳原因：命令语义会变得混乱，回归验证也更难稳定。

备选方案 B：完全不支持 inline 描述，只允许命令前后分离输入。
- 不采纳原因：会保留当前“流程能走但不够顺”的主要痛点。

### Decision 3: 把执行过程反馈拆成“阶段状态流”与“限高草稿流”两层

采纳方案：
- 在聊天时间线中持续追加高层阶段状态，例如 `正在思考产品愿景`、`正在编写产品愿景文档`、`正在 review 产品愿景文档`。
- 在工作台中新增一个固定高度的 `live draft 实时草稿` 区域，只展示当前 writer 输出的增量文本片段，并允许该区域独立滚动。

理由：
- 高层状态更适合进入聊天时间线，便于回看执行轨迹。
- 草稿正文若直接灌入主聊天区，会明显破坏历史阅读与滚动体验。

备选方案 A：把所有流式文档正文都直接追加到聊天时间线。
- 不采纳原因：会快速冲散历史消息，并让主聊天区失去可读性。

备选方案 B：只显示高层状态，不显示任何草稿正文。
- 不采纳原因：用户仍然无法感知“现在具体在写什么”。

### Decision 4: 先暴露产品层阶段信号，不直接暴露原始模型内部推理

采纳方案：工作台流式反馈优先暴露 `goal-to-docs` 的产品层阶段和 writer/reviewer 相位，而不是直接把底层模型的原始 reasoning 全量透出。

理由：
- 产品层阶段更稳定，也更容易与当前 Stage 1-4 和 review loop 对齐。
- 可减少不同 provider 对 thinking 流格式差异带来的耦合。

备选方案：把所有底层 thinking 直接映射到用户可见区。
- 不采纳原因：噪音更大，也更不稳定。

## Risks / Trade-offs

- [参数补全与 session 状态不同步] → 每次补全请求实时读取当前 session 列表，并优先显示 current / recent 项。
- [命令后自然语言描述语义扩散] → 只对白名单命令开放 inline 描述，并在帮助文案中明确哪些命令支持描述文本。
- [流式草稿区域重新挤压布局] → 使用固定高度 + 独立滚动，不改变现有整体布局比例。
- [阶段状态过多导致时间线噪音] → 只记录关键相位切换，不记录每个 token 级事件。
- [writer 草稿与最终落盘内容不完全一致] → 在文案中明确 `live draft` 是生成中预览，不承诺与最终产物逐字一致。

## Compatibility

- 保持现有 slash command 命名体系不变，新增的是补全能力和少量命令的参数语义，不做命令重命名。
- 保持现有 `goal new`、`status show`、`review latest` 等非交互 CLI 路径不变。
- 保持现有 Pi `Editor` 与 `CombinedAutocompleteProvider` 依赖，不引入新的 TUI 基础库。
- 保持当前 session pointer 当前会话指针与 Pi session 真源机制不变，补全只读取现有数据源。

## Migration Plan

1. 先增强工作台命令定义，为支持参数补全的命令补齐动态候选提供器。
2. 再收口 slash command 解析逻辑，明确哪些命令允许 inline 自然语言描述，并补帮助文案。
3. 为 `goal-to-docs` 执行链路补阶段级状态事件与 writer/reviewer 相位信号。
4. 在 workbench view 中新增限高 `live draft 实时草稿` 区，并保持其独立滚动。
5. 更新回归脚本与文档，验证 session 参数补全、命令语义和执行反馈展示。

预期验证命令：
- `bun run types:check`（`apps/oc-pi-cli`）
- `bun run workbench:smoke:sessions`
- `bun run src/index.ts workbench` 的手动 smoke test

## Open Questions

- `live draft 实时草稿` 更适合放在右侧信息区底部，还是放在 Thinking 区下方作为独立区域？
- `/docs-plan-run <自然语言描述>` 的描述文本应追加到当前 goal，还是作为单次 plan override 规划覆盖输入？
