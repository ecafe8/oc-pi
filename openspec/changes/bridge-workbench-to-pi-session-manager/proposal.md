## Why

当前 `interactive-workbench 交互工作台` 已经具备单会话恢复能力，但主真源仍然是 `apps/oc-pi-cli` 自己维护的 `.oc-pi-cli/session.json` 快照文件。由于仓库已经引入 `@earendil-works/pi-coding-agent`，且产品仍处于开发阶段，现在将 workbench 会话模型直接桥接到 Pi 的 `SessionManager 会话管理器`，可以尽早对齐 `session-dir 会话目录`、`sessionId 会话标识`、`resume 恢复`、`fork 分叉` 等长期语义，避免未来在已发布产品上做高成本会话迁移。

## What Changes

- In Scope
- 让 `interactive-workbench 交互工作台` 以 Pi 的 `SessionManager 会话管理器` 作为唯一 session 真源，不再以 `.oc-pi-cli/session.json` 作为主会话存储。
- 将当前 `workbenchState 工作台状态` 与 `latestRun 最近运行记录` 持久化到 Pi session 的 `custom entry 自定义条目` 中，并支持从最近一条自定义条目恢复当前 workbench 快照。
- 为工作台增加 `/session-new`、`/session-list`、`/session-resume`、`/session-fork` 四个显式命令，形成第一版多会话工作流。
- 维护一个轻量 `current session pointer 当前会话指针`，确保 workbench 重启后仍能恢复到上次激活的 Pi session。
- 为旧 `.oc-pi-cli/session.json` 提供一次性迁移路径，把旧快照导入新的 Pi session 主真源。
- 同步更新 workbench 文档与帮助文案，使用户能理解多会话、恢复与分叉语义。
- Out of Scope
- 不在本 change 中接入 Pi interactive mode 的完整消息树 UI、`/tree`、`/clone`、`/name` 等全部原生命令。
- 不在本 change 中把 `WorkbenchState` 改写成完全依赖 Pi message history 的实时重建模型；第一版仍以“最新 custom entry 恢复快照”为主。
- 不在本 change 中实现 session 删除、重命名、模糊搜索、跨 session diff 或复杂 picker UI。

## Capabilities

### New Capabilities
- `workbench-pi-session-bridge`: 为 `interactive-workbench 交互工作台` 引入基于 Pi `SessionManager 会话管理器` 的多会话真源、恢复、分叉与列表能力。

### Modified Capabilities
- `interactive-workbench-chat-first-tui`: 将现有工作台从单文件 session 快照升级为 Pi session 真源，并新增 `/session-*` 命令与当前 session 显示能力。

## Impact

- 受影响代码主要在：
  - `apps/oc-pi-cli/src/runtime/session-store.ts`
  - `apps/oc-pi-cli/src/workbench/index.ts`
  - `apps/oc-pi-cli/src/workbench/types.ts`
  - `apps/oc-pi-cli/src/workbench/presenters/*`
  - `apps/oc-pi-cli/src/workbench/views/*`
  - `apps/oc-pi-cli/src/index.ts`
- 预期新增 Pi session bridge 适配层与 current-session pointer 读写模块。
- 受影响文档至少包括：
  - `apps/web-docs/content/docs/planning/interactive-workbench.md`
- 预期验证命令应聚焦：
  - `bun run types:check`（`apps/oc-pi-cli`）
  - workbench 启动与 session new/list/resume/fork 最小手动验证
  - 旧 `.oc-pi-cli/session.json` 迁移场景验证
