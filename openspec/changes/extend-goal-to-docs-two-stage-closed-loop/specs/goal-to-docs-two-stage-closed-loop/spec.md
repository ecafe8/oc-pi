## ADDED Requirements

### Requirement: Goal-to-Docs SHALL execute the first two planning stages in order
系统 MUST 按照 `goal-framing 目标定型 -> capability-breakdown 能力拆解` 的顺序执行前两个 planning 阶段，并且只有当前一阶段达到 `accepted 已接受` 后，才允许进入后一阶段。

#### Scenario: First stage accepted unlocks second stage
- **WHEN** `goal-framing 目标定型` 阶段完成生成并被审查为 `accepted 已接受`
- **THEN** 系统 MUST 将 `capability-breakdown 能力拆解` 标记为可执行的下一阶段

#### Scenario: First stage not accepted blocks second stage
- **WHEN** `goal-framing 目标定型` 阶段审查结果为 `changes-requested 需要修改`
- **THEN** 系统 MUST 停留在第一阶段，且 MUST NOT 执行 `capability-breakdown 能力拆解`

### Requirement: Capability Breakdown SHALL consume the accepted Product Goal artifact
系统 MUST 让 `capability-breakdown 能力拆解` 阶段读取并消费 `goal-framing 目标定型` 阶段已接受的 `product-goal 产品目标槽位` 内容，而不是只依赖用户原始目标或阶段摘要。

#### Scenario: Second stage reads first stage artifact content
- **WHEN** 系统开始执行 `capability-breakdown 能力拆解`
- **THEN** prompt 上下文 MUST 包含来自 `product-goal 产品目标槽位` 的实际文档内容

#### Scenario: Missing first stage artifact blocks second stage
- **WHEN** `product-goal 产品目标槽位` 没有可读取内容或路径解析失败
- **THEN** 系统 MUST 将 `capability-breakdown 能力拆解` 标记为 `blocked 已阻塞`

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
