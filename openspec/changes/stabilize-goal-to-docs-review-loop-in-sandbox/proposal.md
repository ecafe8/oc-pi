## Why

当前 `goal-to-docs 目标到文档` 已经具备四阶段闭环，但实际验证中仍频繁受到模型输出波动影响：结构已经基本正确的文档，仍会因为额外前言、格式漂移、reviewer 容错过低或附加说明过多而在 Stage 2/3/4 被拒绝。这使得闭环虽然存在，却还不够稳定，当前最需要的是先把沙箱环境中的文档生成稳定性做实，而不是继续扩大真实 docs 写入范围。

## What Changes

- In Scope
- 收紧 `goal-to-docs` 各阶段 writer prompt，减少模板外输出、长篇解释和自由发挥带来的结构漂移。
- 提升 reviewer prompt 的容错性，让“结构正确但内容较简洁”的文档更稳定地通过审查。
- 为 Stage 2、Stage 3、Stage 4 定义更明确的失败样式与稳定样式约束，并统一到现有 runner 中。
- 增加一组面向 preview 与 `--write-sandbox` 的稳定验证样本，作为后续回归基线。
- Out of Scope
- 不修改真实 docs source-aware write guard 的总体治理策略。
- 不要求本次 change 执行 `--write-docs` 验证。
- 不引入新的测试框架或端到端自动化测试基建。

## Capabilities

### New Capabilities
- `goal-to-docs-review-loop-stability`: 提升 `goal-to-docs` 在 preview 与 sandbox 模式下的文档生成稳定性，降低由 prompt/reviewer 波动带来的误拒与失败。

### Modified Capabilities

None.

## Impact

- 受影响代码主要在 `apps/oc-pi-cli/src/planning/goal-to-docs/run-mvp.ts`，可能少量涉及 CLI 输出或辅助验证逻辑。
- 需要把验证边界明确限制为 preview 与 `--write-sandbox`，不再把真实 docs 写入样本作为本 change 的完成条件。
- 需要形成若干稳定目标样本与失败样本，供后续人工回归使用。
