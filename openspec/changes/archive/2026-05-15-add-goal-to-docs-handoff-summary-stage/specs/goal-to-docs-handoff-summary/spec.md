## ADDED Requirements

### Requirement: Goal-to-docs SHALL execute a handoff-summary stage after accepted feature-planning output
系统 MUST 在 `goal-to-docs 目标到文档` 的 `feature-planning 功能规划` 阶段通过审查后，继续执行 `handoff-summary 交接摘要` 阶段，并将其作为当前闭环的最终阶段。

#### Scenario: Fourth stage runs after third stage is accepted
- **WHEN** `goal-framing`、`capability-breakdown` 与 `feature-planning` 三个阶段均已 `accepted`
- **THEN** 系统 MUST 继续执行 `handoff-summary` 阶段，而不是在第三阶段结束后直接返回

#### Scenario: Upstream rejection prevents handoff stage
- **WHEN** 前三个阶段中任一阶段处于 `revising`、`blocked` 或未产出可用输入状态
- **THEN** 系统 MUST NOT 执行 `handoff-summary` 阶段

### Requirement: Handoff-summary SHALL be derived from accepted upstream artifacts instead of re-planning from scratch
系统 MUST 基于前三阶段已接受的产物文本生成 `handoff-summary 交接摘要`，并将其限制为收束、确认与下一步交接用途，而不是重新发散新的产品方向。

#### Scenario: Handoff summary consumes accepted upstream artifacts
- **WHEN** 系统构造 `handoff-summary` 的 writer prompt
- **THEN** prompt MUST 包含已接受的 `product-goal`、`capability-map`、`feature-plan` 与 `mvp-scope` 相关内容

#### Scenario: Stage 4 input configuration matches upstream requirements
- **WHEN** 系统定义 `handoff-summary` 阶段的 `inputArtifacts`
- **THEN** 该配置 MUST 同步包含 `product-goal`、`capability-map`、`feature-plan` 与 `mvp-scope`

#### Scenario: Handoff summary remains a closing summary document
- **WHEN** `handoff-summary` 文档生成完成
- **THEN** 其内容 MUST 以确认产物、建议下一步动作与待确认问题为主
- **THEN** 系统 MUST NOT 允许该阶段重新定义与前三阶段冲突的新产品目标

### Requirement: Handoff-summary SHALL use a fixed document structure and review loop
系统 MUST 为 `handoff-summary 交接摘要` 定义固定文档模板、固定结构校验与 reviewer 审查规则，以确保该页可稳定写入与检查。

#### Scenario: Handoff summary document matches fixed structure
- **WHEN** 系统生成 `handoff-summary` 文档
- **THEN** 文档 MUST 包含固定的 front matter、固定 H1 与预定义章节

#### Scenario: Invalid handoff summary structure fails review loop
- **WHEN** `handoff-summary` 文档缺少固定 front matter、固定标题或必需章节
- **THEN** 系统 MUST 将该阶段视为 `changes-requested` 或阻止进入真实写入

### Requirement: Handoff-summary SHALL produce symmetric handoff-summary and handoff-next-up outputs
系统 MUST 为第四阶段产出命名一致的 `handoff-summary` 与 `handoff-next-up` 两类相关输出，其中前者用于稳定交接摘要，后者用于动态下一步动作。

#### Scenario: Handoff stage resolves summary and next-up outputs
- **WHEN** `handoff-summary` 阶段执行成功
- **THEN** 系统 MUST 产出 `handoff-summary` 稳定摘要页
- **THEN** 系统 MUST 产出 `handoff-next-up` 动态下一步页

#### Scenario: Stage 4 output slot configuration uses primary plus additional outputs
- **WHEN** 系统定义 `handoff-summary` 阶段的输出槽位
- **THEN** `primaryOutputSlot` MUST 是 `handoff-summary`
- **THEN** `additionalOutputSlots` MUST 包含 `handoff-next-up`

#### Scenario: Slot definitions map to handoff docs pages
- **WHEN** 系统定义 `handoff-summary` 与 `handoff-next-up` 的 slot
- **THEN** 两者 MUST 分别映射到独立的 docs 路径
- **THEN** 系统 MUST NOT 继续把 Stage 4 主输出解析到 `next-summary -> tasks/next-up.md`

#### Scenario: Runtime output includes fourth stage metadata
- **WHEN** 用户执行 `goal new` 后查看 CLI 返回结果、`status show` 或 `review latest`
- **THEN** 系统 MUST 能展示 `handoff-summary` 阶段状态、目标路径、相关输出槽位与审查摘要

### Requirement: Real docs mode SHALL apply source-aware write guard to handoff-summary
系统 MUST 在 `goal new --write-docs` 模式下，对 `handoff-summary` 与 `handoff-next-up` 的真实 docs 写入复用当前 source-aware write guard，并保护两者不被漂移为其他文档职责。

#### Scenario: Handoff real write reads current source pages first
- **WHEN** 用户执行 `goal new --write-docs`
- **THEN** 系统 MUST 在覆盖 `handoff-summary` 与 `handoff-next-up` 对应真实 docs 页面前先分别读取原文

#### Scenario: Handoff summary drift triggers confirmation or block
- **WHEN** `handoff-summary` 候选内容不再表现为阶段性交接摘要，或 `handoff-next-up` 候选内容不再表现为动态下一步动作
- **THEN** 系统 MUST 将其标记为语义冲突，并要求 human confirmation 或默认阻止真实写入

#### Scenario: Minimal semantic anchors are defined for both handoff pages
- **WHEN** 系统为 `handoff-summary` 与 `handoff-next-up` 增加真实写入语义守卫
- **THEN** 锚点规则 MUST 至少覆盖固定 front matter、固定 H1、必需章节名与页面职责关键词
