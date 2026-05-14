## Why

`apps/oc-pi-cli` 当前已经完成 `goal-framing 目标定型 -> capability-breakdown 能力拆解` 的两阶段闭环，能够把用户目标转成产品愿景与能力总览，但还没有推进到 `goal-to-docs 目标到文档` 协议里真正可执行的规划层。按照当前产品目标，下一步需要让系统把 `capability-map 能力地图槽位` 继续收敛成 `feature-plan 功能规划槽位` 与 `mvp-scope MVP 范围槽位`，否则闭环仍停留在“解释目标”，没有形成“可持续推进的功能计划”。

## What Changes

- In Scope
- 将 `goal-to-docs 目标到文档` 从当前两阶段闭环扩展到第三阶段 `feature-planning 功能规划` 的真实执行。
- 让第三阶段消费已接受的 `capability-map 能力地图槽位` 内容，并输出 `feature-plan 功能规划槽位` 与 `mvp-scope MVP 范围槽位`。
- 明确第三阶段双产物策略：当前仍复用 `apps/web-docs/content/docs/planning/mvp-features.md` 作为共享物理落点，但运行时需要保留两个逻辑槽位的独立语义。
- 扩展运行时记录、工作台状态和 CLI 输出，使系统能够表达第三阶段的多槽位结果与最近审查状态。
- 保持当前三种模式语义不变：preview 只解析路径，`--write-sandbox` 写到 `tests/sandbox/`，`--write-docs` 才写到真实 `apps/web-docs/`。

- Out of Scope
- 本 change 不实现第四阶段 `handoff-summary 交接摘要` 的真实执行。
- 本 change 不新增新的 provider、认证模式或交互式 TUI。
- 本 change 不把 `feature-plan 功能规划槽位` 与 `mvp-scope MVP 范围槽位` 拆成两个独立物理文件；是否拆分留待后续 change 决定。

## Capabilities

### New Capabilities
- `goal-to-docs-feature-planning-stage`: 定义 `capability-breakdown 能力拆解 -> feature-planning 功能规划` 的第三阶段真实执行、双逻辑槽位输出、共享物理文档落点与工作台状态同步要求。

### Modified Capabilities
- `goal-to-docs-two-stage-closed-loop`: 从“两阶段停止”演进为“可继续推进到第三阶段”的基础执行器结构。

## Impact

- 受影响代码
- `apps/oc-pi-cli/src/planning/goal-to-docs/*`
- `apps/oc-pi-cli/src/workbench/*`
- `apps/oc-pi-cli/src/runtime/*`
- `apps/oc-pi-cli/src/index.ts`

- 受影响运行路径
- preview 继续只解析到 `tests/sandbox/web-docs/content/...`，不写盘
- `--write-sandbox` 写入 `tests/sandbox/web-docs/content/...`
- `--write-docs` 才允许写入 `apps/web-docs/content/...`

- 受影响文档与协议参考
- `apps/web-docs/content/docs/planning/development-plan-framework.md`
- `apps/web-docs/content/docs/planning/goal-to-docs.md`
- `apps/web-docs/content/docs/planning/output-target-slots.md`
- `apps/web-docs/content/docs/planning/agent-role-config.md`
- `apps/web-docs/content/docs/planning/docs-structure-and-output-spec.md`

- 验证影响
- 后续实现至少需要验证 `bun run types:check`
- 需要验证 `goal new` 在 preview / sandbox write 下可以推进到第三阶段，并返回 `feature-plan` 与 `mvp-scope` 的逻辑/解析路径
- 需要验证 `status show` / `review latest` 能观察到第三阶段结果
