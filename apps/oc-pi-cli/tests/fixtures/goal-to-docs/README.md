# Goal-to-Docs Fixtures

这组 fixture（回归样本）用于稳定验证 `goal-to-docs 目标到文档` 四阶段闭环，而不是评估文案质量。

## Files

- `stable-goal.txt`
  - 用于验证稳定通过路径。
  - 预期：Stage 2 `capability-breakdown`、Stage 3 `feature-planning`、Stage 4 `handoff-summary` 全部 `accepted`。
- `adversarial-goal.txt`
  - 用于验证失败拦截路径。
  - 预期：由于诱导模型输出总结、建议清单、分析过程或模板外说明，流程会在 Stage 2/3/4 某处被结构校验或 reviewer 拦下。

## Commands

- `bun run goal-to-docs:check:preview`
  - 运行 stable 与 adversarial 两条 preview 样本。
- `bun run goal-to-docs:check:preview:stable`
  - 只运行 stable preview 样本，适合快速检查主成功路径。
- `bun run goal-to-docs:check:preview:adversarial`
  - 只运行 adversarial preview 样本，适合快速检查失败拦截路径。
- `bun run goal-to-docs:check:sandbox`
  - 运行 stable 的 `--write-sandbox` 样本，并确认输出仍落在 `tests/sandbox/...`。
- `bun run goal-to-docs:check:sandbox:stable`
  - 只运行 stable 的 sandbox 样本，适合日常回归。
- `bun run goal-to-docs:check`
  - 先运行 `types:check`，再串行运行 preview 与 sandbox 检查。

回归检查脚本位于 `tests/regression/check-goal-to-docs-fixtures.ts`，因为它属于测试资产而不是产品脚本。

## Notes

- 样本文本应保持尽量稳定，不要频繁改动。
- 默认验证边界是 `preview 预览模式` 与 `--write-sandbox 沙盒写入模式`，不把 `--write-docs 真实文档写入模式` 纳入日常回归。
- 因为检查会触发真实模型调用，完整命令可能耗时较长；日常可优先使用拆分后的单样本命令。
