## Why

`apps/oc-pi-cli` 现在已经具备 `goal-to-docs 目标到文档` 的三阶段闭环，并且真实 `--write-docs` 路径、session 持久化、`status show` 与 `review latest` 都已验证可用。但真实写入验证也暴露出一个更高优先级的产品风险：模型在满足基础结构约束的情况下，仍可能把 `apps/web-docs` 真源文档重写成偏离当前产品边界的新方向，从而污染后续阶段输入与文档真相。这个风险不属于路径 guard 或状态同步问题，而是“真实文档写入治理”问题。

在继续推进第四阶段 `handoff-summary 交接摘要` 之前，需要先为真实 `--write-docs` 增加保护层，使系统能够先读取当前真源文档，检测候选内容是否与原文和当前目标存在语义冲突，并只在存在明显冲突时触发 human confirmation，同时优先基于当前真源文档进行增量更新，而不是每次整页重写。

## What Changes

- In Scope
- 为 `goal new --write-docs` 增加原文感知的受控写入流程：在真正写入 `apps/web-docs` 前读取当前真源文档、输出目标路径与候选写入摘要，并在检测到语义冲突时要求 human confirmation。
- 引入面向真实 docs 真源的语义边界校验，优先覆盖 `product/vision.md`、`capabilities/overview.mdx` 与 `planning/mvp-features.md` 这三类核心文档。
- 将真实 docs 模式从“整页重写”优先切换为“基于当前真源文档更新”优先，要求 prompt 显式消费现有文档内容，并限制修改范围。
- 保持 preview 与 `--write-sandbox` 语义不变；这些模式不需要新增确认步骤。

- Out of Scope
- 本 change 不修改 `goal-to-docs 目标到文档` 的阶段顺序或槽位模型。
- 本 change 不引入新的 provider、认证方式或交互式 TUI。
- 本 change 不要求把所有 docs 页面都纳入语义边界校验；第一版只覆盖当前主闭环依赖的核心页面。

## Capabilities

### New Capabilities
- `goal-to-docs-real-docs-write-guard`: 定义真实 `--write-docs` 写入前原文对比、语义冲突检测、条件 human confirmation 与基于真源更新的要求。

### Modified Capabilities
- `goal-to-docs-feature-planning-stage`: 继续保留三阶段执行能力，但真实文档写入时必须经过新的保护层。

## Impact

- 受影响代码
- `apps/oc-pi-cli/src/index.ts`
- `apps/oc-pi-cli/src/planning/goal-to-docs/*`
- `apps/oc-pi-cli/src/runtime/*`
- `apps/oc-pi-cli/src/workbench/*`

- 受影响运行路径
- preview 继续只解析到 `tests/sandbox/web-docs/content/...`，不写盘
- `--write-sandbox` 继续写入 `tests/sandbox/web-docs/content/...`
- `--write-docs` 变为受控真实写入：先读取原文并做语义冲突检测，无冲突可直接写；有冲突时必须 human 确认后才写到 `apps/web-docs/content/...`

- 受影响文档与协议参考
- `apps/web-docs/content/docs/planning/goal-to-docs.md`
- `apps/web-docs/content/docs/planning/output-target-slots.md`
- `apps/web-docs/content/docs/planning/docs-structure-and-output-spec.md`
- `apps/web-docs/content/docs/product/vision.md`
- `apps/web-docs/content/docs/capabilities/overview.mdx`
- `apps/web-docs/content/docs/planning/mvp-features.md`

- 验证影响
- 需要验证真实 `--write-docs` 在无语义冲突时可直接完成真实写入，在有语义冲突时不会未经 human 确认就覆盖 docs 真源
- 需要验证语义边界校验可以拒绝明显偏离当前产品真相的候选文档
- 需要验证在消费现有真源文档后，真实写入结果更稳定地保持当前产品边界
