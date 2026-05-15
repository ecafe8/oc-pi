---
title: Dev Task Workbench Chat State Model 开发任务 工作台对话状态模型
description: 为 interactive-workbench 交互工作台第一版补齐对话型 TUI 所需的状态字段与等待用户确认状态
---

# Dev Task Workbench Chat State Model 开发任务 工作台对话状态模型

Dev Task Workbench Chat State Model 开发任务 工作台对话状态模型用于把 `Interactive Workbench 交互工作台` 中新增的 `chat-first 对话优先` 布局需求，第一次下沉为 `apps/oc-pi-cli/src/workbench` 可消费的真实状态字段。

## Task Goal 任务目标

- 为工作台状态补齐 `context 上下文`、`plan 执行计划`、`execution 执行过程` 三组字段
- 明确第一版必须支持的 `waiting-user 等待用户确认` 状态
- 让后续 TUI 视图实现不再依赖临时拼接字段

## Scope 范围

### In Scope 纳入范围

- 更新 `apps/oc-pi-cli/src/workbench/types.ts`
- 更新 `apps/oc-pi-cli/src/workbench/state.ts`
- 视需要更新 `apps/oc-pi-cli/src/shared/types/core.ts`
- 让默认状态创建函数可返回完整第一版 TUI 所需字段

### Out of Scope 非范围

- 不实现真实 TUI 渲染
- 不实现真实模型调用
- 不实现流式消息组件
- 不实现新的执行命令

## Planned Deliverables 计划交付物

```text
apps/oc-pi-cli/src/workbench/
  types.ts
  state.ts
apps/oc-pi-cli/src/shared/types/
  core.ts
```

## Source of Truth 真源来源

- [Interactive Workbench 交互工作台](../../planning/interactive-workbench)
- [Goal-to-Docs 目标到文档草案](../../planning/goal-to-docs)
- [Runtime TypeScript Protocol 运行时 TypeScript 协议草案](../../planning/runtime-typescript-protocol)

## Implementation Notes 实现说明

- 当前 `apps/oc-pi-cli/src/workbench` 里尚未落下 `context 上下文`、`plan 执行计划`、`execution 执行过程` 三组字段；本任务完成前，后续 presenter 与 TUI 任务都不应假设这些字段已经存在
- `context 上下文` 至少包含 `currentTokens 当前上下文大小`、`maxTokens 最大上下文容量`、`usagePercent 上下文占用百分比`、`modelId 当前模型标识`、`appVersion 当前版本号`
- `plan 执行计划` 至少包含步骤列表与每步状态
- `execution 执行过程` 至少包含 `currentAction 当前动作`、`latestAction 最近动作`、`touchedFiles 涉及文件`
- 第一版状态集合至少覆盖 `idle 空闲`、`thinking 方案生成中`、`waiting-user 等待用户确认`、`running 运行中`、`reviewing 审查中`、`blocked 已阻塞`、`completed 已完成`、`failed 失败`

## Acceptance Criteria 验收标准

- 工作台类型文件已包含第一版对话型 TUI 所需字段
- 默认状态创建函数可以创建完整初始状态
- `waiting-user 等待用户确认` 已进入可复用状态枚举
- `apps/oc-pi-cli` 的 `bun run types:check` 通过

## Next Task 候选后续任务

1. 基于状态模型补齐 `presenters 展示适配层`
2. 基于状态模型创建最小 `pi-tui` 布局壳
