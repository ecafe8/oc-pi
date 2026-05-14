## Context

当前 `apps/oc-pi-cli` 已经具备一条最小真实闭环：用户通过 `goal new` 触发 `goal-framing 目标定型`，系统调用真实模型生成 `product-goal 产品目标槽位` 内容，再进入一次 reviewer 审查，并把结果同步到 `WorkbenchState 工作台状态`。这条路径证明了 `Stage 5 Pi Adapter Integration PI 适配集成` 和 `Stage 6 MVP Closed Loop MVP 闭环` 的基础能力已经可用，但它仍然没有实现 `goal-to-docs 目标到文档` 协议中最关键的阶段衔接能力，即“上一阶段产物成为下一阶段输入”。

现有代码中，`run-mvp.ts` 把 `goal-framing 目标定型` 单独硬编码为第一阶段真实执行器，默认 preview 输出已经通过 `tests/sandbox/` 与 `apps/web-docs/` 进行隔离。下一步要扩展到 `capability-breakdown 能力拆解`，需要同时解决协议推进、阶段输入拼接、review 复用、路径安全和工作台状态推进五个方面的问题。该 change 横跨 `planning`、`routing`、`workbench`、`runtime` 与 CLI 命令入口，因此需要单独设计而不是继续在现有单阶段脚本上局部追加逻辑。

相关文档引用：
- `apps/web-docs/content/docs/planning/development-plan-framework.md`
- `apps/web-docs/content/docs/planning/goal-to-docs.md`
- `apps/web-docs/content/docs/planning/output-target-slots.md`
- `apps/web-docs/content/docs/planning/agent-role-config.md`

## Goals / Non-Goals

**Goals:**
- 让 `goal-to-docs 目标到文档` 真实执行从单阶段扩展为两阶段：`goal-framing 目标定型 -> capability-breakdown 能力拆解`。
- 保持 `RoleConfig 角色配置`、`SlotDefinition 槽位定义`、`GoalToDocsRunRecord 目标到文档执行记录` 与 `WorkbenchState 工作台状态` 的共享词汇表不变，只扩展行为，不重写协议。
- 让第二阶段明确消费第一阶段产物内容，而不是只消费用户原始 goal。
- 保持默认测试路径写入 `tests/sandbox/`，并继续将真实文档写入限制在显式 `--write-docs` 模式下。
- 为后续 `feature-planning 功能规划` 与 `handoff-summary 交接摘要` 的继续扩展预留同一套执行器结构。

**Non-Goals:**
- 不在本 change 中实现第三、第四阶段真实调用。
- 不在本 change 中引入新的 provider、认证模式或交互式 TUI。
- 不在本 change 中重构 `review-loop 审查循环` 为更复杂的多轮修订自动循环。
- 不在本 change 中要求 preview 模式写入真实 `apps/web-docs/` 文档目录。

## Decisions

### Decision 1: 用“按阶段顺序执行”的最小执行器替代继续堆单阶段专用逻辑

采纳方案：将 `run-mvp.ts` 从“只执行 `goal-framing`”的单阶段脚本，提升为“按阶段顺序执行前两阶段”的最小执行器。它仍然可以保持 MVP 级别的线性控制流，但内部应显式区分：
- 阶段配置解析
- 阶段输入解析
- writer prompt 构造
- artifact 路径解析
- review 调用
- run/workbench 状态推进

理由：
- `goal-to-docs 目标到文档` 文档已经定义了线性阶段顺序与阶段输入输出契约，最小执行器只需要开始遵守这套协议，而不是重新发明控制流。
- 后续第三、第四阶段可以沿用同样结构扩展，避免每个阶段再复制一套 ad-hoc 代码。

备选方案 A：继续在当前单阶段脚本中追加一个“第二阶段 if/else”分支。
- 不采纳原因：短期成本更低，但会把 prompt 组装、路径解析、状态推进和 review 耦合得更深，第三阶段接入时会更难维护。

备选方案 B：现在就一次性做成完整通用阶段引擎，覆盖四个阶段。
- 不采纳原因：当前 change 聚焦两阶段闭环，过早通用化会拉高变更范围，偏离增量推进原则。

### Decision 2: 第二阶段输入必须读取第一阶段产物内容，而不是只传逻辑路径或 run summary

采纳方案：`capability-breakdown 能力拆解` 的 writer prompt 必须读取第一阶段生成的 `product-goal 产品目标槽位` 实际文档内容，并将其作为结构化输入上下文的一部分提供给模型。为了兼容 preview 模式不落盘的安全策略，系统在 preview 模式下 MUST 直接以内存中的第一阶段产物文本传递给第二阶段；在 `--write-docs` 模式下可以复用同一份内存文本，也可以在需要时从已写入路径读取，但实现不得把“必须先落盘才能进入第二阶段”当成前提。

理由：
- `goal-to-docs 目标到文档` 文档已经明确第二阶段输入是“已审过的目标草案”，而不是抽象的阶段状态。
- 只传阶段路径或 summary 会丢失上下文细节，无法验证真正的阶段衔接能力。

备选方案 A：只用 `run.currentStageId` 与 `reviewSummary` 驱动第二阶段。
- 不采纳原因：不能证明阶段产物本身可被消费，和协议目标不一致。

备选方案 B：把第一阶段结果只以 JSON 摘要形式存到 session，再从 session 读取。
- 不采纳原因：会引入“文档产物”和“会话摘要”两套事实源，增加不一致风险。

### Decision 3: `goal-planner 目标规划者` 继续复用到前两阶段，阶段 `primaryOutputSlot 主输出槽位` 作为运行时真实输出绑定

采纳方案：保持 `goal-planner 目标规划者` 作为前两阶段的 writer，不在本 change 中新增 `capability-planner 能力规划者`。运行时以每个阶段的 `primaryOutputSlot 主输出槽位` 作为真实输出绑定来源，而 `RoleConfig.outputTarget 输出目标` 继续视为角色的默认主槽位，不要求它覆盖角色所参与的每一个阶段输出。

理由：
- `goal-to-docs 目标到文档` 文档已经明确 `goal-planner 目标规划者` 同时负责 `goal-framing 目标定型` 与 `capability-breakdown 能力拆解`。
- 如果为了第二阶段单独新增角色，会扩大当前 change 范围，并引入新的角色语义收敛问题。
- 现有协议中，`Stage Contract 阶段契约` 的 `primaryOutputSlot 主输出槽位` 本来就是阶段级输出真源，适合覆盖角色默认值。

备选方案 A：新增 `capability-planner 能力规划者` 角色。
- 不采纳原因：会扩大角色模型变更范围，并迫使 `agent-role-config 角色配置`、`RoleId 角色标识`、默认配置与 workbench 切换逻辑同时调整。

备选方案 B：强制要求 `RoleConfig.outputTarget 输出目标` 与角色参与的所有阶段输出完全一致。
- 不采纳原因：与当前 planning 文档不一致，也会让单角色复用到多阶段的能力明显变差。

### Decision 4: preview 与 write 两条路径继续复用同一逻辑路径，但解析到不同物理目标

采纳方案：
- `logicalArtifactPath 逻辑路径` 继续保持 `apps/web-docs/...`
- preview 模式解析到 `tests/sandbox/web-docs/...`
- `--write-docs` 模式解析到真实 `apps/web-docs/...`
- 两条路径都需要各自的 guard，防止误写到无关目录

理由：
- 逻辑路径保持不变，产品协议、slot mapping 槽位映射 和工作台展示可以稳定复用。
- 物理路径按模式切换，测试安全性与正式发布语义都能兼顾。

备选方案 A：preview 模式也直接指向真实路径，只是不写文件。
- 不采纳原因：会持续误导用户，不利于路径验证。

备选方案 B：preview 模式完全不返回逻辑路径，只返回 sandbox 路径。
- 不采纳原因：会丢失“逻辑槽位最终归属”的协议信息，不利于后续 write 模式切换与 workbench 展示。

### Decision 5: Review 结果与 CLI 返回结构必须按阶段参数化，而不是复用第一阶段硬编码结果

采纳方案：`review` 的结构化结果必须由当前阶段输入参数决定，包括 `artifactSlotId 产物槽位标识`、`reviewerRoleId 审查角色标识` 和返回给 CLI 的阶段结果。`RunGoalToDocsMvpResult` 也必须从单阶段输出升级为可以表达两阶段运行结果的结构，而不是继续只返回单个 `review`、单个 `logicalArtifactPath` 与单个 `resolvedArtifactAbsolutePath`。

理由：
- 当前实现中 `parseReviewResponse()` 把 `artifactSlotId` 硬编码为 `product-goal`，这在第二阶段一定会产生错误绑定。
- 两阶段闭环上线后，`index.ts`、`status show` 和 `review latest` 都需要消费更完整的阶段结果，单阶段返回结构不再足够。

备选方案 A：保留单个 review 结构，只约定它始终代表“最后一个阶段”。
- 不采纳原因：语义过于隐式，调试和验证时很难判断中间阶段信息是否丢失。

备选方案 B：让 CLI 侧自己通过读取 session 还原第二阶段结果。
- 不采纳原因：会把运行时结构责任推到消费端，增加状态分裂风险。

### Decision 6: Workbench 保持“当前阶段 + 最近审查结果”视图，但新增两阶段 run 摘要能力

采纳方案：保留当前 `status show` 的简化形态，不在本 change 中引入复杂 TUI，但在内部状态和 command 输出中允许展示两阶段 run 结果，例如：
- 当前阶段是否推进到 `capability-breakdown 能力拆解`
- 每个阶段最近的状态与产物路径
- 最新审查结果属于哪一阶段

理由：
- 现有 CLI 已有 `status show`、`review latest` 基础，增量扩展成本低。
- 这能为后续 TUI 展示提供稳定数据结构，而不需要现在就实现视觉层。

备选方案 A：只更新 session，不扩展 `status show` 展示。
- 不采纳原因：用户仍然看不到第二阶段闭环是否成功，不满足 MVP 可演示要求。

备选方案 B：直接实现完整 stage table 或 TUI spinner。
- 不采纳原因：超出当前 change 范围。

## Risks / Trade-offs

- [第二阶段 prompt 质量依赖第一阶段文档结构稳定性] → 通过在 prompt 中固定引用 `Product Goal Draft 产品目标草案` 的关键章节，并在 tasks 中要求补充最小快照测试缓解。
- [preview 模式下如果错误依赖磁盘文件，会导致第二阶段无法消费第一阶段结果] → 明确规定 preview 模式走内存产物传递，并在 tasks 中单列实现与验证任务。
- [preview 与 write 双路径逻辑可能产生状态展示混淆] → 继续明确区分 `logicalArtifactPath 逻辑路径` 与 `resolvedArtifactAbsolutePath 解析后的绝对路径`，并在 CLI 输出中同时展示。
- [继续使用单模型作为 writer 与 reviewer 可能弱化角色差异] → 当前 change 只验证运行时闭环，角色能力差异延后到后续 provider/model 策略优化。
- [`goal-planner 目标规划者` 的默认 `outputTarget 输出目标` 与第二阶段输出槽位不一致，可能让实现者误以为必须新建角色] → 以 `Stage Contract 阶段契约` 的 `primaryOutputSlot 主输出槽位` 为运行时真源，并在 design 与 tasks 中明确这一点。
- [当前 review 仍是单轮审查，未覆盖自动修订] → 先把两阶段串通，自动修订循环保持后续增量实现。

## Compatibility

- 对当前 `goal new` 用户兼容：默认仍是 preview 模式，只是从单阶段 preview 扩展为两阶段 preview。
- 对现有 `tests/sandbox/` 兼容：继续作为默认测试物理输出路径，不需要迁移已有安全策略。
- 对未来 `apps/web-docs` 正式写入兼容：只有显式 `--write-docs` 时才会落到真实目录，保持当前保护边界不变。

## Migration Plan

1. 保持现有 `goal-framing 目标定型` 逻辑可运行，先在实现中引入第二阶段配置与输入解析函数。
2. 接入 `capability-breakdown 能力拆解` writer/reviewer prompt 和对应 artifact 路径解析。
3. 扩展 run record 与 workbench 状态同步，使第二阶段可以被观察。
4. 在 preview 模式下完成端到端验证，确认所有产物都落在 `tests/sandbox/`。
5. 通过显式 `--write-docs` 模式验证真实路径守卫仍然有效。
6. 如出现回退需要，保留单阶段入口逻辑或在第二阶段执行失败时停止于第一阶段 accepted 状态。

预期验证命令：
- `bun run types:check`
- `bun run src/index.ts goal new "<goal>"`
- `bun run src/index.ts status show`
- `bun run src/index.ts review latest`
- 如启用真实写入验证，再执行：`bun run src/index.ts goal new --write-docs "<goal>"`

## Open Questions

- 第二阶段 `capability-breakdown 能力拆解` 的文档格式是否保持自由 Markdown，还是需要最小结构化模板（如能力列表 + 边界说明 + 风险）？
- `status show` 是否只展示“当前阶段”，还是应追加一个简化的 stage list 摘要？
- `review-notes 审查记录槽位` 是否应在下一步 change 中开始真实落盘，而不是继续只存在于 session state 中？
