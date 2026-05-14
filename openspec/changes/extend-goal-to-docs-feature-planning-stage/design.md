## Context

当前 `apps/oc-pi-cli` 的 `goal-to-docs 目标到文档` 已经完成前两阶段：`goal-framing 目标定型` 生成 `product-goal 产品目标槽位`，`capability-breakdown 能力拆解` 生成 `capability-map 能力地图槽位`。这证明运行时已经具备线性阶段推进、阶段输入消费、writer-reviewer 编写者-审查者 协作、preview/sandbox/write 三模式路径解析与工作台状态同步的最小骨架。但当前产物仍停在“解释产品要做什么”和“列出一级能力”，尚未形成面向交付的 `Feature List 功能清单文档` 与 `MVP Scope MVP 范围文档`。

根据 `apps/web-docs/content/docs/planning/goal-to-docs.md`，第三阶段 `feature-planning 功能规划` 的输入是真实的 `capability-map 能力地图槽位`，输出同时包括 `feature-plan 功能规划槽位` 与 `mvp-scope MVP 范围槽位`。同时 `apps/web-docs/content/docs/planning/output-target-slots.md` 与 `docs-structure-and-output-spec.md` 已明确这两个逻辑槽位当前共享 `apps/web-docs/content/docs/planning/mvp-features.md` 这一物理落点。因此，第三阶段不是简单新增一个 prompt，而是第一次要求运行时处理“一个阶段、两个逻辑槽位、一个共享物理文档”的组合语义。

相关文档引用：
- `apps/web-docs/content/docs/planning/development-plan-framework.md`
- `apps/web-docs/content/docs/planning/goal-to-docs.md`
- `apps/web-docs/content/docs/planning/output-target-slots.md`
- `apps/web-docs/content/docs/planning/agent-role-config.md`
- `apps/web-docs/content/docs/planning/docs-structure-and-output-spec.md`

## Goals / Non-Goals

**Goals:**
- 让 `goal-to-docs 目标到文档` 真实执行从两阶段扩展到三阶段：`goal-framing 目标定型 -> capability-breakdown 能力拆解 -> feature-planning 功能规划`。
- 让第三阶段真实消费第二阶段已接受的 `capability-map 能力地图槽位` 文档内容。
- 让第三阶段输出同时覆盖 `feature-plan 功能规划槽位` 与 `mvp-scope MVP 范围槽位`，并保持这两个逻辑槽位与共享物理文档之间的关系清晰可观察。
- 保持 preview / `--write-sandbox` / `--write-docs` 三种模式语义一致。
- 让 `status show`、`review latest` 与 CLI 结果结构能表达第三阶段及其双槽位产物。

**Non-Goals:**
- 不在本 change 中实现第四阶段 `handoff-summary 交接摘要`。
- 不在本 change 中拆分 `planning/mvp-features.md` 为两个独立文件。
- 不在本 change 中引入多轮自动修订循环或新的角色类型。

## Decisions

### Decision 1: 第三阶段沿用当前线性执行器结构，不提前重构成完全通用多产物引擎

采纳方案：继续在 `run-mvp.ts` 的最小线性执行器上扩展第三阶段，但把第三阶段的输入解析、writer prompt、review prompt、结果映射与文档后处理显式拆开，为后续第四阶段留出可扩展位置。

理由：
- 当前两阶段结构已可运行，继续增量扩展第三阶段的风险最低。
- 现在主要的不确定性在“双逻辑槽位 + 单物理文档”语义，而不是完整阶段引擎抽象。

备选方案 A：现在就重构成完整的通用阶段引擎。
- 不采纳原因：会扩大变更范围，偏离当前“按产品闭环逐阶段前进”的节奏。

### Decision 2: 第三阶段 writer 继续使用 `doc-writer 文档编写者`，以 `feature-plan 功能规划槽位` 作为主输出槽位，并在同一文档中声明 `mvp-scope MVP 范围槽位`

采纳方案：保持 `DEFAULT_GOAL_TO_DOCS_STAGES` 中 `feature-planning 功能规划` 的既有配置不变：
- `primaryOutputSlot 主输出槽位`: `feature-plan`
- `additionalOutputSlots 附加输出槽位`: `mvp-scope`
- writer: `doc-writer 文档编写者`
- reviewer: `doc-reviewer 文档审查者`

第三阶段生成的单份 Markdown 文档 MUST 同时包含“功能规划”和“MVP 范围”两个可辨识分区，运行时以阶段契约而不是文件数量来维护两个逻辑槽位语义。

对于共享物理路径的运行时真源，采纳以下规则：
- `GoalToDocsStageRecord 目标到文档阶段记录` 仍可保留 `artifactPaths 产物路径`，但第三阶段写入时 MUST 去重，避免同一路径重复出现两次。
- 运行时与 CLI/调试输出 MUST 额外保留 `resolvedTargets 已解析目标 = [{ slotId, path }]` 或等价结构，作为 `slotId -> path` 的真源映射。
- 当 `feature-plan 功能规划槽位` 与 `mvp-scope MVP 范围槽位` 指向同一物理路径时，系统 MUST 以 `resolvedTargets 已解析目标` 区分两个逻辑槽位，而不是依赖 `artifactPaths 产物路径` 反推。

理由：
- 这与 `goal-to-docs 目标到文档` 和 `output-target-slots 输出目标槽位` 当前真源一致。
- 先保持单文件物理落点，可避免提前引入跨文件同步问题。

备选方案 A：让第三阶段一次生成两个物理文件。
- 不采纳原因：与当前 docs 结构真源不一致，会引入额外迁移成本。

### Decision 3: 第三阶段输入继续消费上游完整文档文本，preview 模式仍以内存传递为真源

采纳方案：`feature-planning 功能规划` 阶段 MUST 读取第二阶段已接受的 `capability-map 能力地图槽位` 完整文档文本，并在 preview 模式下继续直接消费内存中的文本内容，而不是依赖磁盘文件。

理由：
- 与前两阶段衔接策略一致，可避免 preview 模式下因为不落盘而阻断第三阶段。
- `feature-planning 功能规划` 比前两阶段更依赖上游结构化内容，不能只用摘要替代。

### Decision 4: 第三阶段生成结果使用“固定模板 + 结构校验”策略，而不是只依赖自由 prompt

采纳方案：沿用前面在 `capability-breakdown 能力拆解` 已经验证有效的策略：
- writer prompt 提供固定模板骨架
- 写盘前做最小 front matter 规范化
- review 前执行程序化结构校验

第三阶段的 `planning/mvp-features.md` 需要至少固定：
- front matter：
  - `title: MVP Features MVP 功能清单`
  - `description: apps/oc-pi-cli 当前第一批核心功能与其作用边界定义`
- H1：
  - `# MVP Features MVP 功能清单`
- `## Feature List 功能清单`
- `## MVP Scope MVP 范围`
- `## Prioritization Rule 优先级规则`
- `## Open Questions 待定问题`

理由：
- 第三阶段输出首次承载“双槽位共享文档”语义，格式漂移会直接影响运行时对 `feature-plan` 与 `mvp-scope` 的绑定判断。

### Decision 5: 运行时记录与 CLI 返回结构继续按“每阶段一条结果”表达，但第三阶段结果需要额外暴露双槽位信息

采纳方案：保持 `goal new` 返回 `stages[]` 结构不变，但第三阶段结果需要额外暴露：
- `primaryOutputSlot 主输出槽位`
- `additionalOutputSlots 附加输出槽位`
- `resolvedTargets 已解析目标`
- `logicalArtifactPath 逻辑产物路径`
- `resolvedArtifactAbsolutePath 解析后的绝对路径`

同时 `GoalToDocsRunRecord 目标到文档执行记录` 中第三阶段的 `artifactPaths 产物路径` 仍可以只有一个共享物理路径，但 `primaryOutputSlot` / `additionalOutputSlots` 必须保持完整，不能因为共用文件就丢掉 `mvp-scope MVP 范围槽位`；`resolvedTargets 已解析目标` 则作为 `slotId -> path` 的判定真源。

理由：
- CLI 与工作台消费的核心仍是“阶段视角”，不必为了双槽位改成完全不同的返回结构。
- 但如果不显式暴露 `additionalOutputSlots`，后续很容易把第三阶段误解成单产物阶段。

## Risks / Trade-offs

- [双逻辑槽位共享单文件会让 review 与 artifact 绑定语义变复杂] → 通过保留 `primaryOutputSlot` / `additionalOutputSlots` 明确区分，并在 tasks 中要求验证 CLI 输出与 run record。
- [第三阶段模板约束不足会导致 `mvp-scope` 分区丢失] → 通过固定模板 + 程序化结构校验缓解。
- [继续沿用线性执行器可能让第四阶段接入时再次出现复制代码] → 当前 change 要求把第三阶段输入/输出处理拆成独立函数，为下一步扩展保留结构。
- [共享物理文档可能掩盖未来拆文件需求] → 在 design 中明确这是当前契约，不阻止后续 change 拆分。

## Compatibility

- 对当前两阶段 preview/sandbox/write 用户兼容：默认行为不变，只是成功运行后可继续进入第三阶段。
- 对当前 docs 真源兼容：继续使用 `apps/web-docs/content/docs/planning/mvp-features.md` 作为 `feature-plan 功能规划槽位` 与 `mvp-scope MVP 范围槽位` 的共享物理落点。
- 对未来第四阶段兼容：保留同一线性执行器与阶段契约模式，避免重新发明推进规则。

## Migration Plan

1. 保持前两阶段运行路径不变，在实现中接入第三阶段输入解析与 prompt 构造。
2. 让第三阶段先在 preview 模式下跑通，确认 `capability-map` 可以驱动 `planning/mvp-features.md` 草案生成。
3. 接入第三阶段结构校验、review prompt 与结果映射。
4. 扩展 CLI 输出、workbench 同步与 `review latest` 来源，使第三阶段可以被观察。
5. 验证 `--write-sandbox` 写盘结果后，再决定是否做受控 `--write-docs` 验证。

预期验证命令：
- `bun run types:check`
- `bun run src/index.ts goal new "<goal>"`
- `bun run src/index.ts goal new --write-sandbox "<goal>"`
- `bun run src/index.ts status show`
- `bun run src/index.ts review latest`

## Open Questions

- `planning/mvp-features.md` 是否需要继续与现有文档完全同构，还是允许在固定章节内做最小结构调整？
- 第三阶段 review 结果是否需要开始显式回报“主槽位 + 附加槽位都被接受”，还是继续只绑定主槽位并在 summary 中说明？
- 第四阶段 `handoff-summary 交接摘要` 是否应直接消费第三阶段同一共享文档，还是拆成更明确的中间摘要对象？
