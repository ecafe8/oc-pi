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

## Commands First Commands 优先命令

Commands First Commands 优先命令用于限定第一版需要支持的最小命令集合。虽然主入口是对话，但仍需要最少量显式命令或快捷动作来支撑工作流切换。

- `goal new` 用于输入或更新当前目标
- `confirm execute 确认执行` 用于接受当前 AI 方案并开始执行
- `cancel run 取消当前执行` 用于在运行中停止当前动作
- `status show` 用于查看当前会话状态摘要
- `review latest` 用于查看最近一次审查结论
- `help` 用于查看工作台帮助

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

- 注册 `goal new`、`role use`、`slot show`、`review latest`、`status show`、`help`
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
