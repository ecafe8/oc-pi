## Why

当前 `goal-to-docs 目标到文档` 已经完成前三个阶段：`goal-framing 目标定型`、`capability-breakdown 能力拆解`、`feature-planning 功能规划`，但运行结果仍然停留在分散文档层，缺少一个可以直接交给后续执行或评审使用的收束产物。现在需要补上一个 `handoff-summary 交接摘要` 阶段，把前三阶段已接受的信息整理成可执行的交付摘要，完善规划闭环。

## What Changes

- In Scope
- 为 `goal-to-docs` 增加第四阶段 `handoff-summary 交接摘要`，消费前三阶段已接受产物并输出稳定的阶段性交付摘要页。
- 在 `handoff-summary` 之外新增与其命名一致的 `handoff-next-up 下一步指引` 文档，用于承载动态滚动更新的下一步动作。
- 为第四阶段定义固定输出模板、结构校验、review prompt 与 workbench/CLI 展示字段。
- 明确第四阶段在 preview、`--write-sandbox`、`--write-docs` 三种模式下的行为，并复用现有真实写入防护链路。
- Out of Scope
- 不重构现有前三阶段的执行顺序与核心 prompt 设计。
- 不把 `handoff-summary` 与动态下一步页混写到同一个物理文档中。
- 不在本次 change 中引入完整测试基建重构或新的审批系统。

## Capabilities

### New Capabilities
- `goal-to-docs-handoff-summary`: 为 `goal-to-docs` 闭环增加最终交接摘要阶段，并拆分稳定摘要页与动态下一步页两类相关产物。

### Modified Capabilities

None.

## Impact

- 受影响代码主要在 `apps/oc-pi-cli/src/planning/goal-to-docs/*`、`apps/oc-pi-cli/src/runtime/default-config.ts`、`apps/oc-pi-cli/src/workbench/*` 与 `apps/oc-pi-cli/src/index.ts`。
- 需要修改 `DEFAULT_GOAL_TO_DOCS_STAGES` 与 `DEFAULT_SLOT_DEFINITIONS`，新增 `handoff-summary`、`handoff-next-up` 两个 slot，并修正 Stage 4 的 `inputArtifacts`、`primaryOutputSlot` 与 `additionalOutputSlots`。
- 需要为 `handoff-summary` 与 `handoff-next-up` 定义一致命名的 docs 落点，并同步到 `apps/web-docs/content/docs` 结构约定。
- 需要决定并实现 `tasks/next-up.md` 的兼容策略，避免旧入口与新输出语义混淆。
- 需要补充针对 preview、sandbox、real write 三种模式的定向验证命令，预计继续使用 `bun run types:check` 与 `bun run src/index.ts goal new ...`。
