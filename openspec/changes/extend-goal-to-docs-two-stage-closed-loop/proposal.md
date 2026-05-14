## Why

`apps/oc-pi-cli` 当前已经具备 `goal-framing 目标定型` 的最小真实闭环，但仍停留在“单阶段演示”水平，尚未满足 `Development Plan Framework 开发计划框架` 中 `Stage 6 MVP Closed Loop MVP 闭环` 对多阶段 planning 主路径的要求。现在需要把 `goal-to-docs 目标到文档` 从单阶段推进到两阶段真实闭环，使系统第一次具备“上一阶段产物成为下一阶段输入”的产品级运行能力。

## What Changes

- In Scope
- 将 `goal-to-docs 目标到文档` 从单阶段 `goal-framing 目标定型` 扩展为两阶段闭环，新增真实 `capability-breakdown 能力拆解` 执行。
- 为第二阶段建立明确的输入绑定，使 `product-goal 产品目标槽位` 产物可以被下一阶段读取、拼接到 prompt，并参与 `review-loop 审查循环`。
- 扩展运行时记录、工作台状态和命令输出，使 `status show`、`review latest` 能表达两阶段运行结果，而不是只反映第一阶段。
- 保持当前安全策略：默认测试输出继续落到 `tests/sandbox/`，只有显式 `--write-docs` 才允许真实写入 `apps/web-docs/`。
- 补齐与两阶段闭环相关的规范引用和验证步骤，使后续 Stage 3/4 继续推进时有明确契约基础。

- Out of Scope
- 本 change 不扩展到 `feature-planning 功能规划` 与 `handoff-summary 交接摘要` 的真实执行。
- 本 change 不引入完整 TUI Loading 视觉实现，也不引入新的 provider 或认证方式。
- 本 change 不把 preview 模式产物真正写入真实 `apps/web-docs` 文档目录。

## Capabilities

### New Capabilities
- `goal-to-docs-two-stage-closed-loop`: 定义 `goal-framing 目标定型 -> capability-breakdown 能力拆解` 的两阶段真实 planning 闭环、阶段输入衔接、预览/真实输出路径规则与工作台状态同步要求。

### Modified Capabilities
- 无

## Impact

- 受影响代码
- `apps/oc-pi-cli/src/planning/goal-to-docs/*`
- `apps/oc-pi-cli/src/routing/*`
- `apps/oc-pi-cli/src/workbench/*`
- `apps/oc-pi-cli/src/index.ts`
- `apps/oc-pi-cli/src/runtime/*`

- 受影响运行路径
- 默认 preview 继续写入 `tests/sandbox/web-docs/content/...`
- 显式 `--write-docs` 才允许写入 `apps/web-docs/content/...`

- 受影响文档与协议参考
- `apps/web-docs/content/docs/planning/development-plan-framework.md`
- `apps/web-docs/content/docs/planning/goal-to-docs.md`
- `apps/web-docs/content/docs/planning/output-target-slots.md`
- `apps/web-docs/content/docs/planning/agent-role-config.md`

- 验证影响
- 后续实现至少需要验证 `bun run types:check`
- 需要补充 `goal new` 两阶段 preview 路径验证，以及 `status show` / `review latest` 的两阶段结果校验
