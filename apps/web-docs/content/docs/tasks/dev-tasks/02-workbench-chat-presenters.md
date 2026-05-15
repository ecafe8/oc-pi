---
title: Dev Task Workbench Chat Presenters 开发任务 工作台对话展示适配层
description: 为左聊天右信息布局建立稳定的展示适配层，避免 TUI 直接消费底层运行时结构
---

# Dev Task Workbench Chat Presenters 开发任务 工作台对话展示适配层

Dev Task Workbench Chat Presenters 开发任务 工作台对话展示适配层用于把 `WorkbenchState 工作台状态` 转换为 `top bar 顶部状态条`、`left chat 左侧聊天区`、`right info 右侧信息区` 可直接消费的数据模型。

## Task Goal 任务目标

- 为第一版 TUI 建立稳定的 view model 视图模型输出
- 避免 `views 视图层` 直接读取底层运行时结构
- 为后续流式消息展示与右侧信息区渲染建立稳定接口

## Scope 范围

### In Scope 纳入范围

- 更新 `apps/oc-pi-cli/src/workbench/presenters/`
- 为顶部状态条准备展示字段
- 为左侧聊天区准备 timeline 消息展示字段
- 为右侧信息区准备 `project info 项目信息`、`plan 执行计划`、`execution 执行过程` 展示字段

### Out of Scope 非范围

- 不实现真实 TUI 组件
- 不实现终端滚动行为
- 不实现真实流式消息写入

## Planned Deliverables 计划交付物

```text
apps/oc-pi-cli/src/workbench/presenters/
  present-workbench-state.ts
  [必要时补充新的 presenter 文件]
```

## Source of Truth 真源来源

- [Interactive Workbench 交互工作台](../../planning/interactive-workbench)
- [OC PI CLI Module Structure 模块结构草案](../../architecture/oc-pi-cli-module-structure)
- [Dev Task Workbench Chat State Model 开发任务 工作台对话状态模型](./01-workbench-chat-state-model)

## Implementation Notes 实现说明

- 本任务依赖 [Dev Task Workbench Chat State Model 开发任务 工作台对话状态模型](./01-workbench-chat-state-model) 先把 `context 上下文`、`plan 执行计划`、`execution 执行过程` 字段落到 `WorkbenchState 工作台状态`
- 顶部状态条至少输出：模型、context 使用量、版本号、模式、总状态
- 左侧聊天区至少输出：消息类型、摘要、时间、是否流式中
- 右侧信息区至少输出：当前 goal 摘要、当前阶段、当前角色、当前输出目标、计划步骤状态、执行过程摘要
- presenter 输出应优先保持字段稳定，而不是追求一次覆盖所有未来面板需求

## Acceptance Criteria 验收标准

- 给定一个 `WorkbenchState 工作台状态`，可以生成完整第一版 TUI 所需的展示数据
- 在 Task 01 完成的前提下，`views 视图层` 不再需要自己拼接上下文百分比、计划步骤状态与执行过程摘要
- `apps/oc-pi-cli` 的 `bun run types:check` 通过

## Next Task 候选后续任务

1. 基于 presenter 输出搭建最小 `pi-tui` 外壳
2. 将执行中的结构化结果映射为聊天消息流
