## Context

当前 `apps/oc-pi-cli` 的 `goal-to-docs 目标到文档` 运行链路已经具备四个阶段的默认配置入口，其中 `runtime/default-config.ts` 已经预留了 `handoff-summary 交接摘要` stage，但现有配置仍停留在旧语义：Stage 4 的 `inputArtifacts` 只有 `feature-plan`、`mvp-scope`，且仍通过 `next-summary -> tasks/next-up.md` 表达输出目标。运行实现也只真正执行前三阶段。结果是：`product/vision.md`、`capabilities/overview.mdx` 与 `planning/mvp-features.md` 可以分别生成，但系统缺少一个最终收束页，把这些已接受产物整理成适合交接、执行与后续任务推进的统一摘要；同时，动态“下一步做什么”的页面也需要与该摘要保持一致命名而不混写到同一物理文件。

本次 change 的约束很明确：
- 保持现有三阶段执行逻辑与真实 docs 写入防护不被破坏。
- 采用最小增量方式，把现有预留配置落到真实实现中。
- 继续遵守 `apps/web-docs` 目录约定与文档写作规则，不引入额外的控制平面或审批机制。

## Goals / Non-Goals

**Goals:**
- 让 `handoff-summary 交接摘要` 成为 `goal-to-docs` 的实际第四阶段，并在前三阶段均 `accepted` 后执行。
- 为第四阶段定义固定模板、结构校验、review prompt 与 stage input 规则。
- 让第四阶段结果进入现有 workbench、CLI 输出、preview、sandbox 与 real write 路径，并同时产出稳定摘要页与动态下一步页。
- 在真实 docs 模式下复用既有 source-aware write guard，而不是另起一套写入治理逻辑。

**Non-Goals:**
- 不调整现有前三阶段的物理目标页与共享路径语义。
- 不在本次 change 中新增第五阶段或任务自动分解器。
- 不扩大真实 docs 保护范围到所有 docs 页面。

## Decisions

### Decision 1: 第四阶段消费前三阶段已接受产物文本，而不是重新推导

采纳方案：`handoff-summary` 直接消费前三阶段的已接受 artifact text，至少包括：
- `product-goal`
- `capability-map`
- `feature-plan` / `mvp-scope`

因此默认配置中的 `handoff-summary.inputArtifacts` 必须同步更新为这四类上游产物，而不是继续沿用仅 `feature-plan`、`mvp-scope` 的旧值。

并在 prompt 中明确要求只做收束、摘要与下一步交接，不重复发散新的产品方向。Stage 4 输出分成两层语义：
- `handoff-summary`：稳定的阶段性交付摘要
- `handoff-next-up`：从摘要中提炼的动态下一步动作

理由：
- 这保持了 Stage 4 的职责单一，避免它重新定义产品边界。
- 已有前三阶段输出就是当前闭环的 source of truth，Stage 4 只应做归纳与交接。

备选方案 A：只消费第三阶段文档。
- 不采纳原因：会丢失 `vision` 与 `capability map` 中的上游约束，摘要容易失真。

备选方案 B：让 Stage 4 重新基于原始 goal 生成总结。
- 不采纳原因：会绕开前三阶段已接受产物，削弱闭环一致性。

### Decision 2: 第四阶段继续使用固定模板 + 结构校验 + reviewer 审查的现有模式

采纳方案：沿用 Stage 2/3 的模式，为 `handoff-summary` 定义固定 front matter、固定 H1 与固定章节，例如：
- Summary 当前交接摘要
- Confirmed Outputs 已确认产物
- Recommended Next Actions 建议下一步动作
- Open Questions 待确认问题

并在生成后执行：
- front matter 规范化
- 固定结构校验
- reviewer prompt 审查

理由：
- 与当前实现风格一致，便于复用现有工具函数与 review loop。
- 固定模板能降低 Stage 4 变成“泛化总结作文”的风险。

备选方案：让 Stage 4 自由输出自然语言总结。
- 不采纳原因：可读性虽然高，但可验证性与稳定性较差，不利于后续写入 guard 和 CLI 展示。

### Decision 3: 第四阶段使用 `handoff-summary` 主输出 + `handoff-next-up` 附加输出

采纳方案：为第四阶段定义两类命名一致的相关输出：
- `handoff-summary`：稳定摘要页，例如 `apps/web-docs/content/docs/tasks/handoff-summary.md`
- `handoff-next-up`：动态下一步页，例如 `apps/web-docs/content/docs/tasks/handoff-next-up.md`

配置层明确采用：
- `primaryOutputSlot = handoff-summary`
- `additionalOutputSlots = ['handoff-next-up']`

理由：
- `handoff-summary` 与 `handoff-next-up` 属于同一语义族，命名一致，关系清晰。
- 稳定摘要与动态下一步不再共用一个物理文件，可避免后续滚动更新时覆盖阶段性交付物。
- `primary + additional` 结构与现有 `feature-plan + mvp-scope` 模式一致，最利于复用当前 runner、CLI 输出与 workbench 元数据模型。

备选方案 A：继续复用 `next-summary -> next-up.md`。
- 不采纳原因：`next-up` 更适合动态滚动用途，不适合承载稳定交接摘要。

备选方案 B：只保留 `handoff-summary`，不生成动态下一步页。
- 不采纳原因：会缺失一个更适合日常滚动更新的执行入口。

### Decision 4: `tasks/next-up.md` 采用兼容保留策略，不再作为 Stage 4 真正目标页

采纳方案：Stage 4 的真实目标页改为：
- `tasks/handoff-summary.md`
- `tasks/handoff-next-up.md`

`tasks/next-up.md` 不再作为 `handoff-summary` 的 slot 落点，但本次 change 保留兼容策略讨论空间，至少保证：
- 不再把它当作 Stage 4 的 source of truth
- 不要求本次 change 必须删除该旧页面

理由：
- 这样可以先完成新语义落地，避免实现期被旧入口耦住。
- 兼容页面是否保留、跳转或标注弃用，可以作为后续单独收敛的问题。

### Decision 5: 真实 docs 写入治理直接复用现有 guard，但补充 Stage 4 页面锚点规则

采纳方案：Stage 4 在 `--write-docs` 模式下继续走现有真实写入流程：
- 读取当前真源页
- 基于现有页面更新的 writer prompt
- 结构校验
- 静态语义冲突检测与按需 human confirmation

同时分别为 `tasks/handoff-summary.md` 与 `tasks/handoff-next-up.md` 增加最小语义锚点，确保：
- `handoff-summary` 继续保持阶段性交付摘要职责
- `handoff-next-up` 继续保持动态下一步动作职责

第一版锚点规则最少要包含：
- 固定 front matter 字段约束
- 固定 H1 约束
- 必需章节名约束
- 页面职责关键词约束
- 与当前真源页保留锚点的最小比对

理由：
- 避免为一个新增阶段重复发明治理机制。
- 当前 guard 已经是此链路的安全基线，Stage 4 应该接入而不是旁路。

## Risks / Trade-offs

- [Stage 4 可能重复前三阶段内容，导致摘要价值不高] → 通过固定章节强制区分“确认产物”与“下一步动作”，避免纯复述。
- [新增双文档输出会扩大 Stage 4 的落点设计] → 通过一致命名、`primary + additional` 结构与单一职责划分控制复杂度，避免再引入更多派生页。
- [第四阶段让真实写入链路更长，失败点增加] → 继续复用现有 blocked/revising 语义，并通过 preview / sandbox 先观察失败样本。

## Compatibility

- 对 preview 与 `--write-sandbox` 兼容：只是多一个 stage 与多一份产物，不改变既有模式。
- 对 `--write-docs` 兼容：继续沿用现有真实写入防护与确认机制。
- 对 workbench/CLI 输出兼容：增加一个阶段记录，但不改变已有字段语义。

## Migration Plan

1. 在 `run-mvp.ts` 中把第四阶段接到当前三阶段成功路径之后。
2. 为 Stage 4 增加 prompt、normalize、validate、review prompt 与 input artifact 解析。
3. 在 `DEFAULT_GOAL_TO_DOCS_STAGES` 与 `DEFAULT_SLOT_DEFINITIONS` 中新增 `handoff-summary` / `handoff-next-up` 配置，并废止 Stage 4 对 `next-summary` 的直接依赖。
4. 在真实写入 guard 中补充这两个页面的最小语义规则。
5. 验证 preview、sandbox、real write 三条路径，并确认 `status show` / `review latest` 可观察到第四阶段。
6. 若 real write 验证产生真源改动，验证后立即恢复到正确文档语义。

预期验证命令：
- `bun run types:check`
- `bun run src/index.ts goal new "<goal>"`
- `bun run src/index.ts goal new --write-sandbox "<goal>"`
- `bun run src/index.ts goal new --write-docs "<goal>"`

## Open Questions

- `tasks/next-up.md` 后续是保留为空间兼容页、加弃用说明，还是在后续 change 中迁移为跳转/引用页更合适？
