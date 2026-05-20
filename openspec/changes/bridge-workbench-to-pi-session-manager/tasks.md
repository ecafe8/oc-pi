## 1. Pi Session Bridge 基础设施

- [x] 1.1 新增 Pi session bridge 适配层，封装 `SessionManager 会话管理器` 的 create/open/list/fork 与 workbench custom entry 读写。
- [x] 1.2 定义 `oc-pi-workbench-state` 自定义条目数据结构，明确 `workbenchState 工作台状态`、`latestRun 最近运行记录`、版本号与保存时间字段。
- [x] 1.3 新增 current-session pointer 当前会话指针模块，用于记录当前激活的 Pi session 文件路径或等价标识。

## 2. Legacy Session Migration 旧会话迁移

- [x] 2.1 在启动路径加入旧 `.oc-pi-cli/session.json` 检测与一次性迁移逻辑。
- [x] 2.2 迁移时创建新的 Pi session，并把旧快照写入最新 workbench custom entry。
- [x] 2.3 迁移完成后保留旧文件备份或明确迁移标记，避免重复导入。

## 3. Workbench Runtime 接入

- [x] 3.1 将 `apps/oc-pi-cli/src/workbench/index.ts` 从 `FileRuntimeSessionStore` 切换到 Pi-backed session store。
- [x] 3.2 在 workbench 启动、命令完成、AI 回复完成与 session 切换后，把稳定快照追加写入 Pi custom entry，而不是每个流式 delta 都落盘。
- [x] 3.3 在 `WorkbenchState 工作台状态`、default config 默认配置与 presenter 展示层中补齐 `sessionId`、`sessionName`、`sessionFile` 等当前会话元信息。

## 4. Session Commands 会话命令

- [x] 4.1 为工作台新增 `/session-new`，创建新的 Pi session 并切换到新的默认 workbench 状态。
- [x] 4.2 为工作台新增 `/session-list`，列出当前项目相关 sessions，并展示 id、name、updatedAt、goal 摘要与 current 标记。
- [x] 4.3 为工作台新增 `/session-resume`，允许恢复指定 session 并替换当前 workbench 视图状态。
- [x] 4.4 为工作台新增 `/session-fork`，基于当前 session 创建派生 session，并切换到 fork 后的新会话。

## 5. Workbench UI 与文档同步

- [x] 5.1 更新 workbench slash command autocomplete 与帮助文案，加入 `/session-*` 命令的功能说明。
- [x] 5.2 在顶部状态或右侧信息区显示当前 session 关键信息，至少包括 session name 或 session id。
- [x] 5.3 更新 `apps/web-docs/content/docs/planning/interactive-workbench.md`，说明 Pi-backed session 真源、多会话命令与文件持久化边界。

## 6. Validation 验证

- [x] 6.1 执行 `bun run types:check`（`apps/oc-pi-cli`），确认 Pi session bridge、命令与 presenter 改动后的类型检查通过。
- [x] 6.2 手动验证 workbench 的 session new/list/resume/fork 主路径，确认切换后视图状态与当前 session pointer 一致。
- [x] 6.3 手动验证旧 `.oc-pi-cli/session.json` 迁移路径，确认历史快照能成功导入到新的 Pi session 真源。
