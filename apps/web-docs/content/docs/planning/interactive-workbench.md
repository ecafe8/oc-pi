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

- 用户可以在单一工作台中发起目标输入
- 用户可以看到当前角色、当前输出目标与最近一次执行结果
- 用户可以触发最少量的工作台命令
- 用户可以看到最近一次 `review-loop 审查循环` 的结论
- 用户可以知道产物将被写入哪个 `output target 输出槽位`

## View Structure 视图结构

View Structure 视图结构用于定义第一版工作台至少要有哪几个可见区域。

### 1. Session Header 会话头部

Session Header 会话头部用于展示当前工作会话的顶层状态。

- 当前工作空间路径
- 当前模式，例如 `planning 规划` 或 `implementation 实现`
- 当前激活角色，例如 `goal planner 目标规划者`
- 当前主要输出目标，例如 `feature-plan 功能规划`

### 2. Conversation Timeline 对话时间线

Conversation Timeline 对话时间线用于展示用户输入、系统动作摘要与关键输出片段。

- 展示用户输入
- 展示系统执行阶段摘要
- 展示最近一次写入动作或拒绝写入原因
- 展示最近一次 loop 结果摘要

### 3. Command Bar 命令栏

Command Bar 命令栏用于承接显式命令，而不是只依赖自然语言输入。

- 支持进入目标输入
- 支持切换角色配置
- 支持查看当前槽位映射
- 支持查看最近一次审查结果
- 支持触发工作台帮助信息

### 4. Inspector Panel 检查面板

Inspector Panel 检查面板用于显示当前执行上下文中最关键的结构化信息。

- 当前 `agent role 代理角色`
- 当前 `output target 输出槽位`
- 当前物理落点路径
- 最近一次执行状态
- 当前风险或缺失前置条件

### 5. Review Feed 审查反馈区

Review Feed 审查反馈区用于让用户快速看到最近的 `accepted 已接受` 或 `changes-requested 需要修改` 结论。

- 展示审查状态
- 展示关键问题摘要
- 展示建议下一步动作

### 6. Status Bar 状态栏

Status Bar 状态栏用于提供轻量但持续可见的运行反馈。

- 当前命令执行中或空闲
- 当前角色
- 当前槽位
- 最近一次更新时间

## MVP Interaction Flow 最小交互流程

MVP Interaction Flow 最小交互流程用于把工作台最小闭环固定成一条清晰路径。

```text
User Goal 用户目标输入
  -> Session Header 会话头部确认当前模式与角色
  -> Conversation Timeline 对话时间线展示目标输入
  -> Command Bar 命令栏触发生成或查看动作
  -> Inspector Panel 检查面板展示当前槽位与落点
  -> Review Feed 审查反馈区展示最近一次审查结论
  -> Status Bar 状态栏确认写入或待修订状态
```

## Commands First Commands 优先命令

Commands First Commands 优先命令用于限定第一版需要支持的最小命令集合。

- `goal new` 用于输入或更新当前目标
- `role use` 用于切换当前激活角色
- `slot show` 用于查看当前 `output target 输出槽位` 映射
- `review latest` 用于查看最近一次审查结论
- `status show` 用于查看当前会话状态摘要
- `help` 用于查看工作台帮助

## Out of Scope 非范围

Out of Scope 非范围用于明确第一版暂时不做什么，避免工作台范围失控。

- 不在第一版中做多窗格自由布局
- 不在第一版中做外部应用接入，例如企业微信
- 不在第一版中做复杂历史回放与会话分支管理
- 不在第一版中做后台长时间任务调度界面

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

- 负责 `Session Header 会话头部`
- 负责 `Conversation Timeline 对话时间线`
- 负责 `Command Bar 命令栏`
- 负责 `Inspector Panel 检查面板`
- 负责 `Review Feed 审查反馈区`
- 负责 `Status Bar 状态栏`

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
    currentStageStatus: in-review # 当前阶段状态
    activeRoleId: goal-planner # 当前激活角色标识
    activeOutputTarget: feature-plan # 当前输出槽位
  timeline:
    items: [] # 对话时间线条目
  inspector:
    resolvedSlotId: feature-plan # 当前解析后的逻辑槽位
    resolvedPath: apps/web-docs/content/docs/planning/mvp-features.md # 当前物理落点
    lastExecutionStatus: idle # 最近执行状态
    blockingIssues: [] # 当前阻塞问题
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

### inspector 检查面板状态

- `resolvedSlotId 已解析槽位`: 当前角色输出最终命中的逻辑槽位
- `resolvedPath 已解析路径`: 当前槽位映射到的物理落点
- `lastExecutionStatus 最近执行状态`: 当前或最近动作是 `idle 空闲`、`running 运行中`、`success 成功`、`failed 失败`
- `blockingIssues 阻塞问题`: 阻止继续执行的缺失条件或配置问题

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
