## ADDED Requirements

### Requirement: Stage 2-4 writer prompts SHALL constrain template-external output in preview and sandbox modes
系统 MUST 在 `goal-to-docs 目标到文档` 的 Stage 2 `capability-breakdown 能力拆解`、Stage 3 `feature-planning 功能规划` 与 Stage 4 `handoff-summary 交接摘要` / `handoff-next-up 下一步交接` 中，明确约束 writer 只输出目标文档本身，减少前言、解释、分析过程或总结造成的结构漂移。

#### Scenario: Writer output starts directly from document template
- **WHEN** 系统在 preview 或 `--write-sandbox` 模式下构造 Stage 2/3/4 的 writer prompt
- **THEN** prompt MUST 明确要求模型仅返回最终文档内容
- **THEN** prompt MUST 明确禁止输出模板外的前言、注释、分析过程、问答或总结

#### Scenario: Template-external prose is treated as unstable output style
- **WHEN** Stage 2/3/4 候选文档在固定模板之外加入明显的说明性段落或自由发挥内容
- **THEN** 系统 MUST 将其视为不稳定输出样式
- **THEN** 若固定结构已不满足，系统 MUST 直接按结构校验失败处理，而不是继续进入 reviewer 审查
- **THEN** 若固定结构仍满足但页面职责或文风不符合预期，系统 MUST 通过 review loop 要求修正

### Requirement: Reviewer SHALL accept structurally correct but concise Stage 2-4 documents
系统 MUST 在 Stage 2/3/4 的 reviewer prompt 中优先检查固定结构与页面职责，而不是因为内容偏简洁就默认要求扩写。

#### Scenario: Concise but valid document is accepted
- **WHEN** 候选文档具备固定 front matter、固定 H1、必需章节，且页面职责没有漂移
- **THEN** reviewer MUST 将其视为可接受文档
- **THEN** reviewer MUST NOT 仅因“内容还能更丰富”而返回 `changes-requested`

#### Scenario: Reviewer distinguishes brevity from structural failure
- **WHEN** 候选文档内容较短，但仍满足页面最小结构与职责要求
- **THEN** reviewer MUST 将其与缺失章节、标题错误或模板外输出区分开

### Requirement: Stage-specific output constraints SHALL preserve page roles in Stage 2-4
系统 MUST 为 Stage 2/3/4 的关键页面保留最小页面职责边界，确保生成结果仍然符合各自文档类型，而不是在结构正确的前提下悄悄漂移成其他文风。

#### Scenario: Capability overview remains a capability map page
- **WHEN** 系统生成 `capabilities/overview.mdx`
- **THEN** 文档 MUST 继续表现为一级能力地图页面
- **THEN** 系统 MUST NOT 允许其漂移成执行总结、提案说明或泛化建议页

#### Scenario: MVP features page remains a planning page
- **WHEN** 系统生成 `planning/mvp-features.md`
- **THEN** 文档 MUST 继续承载 `feature-plan 功能规划` 与 `mvp-scope MVP 范围` 的规划职责
- **THEN** 系统 MUST NOT 允许其漂移成纯总结、复盘或模板外建议清单

#### Scenario: Handoff pages keep symmetric closing roles
- **WHEN** 系统生成 `tasks/handoff-summary.md` 与 `tasks/handoff-next-up.md`
- **THEN** `handoff-summary` MUST 继续表现为阶段性交接摘要
- **THEN** `handoff-next-up` MUST 继续表现为动态下一步动作页
- **THEN** 系统 MUST NOT 允许两者互相混写或整体漂移成同一种页面

### Requirement: Stability verification SHALL be satisfied by preview and sandbox samples only
系统 MUST 将本 change 的完成验证边界限制在 preview 与 `--write-sandbox`，而不要求 `--write-docs` 样本作为通过条件。

#### Scenario: Preview sample is sufficient for non-writing stability check
- **WHEN** 实现完成后执行 preview 样本
- **THEN** 该样本 MAY 作为 Stage 2/3/4 稳定性验证的一部分
- **THEN** 系统 MUST NOT 因本 change 额外要求真实 docs 写入验证

#### Scenario: Sandbox sample is sufficient for artifact verification
- **WHEN** 实现完成后执行 `goal new --write-sandbox`
- **THEN** 该样本 MUST 可用于检查 Stage 2/3/4 产物结构、页面职责与 reviewer 结果
- **THEN** 系统 MUST NOT 把 `--write-docs` 成功作为本 change 的完成前提

### Requirement: Stability checks SHALL cover both stable-pass and unstable-fail samples
系统 MUST 为本 change 保留至少一类稳定通过样本与至少一类应失败样本，以同时验证“成功率提升”与“异常风格仍被拦截”。

#### Scenario: Stable sample passes with accepted downstream stages
- **WHEN** 用户提供贴近当前产品边界的稳定目标样本
- **THEN** Stage 2/3/4 应更稳定地产生 `accepted` 结果或最小修改后通过

#### Scenario: Unstable sample still triggers correction path
- **WHEN** 候选文档出现模板外说明、角色漂移或错误文风
- **THEN** 系统 MUST 根据失败类型走对应路径：结构不满足时直接结构失败，结构满足但内容不当时进入 review loop
- **THEN** 系统 MUST NOT 因提升容错而放弃这些边界检查
