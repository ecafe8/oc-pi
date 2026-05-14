## ADDED Requirements

### Requirement: Goal-to-Docs SHALL execute the first two planning stages in order
系统 MUST 按照 `goal-framing 目标定型 -> capability-breakdown 能力拆解` 的顺序执行前两个 planning 阶段，并且只有当前一阶段达到 `accepted 已接受` 后，才允许进入后一阶段。

#### Scenario: First stage accepted unlocks second stage
- **WHEN** `goal-framing 目标定型` 阶段完成生成并被审查为 `accepted 已接受`
- **THEN** 系统 MUST 将 `capability-breakdown 能力拆解` 标记为可执行的下一阶段

#### Scenario: First stage not accepted blocks second stage
- **WHEN** `goal-framing 目标定型` 阶段审查结果为 `changes-requested 需要修改`
- **THEN** 系统 MUST 停留在第一阶段，且 MUST NOT 执行 `capability-breakdown 能力拆解`
- **THEN** `capability-breakdown 能力拆解` 的阶段状态 MUST 保持为 `pending 待开始`，而不是被标记为已运行

#### Scenario: First stage revising keeps second stage pending
- **WHEN** `goal-framing 目标定型` 阶段处于 `revising 修订中`
- **THEN** 系统 MUST NOT 执行 `capability-breakdown 能力拆解`
- **THEN** `capability-breakdown 能力拆解` 的阶段状态 MUST 保持为 `pending 待开始`

### Requirement: Capability Breakdown SHALL consume the accepted Product Goal artifact
系统 MUST 让 `capability-breakdown 能力拆解` 阶段读取并消费 `goal-framing 目标定型` 阶段已接受的 `product-goal 产品目标槽位` 内容，而不是只依赖用户原始目标或阶段摘要。

#### Scenario: Second stage reads first stage artifact content
- **WHEN** 系统开始执行 `capability-breakdown 能力拆解`
- **THEN** prompt 上下文 MUST 包含来自 `product-goal 产品目标槽位` 的实际文档内容

#### Scenario: Missing first stage artifact blocks second stage
- **WHEN** `product-goal 产品目标槽位` 没有可读取内容或路径解析失败
- **THEN** 系统 MUST 将 `capability-breakdown 能力拆解` 标记为 `blocked 已阻塞`

#### Scenario: Preview mode uses in-memory first stage artifact
- **WHEN** 系统在 preview 模式下执行 `capability-breakdown 能力拆解`
- **THEN** 系统 MUST 直接使用第一阶段的内存产物文本作为第二阶段输入来源，而 MUST NOT 依赖“第一阶段已真实写盘”这一前提

### Requirement: Preview and write modes SHALL resolve different physical output paths
系统 MUST 保持逻辑产物路径与物理产物路径分离。默认 preview 模式 MUST 将物理产物路径解析到 `tests/sandbox/`；显式 `--write-docs` 模式 MUST 将物理产物路径解析到真实 `apps/web-docs/`。

#### Scenario: Preview mode resolves to tests sandbox
- **WHEN** 用户执行不带 `--write-docs` 的 `goal new`
- **THEN** 系统 MUST 输出 `logicalArtifactPath 逻辑产物路径`
- **THEN** 系统 MUST 将 `resolvedArtifactAbsolutePath 解析后的绝对产物路径` 指向 `tests/sandbox/`
- **THEN** 系统 MUST NOT 写入真实 `apps/web-docs/`

#### Scenario: Write mode resolves to real docs path
- **WHEN** 用户执行带 `--write-docs` 的 `goal new`
- **THEN** 系统 MUST 将 `resolvedArtifactAbsolutePath 解析后的绝对产物路径` 指向真实 `apps/web-docs/`
- **THEN** 系统 MUST 在写入前校验目标路径位于允许的 docs 根目录内

### Requirement: Workbench state SHALL reflect two-stage execution progress
系统 MUST 在 `GoalToDocsRunRecord 目标到文档执行记录` 与 `WorkbenchState 工作台状态` 中反映前两阶段的执行与审查结果，使 `status show` 与 `review latest` 可以表达两阶段运行状态。

#### Scenario: Status shows second stage current state
- **WHEN** 第二阶段已开始执行或已完成
- **THEN** `status show` MUST 能显示当前阶段标识、当前阶段状态与对应产物路径

#### Scenario: Review command reflects latest stage review result
- **WHEN** 第二阶段完成最新一次审查
- **THEN** `review latest` MUST 返回该阶段最新的审查状态、摘要与 finding 计数

### Requirement: Review results SHALL bind to the active stage slot
系统 MUST 让每个阶段的 `ReviewResult 审查结果` 绑定到该阶段自己的 `primaryOutputSlot 主输出槽位`，而不是复用第一阶段的固定槽位值。

#### Scenario: Capability breakdown review binds to capability map slot
- **WHEN** 系统完成 `capability-breakdown 能力拆解` 阶段审查
- **THEN** 返回的 `ReviewResult.artifactSlotId` MUST 为 `capability-map 能力地图槽位`

#### Scenario: Goal framing review binds to product goal slot
- **WHEN** 系统完成 `goal-framing 目标定型` 阶段审查
- **THEN** 返回的 `ReviewResult.artifactSlotId` MUST 为 `product-goal 产品目标槽位`

### Requirement: Goal command results SHALL expose multi-stage runtime output
系统 MUST 让 `goal new` 的运行结果能够表达当前执行过的多个阶段，而不是只返回单阶段的 artifact 与 review 信息。

#### Scenario: Goal command returns logical and resolved paths for each executed stage
- **WHEN** 系统完成两阶段 preview 或 write 运行
- **THEN** 返回结构 MUST 能表示每个已执行阶段的 `logicalArtifactPath 逻辑产物路径`、`resolvedArtifactAbsolutePath 解析后的绝对产物路径` 与审查结果
