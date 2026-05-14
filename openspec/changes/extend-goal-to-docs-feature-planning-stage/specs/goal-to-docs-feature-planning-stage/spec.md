## ADDED Requirements

### Requirement: Goal-to-Docs SHALL execute the third planning stage after capability breakdown acceptance
系统 MUST 在 `capability-breakdown 能力拆解` 阶段被审查为 `accepted 已接受` 后，按顺序执行第三阶段 `feature-planning 功能规划`。

#### Scenario: Accepted capability map unlocks feature planning
- **WHEN** `capability-breakdown 能力拆解` 阶段完成并返回 `accepted 已接受`
- **THEN** 系统 MUST 将 `feature-planning 功能规划` 标记为可执行的下一阶段

#### Scenario: Capability breakdown not accepted keeps feature planning pending
- **WHEN** `capability-breakdown 能力拆解` 阶段返回 `changes-requested 需要修改` 或 `revising 修订中`
- **THEN** 系统 MUST NOT 执行 `feature-planning 功能规划`
- **THEN** `feature-planning 功能规划` 的状态 MUST 保持为 `pending 待开始`

### Requirement: Feature Planning SHALL consume the accepted capability map artifact
系统 MUST 让 `feature-planning 功能规划` 阶段读取并消费第二阶段已接受的 `capability-map 能力地图槽位` 实际文档内容，而不是只依赖用户原始目标或上游 summary。

#### Scenario: Third stage reads capability map artifact content
- **WHEN** 系统开始执行 `feature-planning 功能规划`
- **THEN** prompt 上下文 MUST 包含来自 `capability-map 能力地图槽位` 的完整文档文本

#### Scenario: Preview mode uses in-memory capability map artifact
- **WHEN** 系统在 preview 模式下执行 `feature-planning 功能规划`
- **THEN** 系统 MUST 直接使用第二阶段的内存产物文本作为第三阶段输入来源，而 MUST NOT 依赖“第二阶段已真实写盘”这一前提

### Requirement: Feature Planning SHALL preserve dual logical output slots over a shared physical document
系统 MUST 让 `feature-planning 功能规划` 阶段同时保留 `feature-plan 功能规划槽位` 与 `mvp-scope MVP 范围槽位` 的逻辑语义，即使这两个槽位当前共享同一个物理文档路径 `apps/web-docs/content/docs/planning/mvp-features.md`。

#### Scenario: Third stage retains primary and additional slots
- **WHEN** 系统完成 `feature-planning 功能规划` 阶段执行
- **THEN** 运行时记录 MUST 保留 `primaryOutputSlot = feature-plan 功能规划槽位`
- **THEN** 运行时记录 MUST 保留 `additionalOutputSlots` 中包含 `mvp-scope MVP 范围槽位`

#### Scenario: Shared physical path does not collapse logical slot identity
- **WHEN** `feature-plan 功能规划槽位` 与 `mvp-scope MVP 范围槽位` 都解析到同一个物理文档路径
- **THEN** 系统 MUST NOT 因为路径相同而丢失 `mvp-scope MVP 范围槽位` 的阶段语义
- **THEN** 系统 MUST 保留 `slotId -> path` 的已解析目标映射，作为共享物理路径下的逻辑槽位真源

#### Scenario: Shared physical path is deduplicated in artifact paths
- **WHEN** 第三阶段的主槽位与附加槽位解析到同一个物理文档路径
- **THEN** `artifactPaths 产物路径` MUST NOT 重复记录同一路径两次

### Requirement: Feature Planning output SHALL follow a fixed planning document structure
系统 MUST 让第三阶段生成的 `planning/mvp-features.md` 草案符合固定结构，以便同时承载 `feature-plan 功能规划槽位` 与 `mvp-scope MVP 范围槽位`。

#### Scenario: Third stage document contains required sections
- **WHEN** 系统生成第三阶段文档
- **THEN** 文档 front matter MUST 严格包含：
  - `title: MVP Features MVP 功能清单`
  - `description: apps/oc-pi-cli 当前第一批核心功能与其作用边界定义`
- **THEN** 文档 H1 MUST 为 `# MVP Features MVP 功能清单`
- **THEN** 文档 MUST 至少包含 `Feature List 功能清单`、`MVP Scope MVP 范围`、`Prioritization Rule 优先级规则` 与 `Open Questions 待定问题` 这些固定章节

#### Scenario: Invalid structure is rejected before acceptance
- **WHEN** 第三阶段文档缺少固定章节、front matter 或 H1 不符合要求
- **THEN** 系统 MUST 将该阶段结果视为 `changes-requested 需要修改`，而 MUST NOT 直接接受

### Requirement: Goal command results SHALL expose third-stage slot metadata
系统 MUST 让 `goal new` 的返回结果与运行状态能够表达第三阶段的双槽位元数据，而不是把它降级成普通单产物阶段。

#### Scenario: Goal command returns third-stage slot metadata
- **WHEN** 系统完成第三阶段 preview、sandbox write 或真实 write 运行
- **THEN** 返回结构 MUST 能表达第三阶段的 `primaryOutputSlot 主输出槽位`、`additionalOutputSlots 附加输出槽位`、`resolvedTargets 已解析目标`、`logicalArtifactPath 逻辑产物路径`、`resolvedArtifactAbsolutePath 解析后的绝对产物路径` 与审查结果

#### Scenario: Status and review commands reflect third-stage execution
- **WHEN** 第三阶段已运行或已完成审查
- **THEN** `status show` 与 `review latest` MUST 能反映第三阶段的当前状态与最近审查结果
