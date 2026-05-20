## ADDED Requirements

### Requirement: Workbench SHALL use Pi SessionManager as the single session source of truth
系统 MUST 使用 Pi `SessionManager 会话管理器` 作为 `interactive-workbench 交互工作台` 的唯一 session 真源，而不是继续把 `.oc-pi-cli/session.json` 作为主会话文件。

#### Scenario: Workbench opens or creates a Pi-backed session on startup
- **WHEN** 用户启动 `interactive-workbench 交互工作台`
- **THEN** 系统 MUST 打开当前激活的 Pi session，或在没有当前会话时创建新的 Pi session
- **THEN** 系统 MUST NOT 继续依赖旧单文件 session 快照作为主读取路径

### Requirement: Workbench SHALL persist its runtime snapshot into Pi custom session entries
系统 MUST 将 `workbenchState 工作台状态` 与 `latestRun 最近运行记录` 持久化到 Pi session 的 `custom entry 自定义条目` 中，以便后续恢复。

#### Scenario: Stable workbench state is appended as a custom entry
- **WHEN** 用户完成一次消息提交、命令执行、AI 回复完成或 session 切换前后
- **THEN** 系统 MUST 将最新的 workbench 快照追加保存为 Pi session custom entry
- **THEN** 该 custom entry MUST 不参与 LLM context 上下文构建

#### Scenario: Workbench restores from the latest custom entry
- **WHEN** 用户重新打开一个已有的 Pi session
- **THEN** 系统 MUST 从最近一条 workbench custom entry 恢复 `workbenchState` 与 `latestRun`

### Requirement: Workbench SHALL expose minimal multi-session commands
系统 MUST 为工作台提供最小多会话命令集合，使用户可以创建、列出、恢复与分叉会话。

#### Scenario: Session commands are recognized as explicit actions
- **WHEN** 用户输入 `/session-new`、`/session-list`、`/session-resume` 或 `/session-fork`
- **THEN** 系统 MUST 将其识别为显式 session 动作，而不是普通自然语言消息

#### Scenario: New session creates a clean workbench context
- **WHEN** 用户执行 `/session-new`
- **THEN** 系统 MUST 创建新的 Pi session
- **THEN** 系统 MUST 切换到该新 session
- **THEN** 新 session MUST 以新的默认 workbench 状态启动，而不是直接继承当前 session 的 timeline

#### Scenario: Session list exposes resumable sessions
- **WHEN** 用户执行 `/session-list`
- **THEN** 系统 MUST 向用户展示当前项目可恢复的 sessions 列表
- **THEN** 每个列表项 SHOULD 包含 session id、session name、最近更新时间与 goal 摘要

#### Scenario: Resume switches current workbench context
- **WHEN** 用户恢复指定 session
- **THEN** 系统 MUST 切换当前激活 session
- **THEN** 系统 MUST 用目标 session 的最新 workbench 快照替换当前 workbench 视图状态

#### Scenario: Fork creates a derived session from current context
- **WHEN** 用户执行 `/session-fork`
- **THEN** 系统 MUST 基于当前 session 创建新的派生 session
- **THEN** 新 session MUST 保留当前 session 的最近可恢复 workbench 快照
- **THEN** 新 session MUST 拥有新的 session id

### Requirement: Workbench SHALL maintain a current-session pointer for restart recovery
系统 MUST 维护一个轻量 `current-session pointer 当前会话指针`，确保工作台重启后恢复到最近激活的 Pi session。

#### Scenario: Current session pointer is updated after session switch
- **WHEN** 用户创建、恢复或分叉一个新的当前 session
- **THEN** 系统 MUST 更新 current-session pointer
- **THEN** 下次启动 workbench 时 MUST 优先打开 pointer 指向的 session

### Requirement: Workbench SHALL provide one-time migration from legacy session.json
系统 MUST 为旧 `.oc-pi-cli/session.json` 提供一次性迁移路径，把旧快照导入 Pi session 真源。

#### Scenario: Legacy single-file session is migrated into Pi session
- **WHEN** 旧 `.oc-pi-cli/session.json` 存在，且当前还没有 Pi-backed current session
- **THEN** 系统 MUST 创建一个新的 Pi session
- **THEN** 系统 MUST 将旧快照写入新的 workbench custom entry
- **THEN** 系统 SHOULD 为旧文件保留备份或标记已迁移结果
