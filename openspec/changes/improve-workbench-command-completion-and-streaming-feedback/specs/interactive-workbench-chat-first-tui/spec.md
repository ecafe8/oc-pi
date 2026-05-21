## MODIFIED Requirements

### Requirement: Workbench SHALL support explicit slash commands using kebab-case single-token syntax
系统 MUST 为第一版工作台提供显式 `slash command 斜杠命令`，统一采用 `/docs-exec-confirm` 这种 `kebab-case 连字符命名` 单段语法，并在用户输入 `/` 与后续字符时提供动态命令补全与 `Tab` 完成能力。

#### Scenario: Kebab-case slash command is accepted
- **WHEN** 用户在输入区输入 `/docs-exec-confirm`、`/docs-exec-cancel`、`/session-resume` 等显式命令
- **THEN** 系统 MUST 将其识别为显式结构化动作

#### Scenario: Space-separated slash command is not the source-of-truth syntax
- **WHEN** 第一版工作台定义命令输入规范
- **THEN** 系统 MUST NOT 把 `/goal new` 作为当前真源语法

#### Scenario: Slash command list filters as user types
- **WHEN** 用户输入 `/` 后继续输入命令前缀，例如 `/d` 或 `/session-r`
- **THEN** 系统 MUST 根据当前前缀动态过滤可选命令列表
- **THEN** 系统 MUST 允许用户通过 `Tab` 完成当前选中的命令项

#### Scenario: Session commands autocomplete recent session arguments
- **WHEN** 用户输入 `/session-resume ` 或 `/session-fork ` 并继续输入参数前缀
- **THEN** 系统 MUST 提供最近 session 会话列表作为参数补全候选
- **THEN** 每个候选 MUST 至少包含 `session name 会话名` 或 `session id 会话标识`，并向用户可见地展示最近更新时间或 goal 摘要中的至少一项辅助信息

#### Scenario: Selected command completion preserves follow-up input
- **WHEN** 用户通过 `Tab` 或确认动作完成某个 slash command
- **THEN** 系统 MUST 将光标移动到命令后的可继续输入位置
- **THEN** 对支持参数的命令，系统 MUST 允许用户继续输入参数或自然语言描述

### Requirement: Workbench SHALL display runtime status, plan progress, and execution results continuously
系统 MUST 在工作台运行期间持续展示总状态、计划步骤状态、执行过程摘要与结果文件路径，并在长时间执行时持续向用户暴露高层阶段状态与当前草稿预览，避免执行过程变成黑盒。

#### Scenario: Top status bar shows global runtime indicators
- **WHEN** 工作台处于任意运行状态
- **THEN** 顶部状态条 MUST 展示至少以下字段：当前模型、当前上下文大小、上下文占用百分比、当前版本号、当前模式、当前总状态

#### Scenario: Right pane shows project, plan, and execution summaries
- **WHEN** 工作台刷新右侧信息区
- **THEN** 系统 MUST 展示 `project info 项目信息`、`plan 执行计划`、`execution 执行过程` 三组结构化摘要

#### Scenario: Execution results include file path visibility
- **WHEN** 工作台完成一次执行或阶段推进
- **THEN** 系统 MUST 在用户可见区域展示至少一条结果文件路径或计划写入文件路径

#### Scenario: Workbench exposes stage-level progress messages during long runs
- **WHEN** `goal-to-docs 目标到文档` 正在推进某个阶段的 thinking、writing 或 reviewing 相位
- **THEN** 系统 MUST 持续向用户可见地暴露当前高层阶段状态消息
- **THEN** 这些状态消息 MUST 让用户能区分当前是在思考、编写还是审查某个阶段产物

#### Scenario: Workbench shows live draft preview in a bounded area
- **WHEN** writer 正在生成某个文档阶段的正文内容
- **THEN** 系统 MUST 在独立于主聊天时间线的限高区域中展示当前增量草稿预览
- **THEN** 该预览区域 MUST 支持独立滚动或截断，而 MUST NOT 无限制推高整个工作台历史视图

## ADDED Requirements

### Requirement: Workbench SHALL use ordinary chat as the primary docs planning surface
系统 MUST 将 docs 规划与修正的主交互入口收敛为普通聊天，而不是要求用户依赖多个阶段性 `/docs-*` 命令完成规划。

#### Scenario: User plans docs through normal chat
- **WHEN** 用户希望描述目标、补充约束或要求 AI 重新规划 docs 方案
- **THEN** 系统 MUST 允许用户直接通过普通聊天完成这些规划动作
- **THEN** 系统 MUST NOT 要求用户必须先记住并执行 `/docs-goal-new`、`/docs-plan-run` 或 `/docs-plan-retry` 才能进入规划过程

#### Scenario: Docs slash commands are limited to deterministic actions in the main flow
- **WHEN** 工作台向用户暴露 docs 主流程命令
- **THEN** 系统 MUST 将 `/docs-exec-confirm` 与 `/docs-exec-cancel` 作为主流程中高可见的确定性动作命令
- **THEN** 系统 SHOULD 将其余 docs 规划类命令降级为兼容或高级用法，而不是推荐主路径
