## 1. 工作台状态模型

- [x] 1.1 根据 `apps/web-docs/content/docs/tasks/dev-tasks/01-workbench-chat-state-model.md`，为 `apps/oc-pi-cli/src/workbench/types.ts` 与 `state.ts` 补齐 `context 上下文`、`plan 执行计划`、`execution 执行过程` 三组字段。
- [x] 1.2 在 `apps/oc-pi-cli/src/shared/types/core.ts` 或等价类型文件中补齐第一版工作台所需状态集合，至少覆盖 `thinking`、`waiting-user`、`reviewing`、`blocked`、`completed`。
- [x] 1.3 让默认状态创建函数可以返回完整的第一版 chat-first TUI 初始状态。

## 2. 展示适配层

- [x] 2.1 根据 `apps/web-docs/content/docs/tasks/dev-tasks/02-workbench-chat-presenters.md`，扩展 `apps/oc-pi-cli/src/workbench/presenters/`，输出顶部状态条所需字段：模型、context 使用量、版本号、模式、总状态。
- [x] 2.2 为左侧聊天区输出稳定消息展示字段，至少包含消息类型、摘要、时间与流式状态位。
- [x] 2.3 为右侧信息区输出 `project info 项目信息`、`plan 执行计划`、`execution 执行过程` 三组摘要字段，避免 views 视图层自行拼接。

## 3. Pi TUI 外壳布局

- [ ] 3.1 根据 `apps/web-docs/content/docs/tasks/dev-tasks/03-workbench-pi-tui-shell-layout.md`，在 `apps/oc-pi-cli/src/workbench/views/` 中实现第一版固定布局：顶部状态、左聊天、右信息、底部输入。
- [ ] 3.2 在 `apps/oc-pi-cli/src/workbench/index.ts` 中建立明确的 TUI shell 启动入口，复用仓库已存在的 `@earendil-works/pi-tui` 依赖。
- [ ] 3.3 确保右侧信息区支持独立滚动，且底部输入区保持固定，不漂移成弹窗输入。

## 4. CLI 入口接线

- [ ] 4.1 根据 `apps/web-docs/content/docs/tasks/dev-tasks/06-workbench-tui-cli-entry.md`，在 `apps/oc-pi-cli/src/index.ts` 中为工作台提供明确 CLI 启动入口。
- [ ] 4.2 保持现有 `goal new`、`status show`、`review latest` 等非交互式命令路径继续可用，不因 TUI 接线被破坏。
- [ ] 4.3 视需要在 `apps/oc-pi-cli/package.json` 中补充清晰的工作台启动脚本，但不得与现有 `dev` / `start` 语义混淆。

## 5. 方案确认执行闭环

- [ ] 5.1 根据 `apps/web-docs/content/docs/tasks/dev-tasks/04-workbench-plan-confirm-run-loop.md`，在现有 `apps/oc-pi-cli/src/workbench/controller/index.ts` 骨架上补齐 `goal 输入 -> AI 方案 -> waiting-user -> 用户确认 -> 执行` 的最小控制流。
- [ ] 5.2 让用户确认前系统不得直接执行 `goal-to-docs`，确认后才进入 `running` 并开始推进四阶段链路。
- [ ] 5.3 左侧聊天区持续展示执行过程消息与最终结果摘要，并覆盖 Stage 4 的 `handoff-summary` / `handoff-next-up` 双输出语义。

## 6. 右侧信息区结果展示

- [ ] 6.1 根据 `apps/web-docs/content/docs/tasks/dev-tasks/05-workbench-right-pane-project-plan-execution.md`，在右侧信息区展示当前项目摘要、计划步骤状态与执行过程摘要。
- [ ] 6.2 执行结束后在右侧信息区展示至少一条结果文件路径，并包含 review / guard 的简短状态摘要。
- [ ] 6.3 让右侧信息区持续显示当前执行边界，例如 `preview`、`sandbox`、`write-docs`。

## 7. 斜杠命令与验证

- [ ] 7.1 按 `apps/web-docs/content/docs/planning/interactive-workbench.md` 中的规则，为工作台输入区建立第一版 `kebab-case` 单段 slash command 规范，至少覆盖 `/goal-new`、`/status-show`、`/review-latest`、`/confirm-execute`、`/cancel-run`。
- [ ] 7.2 执行 `bun run types:check`（`apps/oc-pi-cli`），确认工作台状态模型、presenter、TUI 入口与控制流改动后的类型检查通过。
- [ ] 7.3 执行一次最小工作台启动验证，确认用户可以进入 TUI，并能走通“AI 给方案 -> waiting-user -> 用户确认 -> 执行 -> 结果文件可见”的最小闭环。
