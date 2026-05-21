## 1. Slash Command 补全增强

- [ ] 1.1 在 `apps/oc-pi-cli/src/workbench/views/index.ts` 中增强 `WORKBENCH_COMMANDS` 定义，使 `/` 后命令列表可随前缀动态过滤，并确认 `Tab` 完成体验与当前 `Editor` 行为一致。
- [ ] 1.2 为 `/session-resume` 与 `/session-fork` 增加基于当前 session store 的参数补全候选，至少展示 `sessionName` / `sessionId` 与最近更新时间或 goal 摘要中的一项。
- [ ] 1.3 调整补全后的光标与尾随空格行为，确保用户完成命令后可以继续输入参数或自然语言描述。

## 2. 命令 + 自然语言描述语义

- [ ] 2.1 在 `apps/oc-pi-cli/src/workbench/index.ts` 的 slash command 执行路径中明确白名单命令，支持 `/docs-goal-new`、`/docs-plan-run`、`/docs-plan-retry`、`/session-new` 的 inline 自然语言参数。
- [ ] 2.2 保持 `/docs-exec-confirm`、`/docs-exec-cancel`、`/docs-status-show`、`/docs-review-latest` 为确定性命令，不将其后文本默默解释为新的 AI 规划输入。
- [ ] 2.3 更新帮助文案与命令描述，明确哪些命令支持自然语言尾随描述，哪些命令不支持。

## 3. 流式执行反馈与草稿预览

- [ ] 3.1 在 `apps/oc-pi-cli/src/planning/goal-to-docs/*` 与 workbench 状态同步路径中补充阶段级执行事件，使工作台可持续显示 thinking / writing / reviewing 的高层状态。
- [ ] 3.2 在 `apps/oc-pi-cli/src/workbench/types.ts`、`state.ts` 与 `presenters/present-workbench-state.ts` 中增加 `live draft 实时草稿` 所需字段，并区分主聊天时间线与限高草稿预览区域。
- [ ] 3.3 在 `apps/oc-pi-cli/src/workbench/views/index.ts` 中实现固定高度且独立滚动的 `live draft 实时草稿` 区，避免长文本推高整个历史视图。

## 4. 文档与回归验证

- [ ] 4.1 更新 `apps/web-docs/content/docs/planning/interactive-workbench.md`，同步 slash command 补全、参数补全、inline 描述语义与流式草稿预览规则。
- [ ] 4.2 扩展 `apps/oc-pi-cli/tests/regression/check-workbench-session-smoke.ts` 或等价测试脚本，覆盖 session 参数补全相关的运行时数据准备与回归验证边界。
- [ ] 4.3 执行 `bun run types:check`（`apps/oc-pi-cli`）与 `bun run workbench:smoke:sessions`，确认交互优化后的类型检查和 session 回归验证通过。
- [ ] 4.4 执行一次 `bun run src/index.ts workbench` 的手动 smoke test，验证 `/` 命令补全、`Tab` 完成、`/session-resume` 参数候选、阶段级流式状态与限高草稿区的实际表现。
