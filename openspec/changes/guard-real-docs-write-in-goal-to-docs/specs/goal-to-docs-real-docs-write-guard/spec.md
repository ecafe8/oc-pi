## ADDED Requirements

### Requirement: Real docs write SHALL compare current source text before deciding whether human confirmation is required
系统 MUST 在 `goal new --write-docs` 模式下，于真正覆盖 `apps/web-docs/content/docs` 真源前读取当前目标页面原文，并基于原文、当前 goal 与候选文档判断是否需要 human confirmation。

#### Scenario: Real docs write reads current source page before decision
- **WHEN** 用户执行 `goal new --write-docs`
- **THEN** 系统 MUST 读取当前目标页面的原文内容
- **THEN** 系统 MUST 展示将要写入的真实目标路径与对应阶段/槽位信息

#### Scenario: No semantic conflict allows direct write
- **WHEN** 候选文档与原文及当前 goal 不存在明显语义冲突
- **THEN** 系统 MAY 直接继续真实写入，而无需强制 human confirmation

#### Scenario: Semantic conflict requires human confirmation
- **WHEN** 候选文档与原文或当前 goal 存在明显语义冲突
- **THEN** 系统 MUST 在 human confirmation 完成前阻止真实 docs 写入

### Requirement: Real docs write SHALL reject candidates that drift outside the current product boundary
系统 MUST 在真实 `--write-docs` 模式下对候选文档执行语义边界校验，并阻止明显偏离当前产品边界的内容覆盖 docs 真源。

#### Scenario: Product vision candidate drifts to another product direction
- **WHEN** `product/vision.md` 候选内容把 `apps/oc-pi-cli` 改写成与当前 `goal-to-docs` / `review-loop` / `interactive-workbench` 主线无关的新产品
- **THEN** 系统 MUST 将该候选视为失败，并阻止真实写入

#### Scenario: Capability overview candidate stops being a capability map page
- **WHEN** `capabilities/overview.mdx` 候选内容不再保持一级能力地图语义
- **THEN** 系统 MUST 将该候选视为失败，并阻止真实写入

#### Scenario: Candidate describes a different goal than the current source page
- **WHEN** 候选文档与当前原文页面描述的产品目标明显不是同一个目标
- **THEN** 系统 MUST 将该候选标记为语义冲突，并要求 human confirmation 或直接阻止真实写入

### Requirement: Real docs mode SHALL update from current source-of-truth pages instead of rewriting from scratch
系统 MUST 在真实 `--write-docs` 模式下优先消费当前 docs 真源页面内容，并基于现有页面进行更新，而不是默认整页重写。

#### Scenario: Real docs writer prompt includes current source page
- **WHEN** 系统为真实 docs 模式构造 writer prompt
- **THEN** prompt 上下文 MUST 包含当前目标页面的现有文档内容
- **THEN** prompt MUST 明确要求保留页面类型与当前产品边界

### Requirement: Preview and sandbox modes SHALL remain available for failure inspection
系统 MUST 保持 preview 与 `--write-sandbox` 可继续用于观察失败样本，而不把真实 docs 模式的阻断策略强制应用到 sandbox 调试路径。

#### Scenario: Sandbox write keeps failure sample for inspection
- **WHEN** 候选文档在语义边界校验上失败，但用户执行的是 preview 或 `--write-sandbox`
- **THEN** 系统 MAY 返回失败结果并保留 sandbox 调试产物
- **THEN** 系统 MUST NOT 因此覆盖真实 docs 真源
