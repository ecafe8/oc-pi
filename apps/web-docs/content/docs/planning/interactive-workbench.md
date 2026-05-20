---
title: Interactive Workbench 交互工作台
description: apps/oc-pi-cli 第一版终端工作台的最小视图结构、交互范围与边界约束
---

# Interactive Workbench 交互工作台

Interactive Workbench 交互工作台用于定义 `apps/oc-pi-cli` 第一版面向用户的主交互入口。

## Positioning 定位

Positioning 定位用于说明这个能力解决的不是底层模型调用，而是用户如何进入产品主循环。

- 提供统一的 `TUI Terminal User Interface 终端用户界面` 入口
- 承接对话、命令、状态反馈与审查反馈
- 让 `goal-to-docs 目标到文档`、`review-loop 审查循环`、`artifact-routing 产物路由` 有统一操作面
- 基于 Pi 的 `InteractiveMode 交互模式` 与 `UI Dialogs 界面对话框` 能力构建，但信息架构由 `apps/oc-pi-cli` 自己定义

## MVP Goal 最小目标

MVP Goal 最小目标用于固定第一版必须完成的工作台体验，而不是一次性覆盖所有高级能力。

- 用户可以在单一工作台中以 `AI chat 人工智能对话` 形式发起目标输入、补充约束与修正意见
- AI 必须先给出执行方案，用户确认后才进入实际执行
- 用户必须能持续看到当前 `status 状态`，尤其是 `waiting-user 等待用户确认`、`running 运行中`、`reviewing 审查中`、`blocked 已阻塞`
- 用户可以看到最近一次执行的计划、执行过程与最终文件落点
- 用户可以知道产物将被写入哪个 `output target 输出槽位`，以及当前执行边界是 `preview 预览模式`、`sandbox 沙盒模式` 还是 `real docs 真实文档模式`

## View Structure 视图结构

View Structure 视图结构用于定义第一版工作台至少要有哪几个可见区域。第一版不采用多面板自由布局，而是固定为 `top bar 顶部状态条 + left chat 主聊天区 + right info 信息区`。

### 1. Top Status Bar 顶部状态条

Top Status Bar 顶部状态条用于展示当前工作会话的全局轻量状态，并始终固定在最上方。

- 当前模型，例如 `model 模型`
- 当前 `context size 上下文大小`
- 当前 `context usage percent 上下文占用百分比`
- 当前版本号
- 当前模式，例如 `planning 规划` 或 `implementation 实现`
- 当前总状态，例如 `waiting-user 等待用户确认` 或 `running 运行中`

### 2. Left Chat Pane 左侧主聊天区

Left Chat Pane 左侧主聊天区用于承载用户与 AI 的主循环对话，是第一版最主要的可见区域。

- 上部是 `streaming message feed 流式消息区`，用于展示：
  - 用户消息
  - AI 方案消息
  - AI 执行过程消息
  - 系统状态消息
  - 结果摘要消息
- 下部是 `composer 输入区`，用于：
  - 输入新目标
  - 补充约束
  - 回复 AI 的澄清问题
  - 对执行方案做修正意见
- 左侧主聊天区必须支持滚动与流式刷新，但不要求第一版支持复杂消息分组、会话分支或可视化富卡片系统

### 3. Right Info Pane 右侧信息区

Right Info Pane 右侧信息区用于承载结构化信息展示，宽度保持较窄，但必须支持独立滚动。

- 顶部展示 `project info 项目信息`：
  - 当前工作空间路径
  - 当前 goal 目标摘要
  - 当前阶段
  - 当前角色
  - 当前主要输出目标
- 中部展示 `plan plan 执行计划`：
  - 当前 AI 提出的步骤列表
  - 每一步的 `pending 待执行`、`running 运行中`、`done 已完成`、`blocked 已阻塞` 状态
- 下部展示 `execution process 执行过程`：
  - 当前动作
  - 最近完成动作
  - 当前是否在 `reviewing 审查中`
  - 最近写入或计划写入的文件路径
  - 最近一次 guard / block 摘要

### 4. Composer 输入区

Composer 输入区用于承接用户实际输入，是主聊天区底部固定区域，而不是独立命令栏。

- 支持多行输入
- 支持粘贴大段文本
- 支持自然语言输入为主，显式命令为辅
- 第一版只要求最少命令增强，不要求完整命令面板
- 第一版的显式命令统一采用 `slash command 斜杠命令 + kebab-case` 单段格式，例如 `/docs-goal-new`、`/docs-status-show`，不采用 `/goal new` 这种带空格的层级命令

## ASCII Wireframe 线框草图

ASCII Wireframe 线框草图用于把第一版 `interactive-workbench 交互工作台` 的稳定布局直接固定成可讨论的文本线框，避免后续实现阶段再次发散成多窗格自由布局。

```text
+--------------------------------------------------------------------------------------------------+
| model: gpt-5-mini | ctx: 42k / 128k (33%) | version: 0.0.0 | mode: planning | status: waiting-user |
+--------------------------------------------------------------------+-----------------------------+
| Chat 聊天区                                                        | Info 信息区                 |
|                                                                    |                             |
| U: 我想稳定 goal-to-docs 闭环                                      | Project                     |
| A: 我建议先做最小 TUI，支持人工讨论、确认与修正。                  | - workspace: /.../oc-pi     |
| A: 计划分 3 步：                                                   | - goal: 稳定闭环            |
|    1. 设计左右结构                                                 | - stage: feature-planning   |
|    2. 接入 runner                                                  | - target: feature-plan      |
|    3. 展示 review / handoff                                        |                             |
| S: waiting-user，等待你确认是否执行。                              | Plan                        |
|                                                                    | [done]   define layout      |
|                                                                    | [running] wire tui shell    |
|                                                                    | [pending] run first flow    |
|                                                                    |                             |
|                                                                    | Execution                   |
|                                                                    | - current: waiting confirm  |
|                                                                    | - last: generated plan      |
|                                                                    | - files: none               |
|                                                                    | - review: not started       |
|                                                                    |                             |
|                                                                    | (scrollable)                |
+--------------------------------------------------------------------+-----------------------------+
| > 请按这个方向开始实现最小 TUI 骨架                                                               |
+--------------------------------------------------------------------------------------------------+
```

草图约束：

- 顶部一行始终显示全局状态，不允许第一版把这些信息拆到多个区域。
- 左侧是主聊天区，必须比右侧信息区宽得多。
- 右侧只承载结构化信息摘要，且必须支持独立滚动。
- 底部输入区始终固定，不允许第一版漂移成独立弹窗输入模式。

## MVP Interaction Flow 最小交互流程

MVP Interaction Flow 最小交互流程用于把工作台最小闭环固定成一条清晰路径。主循环必须是“讨论 -> 方案 -> 用户确认 -> 执行 -> 展示结果 -> 再次讨论”，而不是用户一句话后 AI 直接黑盒完成全部流程。

```text
User Goal 用户目标输入
  -> AI Plan 人工智能方案输出
  -> waiting-user 等待用户确认
  -> Runtime Execution 运行时执行
  -> Review / Guard 审查与守卫
  -> Result Files 结果文件与路径展示
  -> User Follow-up 用户继续修正或确认下一步
```

## Runtime Status Set 运行时状态集合

Runtime Status Set 运行时状态集合用于约束第一版必须稳定可见的总状态，不让执行过程退化成黑盒。

- `idle 空闲`
- `thinking 方案生成中`
- `waiting-user 等待用户确认`
- `running 运行中`
- `reviewing 审查中`
- `blocked 已阻塞`
- `completed 已完成`
- `failed 失败`

其中 `waiting-user 等待用户确认` 是第一版必须优先做好的状态，因为 `goal-to-docs 目标到文档` 本质上需要人工讨论、修正与确认，而不是全自动脚本流水线。

## Command Reference 命令参考

Command Reference 命令参考用于限定第一版需要支持的最小命令集合。虽然主入口是对话，但仍需要最少量显式命令或快捷动作来支撑工作流切换。

### File Write Scope 文件写入范围

File Write Scope 文件写入范围用于先说明“哪些写入是用户真正关心的项目产物写入”，避免把内部状态持久化和业务产物写入混为一谈。

- `project artifact files 项目产物文件` 指 `goal-to-docs 目标到文档` 运行后生成或修改的文档文件，这是用户最关心的写入结果。
- `internal session state files 内部会话状态文件` 指工作台为了恢复会话而写入的内部状态文件，这类写入不属于用户目标产物。当前实现已改为以 Pi `SessionManager 会话管理器` 的 session file 会话文件作为主真源，并额外维护一个轻量 `current-session pointer 当前会话指针` 文件。
- 第一版命令里，只有真正进入执行阶段的命令才可能产生 `project artifact files 项目产物文件`。
- 当前实现下，大多数命令只会改变内存态与内部 session 状态，不会写入用户关心的项目文件。
- `project artifact files 项目产物文件` 的真实落点受 `runtime stage 运行阶段` 约束：
  - `development 开发阶段` / `test 测试阶段` 只允许写入 `tests/sandbox/...`
  - `production 生产阶段` 才允许写入 `apps/web-docs/...`
- 具体会写入哪些目标文件，不由 slash command 斜杠命令名字直接决定，而由当前 `goal 目标`、AI 生成的 plan 方案、当前 stage 阶段与 routing 路由结果共同决定。

### Docs Workflow Commands 文档工作流命令

Docs Workflow Commands 文档工作流命令用于驱动 `goal-to-docs 目标到文档` 主流程，负责目标设定、方案生成、执行确认、状态查看与审查查看。

#### `/docs-goal-new`

Function 功能：开始新的 `docs goal 文档目标` 设定流程。

Goal 目标：告诉工作台“接下来我要重新定义当前文档目标”，并显式提示用户随后输入新的自然语言目标正文。

Result 结果：

- 工作台追加一条系统提示消息，提醒用户继续输入目标文本。
- 该命令本身不直接调用 AI，不直接生成计划，也不直接执行写入。
- 当前实现不会进入独立 `goal input mode 目标输入模式`；它只是追加提示消息，后续自然语言仍按现有聊天入口处理。

Impact 影响：

- 对当前会话的影响是进入“重新设定目标”的显式动作阶段。
- 对 `plan 执行计划`、`execution 执行过程` 没有即时副作用。
- 后续自然语言输入会继续走统一聊天入口，并同步更新当前 goal 目标，成为后续 `/docs-plan-run` 的输入基础。

File Output 文件产物：

- 不生成 `project artifact files 项目产物文件`。
- 只会影响当前会话状态与后续计划生成输入。

#### `/docs-plan-run`

Function 功能：基于当前 `goal 目标` 请求 AI 生成执行方案。

Goal 目标：把当前会话里已经确定的目标文本转换成结构化计划，而不是直接开始执行。

Result 结果：

- 若当前没有可用目标，工作台会返回缺少目标的系统提示。
- 若当前已有目标，工作台会请求 AI 生成方案摘要、步骤列表与 `requested artifact mode 请求产物模式`。
- 成功后，工作台进入 `waiting-user 等待用户确认`，等待用户继续确认或取消。

Impact 影响：

- 会刷新右侧 `Plan 执行计划` 区的步骤列表与摘要。
- 会更新当前运行时状态到 `thinking 方案生成中` 或 `waiting-user 等待用户确认`。
- 不会直接写文件，也不会直接开始 `goal-to-docs 目标到文档` 执行。

File Output 文件产物：

- 不生成 `project artifact files 项目产物文件`。
- 只生成内存中的计划草稿与会话状态更新。

#### `/docs-plan-retry`

Function 功能：基于当前目标重新生成 docs 方案。

Goal 目标：在用户对当前 AI 方案不满意、或想让 AI 重新组织步骤时，快速重试规划阶段。

Result 结果：

- 若当前没有可用目标，工作台会返回缺少目标的系统提示。
- 若当前已有目标，工作台会先记录一条“正在重试规划”的系统消息，再重新请求 AI 生成方案。

Impact 影响：

- 会覆盖当前工作台中的计划草稿视图，使右侧计划区展示新的方案结果。
- 不会直接执行，也不会直接写文件。
- 用户仍需通过 `/docs-exec-confirm` 才会进入执行阶段。

File Output 文件产物：

- 不生成 `project artifact files 项目产物文件`。
- 只会重新生成计划草稿，覆盖当前会话中的 docs 方案展示。

#### `/docs-exec-confirm`

Function 功能：确认当前方案并开始执行 `goal-to-docs 目标到文档` 主流程。

Goal 目标：把已经处于 `waiting-user 等待用户确认` 的方案推进到实际运行阶段。

Result 结果：

- 若当前没有待执行目标或计划，工作台会返回无法执行的系统提示。
- 若当前有待执行计划，工作台会根据 `requested artifact mode 请求产物模式` 决定执行 `preview 预览` 还是 `write 写入`。
- 随后工作台进入真实执行流程，并把结果同步到聊天区与右侧信息区。

Impact 影响：

- 会改变运行时状态到 `running 运行中`，后续可能进入 `reviewing 审查中`、`completed 已完成`、`failed 失败` 等状态。
- 可能触发真实 artifact routing 产物路由与文件写入，但是否落地真实文件仍受运行阶段与路径 guard 守卫约束。
- 会更新 `execution process 执行过程`、最近文件路径、审查结果等结构化信息。

File Output 文件产物：

- 这是第一版里唯一会触发 `project artifact files 项目产物文件` 生成或修改的主命令。
- 真实生成的文件集合取决于当前 `goal 目标` 对应的 routing 决策，当前工作台不会把文件名硬编码在命令定义里。
- 在 `development 开发阶段` / `test 测试阶段`，产物只允许写入 `tests/sandbox/...`。
- 在 `production 生产阶段`，产物才允许写入 `apps/web-docs/...`。
- 执行完成后，右侧 `Execution 执行过程` 区会展示最近解析到的文件路径、resolved path 解析后路径、touched files 触达文件列表等结果摘要。

#### `/docs-exec-cancel`

Function 功能：取消当前待执行的 docs 方案。

Goal 目标：在真正执行前撤销当前挂起的执行计划，避免继续推进错误或过时方案。

Result 结果：

- 工作台会清理当前挂起的执行目标与待确认执行状态。
- 工作台会追加一条“已取消待执行方案”的系统消息。

Impact 影响：

- 会把运行时状态恢复到 `idle 空闲`。
- 会清理 pending execution 待执行上下文。
- 不会撤销已经完成的执行结果；它只影响尚未确认完成的待执行方案。

File Output 文件产物：

- 不新增 `project artifact files 项目产物文件`。
- 不回滚已经写入的产物文件。
- 它只取消“尚未继续推进”的待执行上下文。

#### `/docs-status-show`

Function 功能：输出当前 docs 工作流的状态摘要。

Goal 目标：让用户快速知道当前工作流处于什么状态，以及当前执行边界是什么。

Result 结果：

- 工作台会追加一条系统状态消息。
- 当前实现至少会显示 `runtime status 运行时状态` 与 `execution boundary 执行边界`。

Impact 影响：

- 不改变计划、不改变执行、不触发 AI。
- 主要影响是向聊天时间线追加一条可审阅状态摘要，方便用户判断下一步动作。

File Output 文件产物：

- 不生成 `project artifact files 项目产物文件`。
- 只输出状态摘要消息。

#### `/docs-review-latest`

Function 功能：查看最近一次 docs 审查结果。

Goal 目标：让用户快速读取最近一次 `review 审查` 输出，而不需要重新执行主流程。

Result 结果：

- 工作台会追加一条 `review-result 审查结果` 消息。
- 若当前没有可用审查结果，工作台会返回 `No review available yet.` 的占位摘要。

Impact 影响：

- 不改变计划、不改变执行、不触发写入。
- 主要影响是把已有审查结论重新暴露到聊天时间线，便于用户复盘与决策。

File Output 文件产物：

- 不生成新的 `project artifact files 项目产物文件`。
- 只读取并重新展示已有审查结果摘要。

### Workbench UI Commands 工作台界面命令

Workbench UI Commands 工作台界面命令用于控制当前终端工作台的界面行为，而不是驱动 docs 主流程。

- 这一组命令只改变工作台视图行为、焦点、折叠状态或帮助可见性，不应改变 docs 计划、执行结果或文件产物。

### Session Commands 会话命令

Session Commands 会话命令用于管理当前 `interactive-workbench 交互工作台` 所依附的 Pi session 会话，而不是直接驱动 docs 主流程。

#### `/session-new`

Function 功能：创建并切换到一个新的 workbench session 工作台会话。

Goal 目标：把当前工作从既有会话中分离出来，开启新的独立会话上下文。

Result 结果：

- 工作台创建新的 Pi session 会话文件，并把它设为当前激活 session。
- 新 session 会从默认 workbench 状态开始，而不是直接沿用旧 timeline。

Impact 影响：

- 会切换当前会话真源。
- 会重置当前聊天时间线、计划草稿与执行上下文到新的默认会话。

File Output 文件产物：

- 不生成 `project artifact files 项目产物文件`。
- 会生成新的 Pi session 会话文件。
- 会更新轻量 `current-session pointer 当前会话指针` 文件。

#### `/session-list`

Function 功能：列出当前项目可恢复的 sessions 会话。

Goal 目标：让用户知道当前项目已有多少会话、哪个是 current 当前会话、每个会话最近在做什么。

Result 结果：

- 工作台在聊天时间线里输出当前项目相关 session 列表。
- 列表至少包含 `session id 会话标识`、更新时间、当前 goal 摘要，以及是否为 current 当前会话。

Impact 影响：

- 不切换当前会话。
- 不改变 docs 主流程状态。

File Output 文件产物：

- 不生成 `project artifact files 项目产物文件`。
- 不新增 session 文件，只读取已有 session 元信息。

#### `/session-resume`

Function 功能：恢复指定 `session id 会话标识` 或 `session path 会话路径` 对应的 workbench session 工作台会话。

Goal 目标：切换到先前保存的会话上下文，继续之前的讨论、计划与执行状态。

Result 结果：

- 工作台切换到目标 Pi session。
- 工作台从该 session 最近一条 `workbench custom entry 工作台自定义条目` 恢复 `workbenchState 工作台状态` 与 `latestRun 最近运行记录`。

Impact 影响：

- 会替换当前视图中的聊天时间线、计划、执行摘要与 session metadata 会话元数据。
- 会改变当前默认恢复会话。

File Output 文件产物：

- 不生成 `project artifact files 项目产物文件`。
- 不创建新的 session 会话文件。
- 会更新 `current-session pointer 当前会话指针` 文件。

#### `/session-fork`

Function 功能：基于当前会话或指定会话创建一个新的 fork 分支会话。

Goal 目标：在保留当前上下文快照的前提下，派生一个新的独立会话继续探索或执行不同方案。

Result 结果：

- 工作台创建新的 Pi session。
- 新 session 保留源会话最近可恢复的 workbench 快照，并获得新的 `sessionId 会话标识`。
- 创建后自动切换到新的 fork 会话。

Impact 影响：

- 会切换当前会话真源。
- 新旧会话后续将各自独立演进。

File Output 文件产物：

- 不生成新的 `project artifact files 项目产物文件`。
- 会创建新的 Pi session 会话文件。
- 会更新 `current-session pointer 当前会话指针` 文件。

#### `/workbench-help-show`

Function 功能：显示当前工作台支持的命令清单。

Goal 目标：让用户快速发现可用命令，而不需要离开当前工作台查看外部文档。

Result 结果：

- 工作台会追加一条系统帮助消息，列出当前支持的 slash command 斜杠命令。

Impact 影响：

- 不触发 AI，不改变目标、计划或执行状态。
- 只影响聊天时间线中的帮助可见性。

File Output 文件产物：

- 不生成 `project artifact files 项目产物文件`。

#### `/workbench-thinking-toggle`

Function 功能：折叠或展开 `Thinking 思考区`。

Goal 目标：让用户决定是否查看 AI 的流式 thinking 内容，平衡信息量与界面整洁度。

Result 结果：

- 工作台会切换 Thinking 区的折叠状态。
- 工作台会追加一条系统消息，说明当前是 `expanded 已展开` 还是 `collapsed 已折叠`。

Impact 影响：

- 不改变 docs 主流程状态。
- 只影响 Thinking 区的可见内容与可滚动范围。

File Output 文件产物：

- 不生成 `project artifact files 项目产物文件`。

#### `/workbench-pane-chat-focus`

Function 功能：把当前滚动焦点切到聊天区。

Goal 目标：让后续键盘滚动快捷键优先作用于 Chat 聊天区，而不是 Thinking 或 Info。

Result 结果：

- 工作台会把 active scroll pane 当前激活滚动区域切到 Chat。
- 工作台会追加一条系统消息确认当前焦点已切换。

Impact 影响：

- 不改变业务状态。
- 会影响 `ctrl+u`、`ctrl+d` 这类滚动动作接下来作用在哪个区域。

File Output 文件产物：

- 不生成 `project artifact files 项目产物文件`。

#### `/workbench-pane-thinking-focus`

Function 功能：把当前滚动焦点切到 Thinking 区。

Goal 目标：让后续键盘滚动快捷键优先作用于 Thinking 区。

Result 结果：

- 工作台会把 active scroll pane 当前激活滚动区域切到 Thinking。
- 工作台会追加一条系统消息确认当前焦点已切换。

Impact 影响：

- 不改变业务状态。
- 会影响后续键盘滚动控制的目标区域。

File Output 文件产物：

- 不生成 `project artifact files 项目产物文件`。

#### `/workbench-pane-info-focus`

Function 功能：把当前滚动焦点切到右侧 Info 信息区。

Goal 目标：让后续键盘滚动快捷键优先作用于结构化信息区，而不是主聊天区。

Result 结果：

- 工作台会把 active scroll pane 当前激活滚动区域切到 Info。
- 工作台会追加一条系统消息确认当前焦点已切换。

Impact 影响：

- 不改变业务状态。
- 会影响键盘滚动命令接下来控制的容器。

File Output 文件产物：

- 不生成 `project artifact files 项目产物文件`。

## Slash Command Rule 斜杠命令规则

Slash Command Rule 斜杠命令规则用于固定第一版工作台的命令输入语法，避免后续实现阶段同时出现 `/goal new`、`/docs-goal-new`、自然语言伪命令三套不一致交互。

- 所有显式命令必须以 `/` 开头
- 所有显式命令必须使用 `kebab-case 连字符命名`
- 第一版不采用带空格的层级命令，例如不使用 `/goal new`
- 第一版优先支持无参命令与“进入输入模式”的命令，不强制一行内同时携带大段参数
- 第一版允许少量 `session command 会话命令` 携带短参数，例如 `session id 会话标识` 或 session path 会话路径
- 自然语言输入与斜杠命令并存：
  - 自然语言用于讨论目标、补充约束、修正方案
  - 斜杠命令用于触发确定性动作，例如查看状态、确认执行、取消执行

### Goal Input Behavior 目标输入行为

Goal Input Behavior 目标输入行为用于说明当前实现中 `/docs-goal-new` 与自然语言输入的配合方式，避免文档把它误写成独立模式切换。

- 用户输入 `/docs-goal-new` 后，系统只追加一条提示消息，提醒用户继续描述新的目标
- 随后的自然语言正文仍通过统一聊天入口提交，而不是进入单独的输入模式
- 当前实现下，自然语言输入会同步更新当前 `goal 目标`，并写入当前会话状态
- 第一版允许后续再评估是否支持更严格的 goal capture 目标采集模式，但这不是当前真源行为

## Out of Scope 非范围

Out of Scope 非范围用于明确第一版暂时不做什么，避免工作台范围失控。

- 不在第一版中做多窗格自由布局
- 不在第一版中做外部应用接入，例如企业微信
- 不在第一版中做复杂历史回放与会话分支管理
- 不在第一版中做后台长时间任务调度界面
- 不在第一版中做复杂按钮矩阵或多层弹窗系统
- 不在第一版中做可视化 artifact diff 比较器，先以聊天结果摘要与文件路径展示为主

## Dependency Note 依赖说明

Dependency Note 依赖说明用于固定工作台与其他 MVP 功能之间的依赖关系。

- 依赖 `agent-role-config 角色化代理配置` 提供角色切换信息
- 依赖 `output-target-slots 输出槽位协议` 提供逻辑槽位与物理落点映射
- 依赖 `review-loop 审查循环` 提供结构化审查结果
- 依赖 `artifact-routing 产物路由` 提供最终写入动作

## Runtime Mapping 运行时映射

Runtime Mapping 运行时映射用于把工作台视图结构下沉为 `apps/oc-pi-cli/src` 内可实现的模块边界。

```text
apps/oc-pi-cli/src/workbench/
  index.ts
  controller/
  state/
  commands/
  views/
  presenters/
```

### controller 控制层

- 接收用户输入事件
- 协调 `conversation 对话层`、`roles 角色层`、`review 审查层`、`routing 路由层`
- 决定何时刷新工作台状态

### state 状态层

- 保存工作台当前会话状态
- 聚合视图需要的结构化字段
- 为 `Status Bar 状态栏`、`Inspector Panel 检查面板`、`Review Feed 审查反馈区` 提供统一数据源

### commands 命令层

- 注册 `session-new`、`session-list`、`session-resume`、`session-fork`、`docs-goal-new`、`docs-plan-run`、`docs-plan-retry`、`docs-exec-confirm`、`docs-exec-cancel`、`docs-review-latest`、`docs-status-show`、`workbench-help-show`、`workbench-thinking-toggle`、`workbench-pane-chat-focus`、`workbench-pane-thinking-focus`、`workbench-pane-info-focus`
- 负责命令参数解析与命令结果结构化
- 不直接负责最终 UI 渲染

### views 视图层

- 负责 `Top Status Bar 顶部状态条`
- 负责 `Left Chat Pane 左侧主聊天区`
- 负责 `Right Info Pane 右侧信息区`
- 负责 `Composer 输入区`
- 负责流式消息刷新与滚动容器

### presenters 展示适配层

- 把领域结果转换成视图可消费的数据片段
- 避免 `review 审查层`、`routing 路由层` 直接暴露原始结构给 TUI
- 保持工作台展示字段稳定，即使底层执行结果后续扩展

## State Model 状态模型

State Model 状态模型用于定义第一版工作台最小需要维护的结构化状态。

```yaml
workbenchState:
  session:
    workspacePath: /repo # 当前工作空间路径
    sessionId: sess_xxx # 当前会话标识
    sessionName: New Workbench Session # 当前会话名称
    sessionFile: /.../session.jsonl # 当前会话文件路径
    parentSessionId: sess_parent # 父会话标识（若来自 fork）
    mode: planning # 当前模式
    currentStageId: goal-framing # 当前阶段标识
    currentStageStatus: waiting-user # 当前阶段状态
    activeRoleId: goal-planner # 当前激活角色标识
    activeOutputTarget: feature-plan # 当前输出槽位
  timeline:
    items: [] # 对话时间线条目
  context:
    currentTokens: 42000 # 当前上下文大小
    maxTokens: 128000 # 最大上下文容量
    usagePercent: 33 # 当前上下文占用百分比
    modelId: copilot-chat-model # 当前模型标识
    appVersion: 0.0.0 # 当前版本号
  inspector:
    resolvedSlotId: feature-plan # 当前解析后的逻辑槽位
    resolvedPath: apps/web-docs/content/docs/planning/mvp-features.md # 当前物理落点
    lastExecutionStatus: waiting-user # 最近执行状态
    blockingIssues: [] # 当前阻塞问题
  plan:
    steps: [] # 当前 AI 方案步骤列表
  execution:
    currentAction: waiting for confirmation # 当前动作摘要
    latestAction: generated plan # 最近动作摘要
    touchedFiles: [] # 最近涉及文件
  review:
    latestStatus: accepted # 最近审查状态
    latestSummary: 已通过当前审查 # 最近审查摘要
    latestFindings: [] # 最近审查问题列表
  statusBar:
    runtimeStatus: idle # 运行时状态
    updatedAt: 2026-05-13T00:00:00Z # 最近更新时间
```

## State Field Groups 状态字段分组

State Field Groups 状态字段分组用于解释工作台状态对象的职责边界。

### session 会话状态

- `workspacePath 工作空间路径`: 当前操作的工作目录
- `sessionId 会话标识`: 当前 Pi session 的唯一标识
- `sessionName 会话名称`: 当前 Pi session 的可读名称
- `sessionFile 会话文件路径`: 当前 Pi session 对应的物理文件路径
- `parentSessionId 父会话标识`: 当前 session 是否由其他 session fork 而来
- `mode 模式`: 当前工作阶段，例如 `planning 规划` 或 `implementation 实现`
- `currentStageId 当前阶段标识`: 当前主流程执行到哪个阶段
- `currentStageStatus 当前阶段状态`: 当前阶段处于 `running 运行中`、`in-review 审查中`、`revising 修订中` 等哪种状态
- `activeRoleId 当前角色标识`: 当前由谁执行主要任务
- `activeOutputTarget 当前输出槽位`: 当前预计写入的逻辑槽位

### timeline 对话时间线状态

- `items 条目列表`: 按时间顺序保存用户输入、系统摘要、写入结果、审查结果
- 每个条目至少应包含 `type 类型`、`summary 摘要`、`createdAt 创建时间`

### context 上下文状态

- `currentTokens 当前上下文大小`: 当前会话已使用上下文大小
- `maxTokens 最大上下文容量`: 当前模型支持的最大上下文容量
- `usagePercent 上下文占用百分比`: 用于顶部状态条持续显示占用压力
- `modelId 当前模型标识`: 当前工作台使用的模型
- `appVersion 当前版本号`: 当前 CLI 或产品版本

### inspector 检查面板状态

- `resolvedSlotId 已解析槽位`: 当前角色输出最终命中的逻辑槽位
- `resolvedPath 已解析路径`: 当前槽位映射到的物理落点
- `lastExecutionStatus 最近执行状态`: 当前或最近动作是 `idle 空闲`、`running 运行中`、`success 成功`、`failed 失败`
- `blockingIssues 阻塞问题`: 阻止继续执行的缺失条件或配置问题

### plan 执行计划状态

- `steps 步骤列表`: 当前 AI 提出的执行步骤
- 每一步至少应包含 `label 标题`、`status 状态` 与简短说明

### execution 执行过程状态

- `currentAction 当前动作`: 现在正在做什么
- `latestAction 最近动作`: 最近刚完成什么
- `touchedFiles 涉及文件`: 最近写入、计划写入或检查的文件路径

### review 审查状态

- `latestStatus 最近审查状态`: `accepted 已接受` 或 `changes-requested 需要修改`
- `latestSummary 最近审查摘要`: 最近一次审查的短结论
- `latestFindings 最近审查问题`: 最近一次审查发现的问题列表

### statusBar 状态栏状态

- `runtimeStatus 运行时状态`: 工作台当前的轻量总状态
- `updatedAt 更新时间`: 最近一次状态变更时间

## Event Flow 事件流

Event Flow 事件流用于定义第一版工作台状态如何被更新。

```text
User Input 用户输入
  -> workbench/controller 控制层
  -> command or conversation dispatch 命令或对话分发
  -> roles/review/routing/planning 模块返回结构化结果
  -> workbench/presenters 展示适配层整理视图数据
  -> workbench/state 状态层更新
  -> workbench/views 视图层刷新
```

## Implementation Hint 实现提示

Implementation Hint 实现提示用于约束后续 `apps/oc-pi-cli/src` 的实现方向。

- 工作台可以先做单屏主循环，不需要一开始拆成复杂窗口系统
- 视图状态应优先服务结构化执行信息，而不是装饰性界面
- Pi 提供交互底座，但命令语义、面板字段与状态聚合逻辑必须由产品层定义
- 第一版优先保证 `controller 控制层 -> state 状态层 -> views 视图层` 这条链路清晰，再考虑更复杂的交互增强
- 第一版默认采用“左聊天、右信息、顶部状态、底部输入”的稳定布局，而不是追求复杂可配置 TUI 框架

## Related Docs 相关文档

- [Runtime TypeScript Protocol 运行时 TypeScript 协议草案](./runtime-typescript-protocol)
- [Goal-to-Docs 目标到文档草案](./goal-to-docs)
- [Agent Role Config 角色配置协议](./agent-role-config)
