## ADDED Requirements

### Requirement: Interactive workbench SHALL provide a chat-first TUI shell for goal-to-docs collaboration
系统 MUST 为 `interactive-workbench 交互工作台` 提供第一版 `chat-first 对话优先` TUI 外壳，使用户能够围绕 `goal-to-docs 目标到文档` 主循环进行讨论、确认与执行。

#### Scenario: Workbench uses fixed top-left-right-bottom layout
- **WHEN** 用户启动第一版工作台 TUI
- **THEN** 系统 MUST 渲染固定布局：`top status bar 顶部状态条`、`left chat 左侧主聊天区`、`right info 右侧信息区`、`composer 输入区`
- **THEN** 系统 MUST NOT 在第一版中要求自由多窗格布局才能完成主流程

#### Scenario: Left pane remains the primary interaction surface
- **WHEN** 用户在工作台中进行主流程交互
- **THEN** 左侧主聊天区 MUST 作为用户与 AI 的主交互入口
- **THEN** 系统 MUST 允许自然语言输入与结构化动作并存

### Requirement: Workbench SHALL require explicit user confirmation before execution starts
系统 MUST 在 AI 给出执行方案后进入 `waiting-user 等待用户确认`，并在用户显式确认前不得直接开始执行 `goal-to-docs 目标到文档`。

#### Scenario: Plan-first interaction pauses for user confirmation
- **WHEN** 用户输入新的 goal 目标并请求工作台推进流程
- **THEN** 系统 MUST 先返回执行方案摘要
- **THEN** 系统 MUST 进入 `waiting-user 等待用户确认`
- **THEN** 在用户确认前，系统 MUST NOT 开始实际执行阶段链路

#### Scenario: Confirmation transitions workbench into execution
- **WHEN** 当前工作台状态为 `waiting-user` 且用户执行确认动作
- **THEN** 系统 MUST 开始实际执行当前 `goal-to-docs` 流程
- **THEN** 工作台状态 MUST 进入 `running 运行中` 或后续执行状态

### Requirement: Workbench SHALL display runtime status, plan progress, and execution results continuously
系统 MUST 在工作台运行期间持续展示总状态、计划步骤状态、执行过程摘要与结果文件路径，避免执行过程变成黑盒。

#### Scenario: Top status bar shows global runtime indicators
- **WHEN** 工作台处于任意运行状态
- **THEN** 顶部状态条 MUST 展示至少以下字段：当前模型、当前上下文大小、上下文占用百分比、当前版本号、当前模式、当前总状态

#### Scenario: Right pane shows project, plan, and execution summaries
- **WHEN** 工作台刷新右侧信息区
- **THEN** 系统 MUST 展示 `project info 项目信息`、`plan 执行计划`、`execution 执行过程` 三组结构化摘要

#### Scenario: Execution results include file path visibility
- **WHEN** 工作台完成一次执行或阶段推进
- **THEN** 系统 MUST 在用户可见区域展示至少一条结果文件路径或计划写入文件路径

### Requirement: Workbench SHALL support explicit slash commands using kebab-case single-token syntax
系统 MUST 为第一版工作台提供显式 `slash command 斜杠命令`，并统一采用 `/goal-new` 这种 `kebab-case 连字符命名` 单段语法，而不是空格层级命令。

#### Scenario: Kebab-case slash command is accepted
- **WHEN** 用户在输入区输入 `/goal-new`、`/status-show` 或 `/review-latest`
- **THEN** 系统 MUST 将其识别为显式结构化动作

#### Scenario: Space-separated slash command is not the source-of-truth syntax
- **WHEN** 第一版工作台定义命令输入规范
- **THEN** 系统 MUST NOT 把 `/goal new` 作为当前真源语法

#### Scenario: Goal command enters goal input mode
- **WHEN** 用户输入 `/goal-new`
- **THEN** 系统 MUST 进入 `goal input mode 目标输入模式`
- **THEN** 随后的编辑器正文 MUST 被视为新的 goal 文本，而不是要求同一行内携带大段 inline 参数

### Requirement: Workbench SHALL expose a dedicated CLI entry without breaking existing non-interactive commands
系统 MUST 为第一版工作台提供明确的 CLI 启动入口，同时保持现有非交互式命令路径继续可用。

#### Scenario: User can launch workbench through a clear CLI path
- **WHEN** 用户希望进入第一版工作台 TUI
- **THEN** 系统 MUST 提供明确的 CLI 入口来启动工作台 shell

#### Scenario: Existing command paths remain available
- **WHEN** 工作台入口接入 CLI 后
- **THEN** 现有 `goal new`、`status show`、`review latest` 等非交互式命令路径 MUST 继续可用

### Requirement: Workbench execution view SHALL cover the full four-stage goal-to-docs chain including Stage 4 dual outputs
系统 MUST 在工作台执行与结果展示中覆盖当前四阶段 `goal-to-docs` 闭环，并在 Stage 4 展示 `handoff-summary 交接摘要` 与 `handoff-next-up 下一步指引` 双输出语义。

#### Scenario: Workbench reflects four-stage progress
- **WHEN** 工作台驱动当前 `goal-to-docs` 执行链路
- **THEN** 系统 MUST 允许用户看到 `goal-framing`、`capability-breakdown`、`feature-planning`、`handoff-summary` 四个阶段的推进状态

#### Scenario: Stage 4 output visibility includes summary and next-up
- **WHEN** 工作台展示 Stage 4 结果
- **THEN** 系统 MUST 同时覆盖 `handoff-summary` 主输出与 `handoff-next-up` 附加输出
- **THEN** 系统 MUST NOT 继续把 Stage 4 语义收缩为旧的单一 `next-summary`
