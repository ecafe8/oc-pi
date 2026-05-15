---
title: Dev Task Workbench Right Pane Project Plan Execution 开发任务 工作台右侧信息区 项目计划执行摘要
description: 为第一版工作台右侧信息区补齐项目摘要、计划状态与执行结果文件展示
---

# Dev Task Workbench Right Pane Project Plan Execution 开发任务 工作台右侧信息区 项目计划执行摘要

Dev Task Workbench Right Pane Project Plan Execution 开发任务 工作台右侧信息区 项目计划执行摘要用于让右侧信息区真正承担“结构化可见性”职责，而不是把所有信息都塞回聊天流。

## Task Goal 任务目标

- 让右侧信息区展示当前项目摘要
- 让右侧信息区展示当前计划及每步状态
- 让右侧信息区展示执行过程、结果文件与最近一次 review / guard 摘要

## Scope 范围

### In Scope 纳入范围

- 展示 `project info 项目信息`
- 展示 `plan 执行计划`
- 展示 `execution 执行过程`
- 展示最近涉及文件路径与结果状态

### Out of Scope 非范围

- 不实现复杂 diff 预览器
- 不实现完整 artifact 浏览器
- 不实现多层 inspector 弹窗系统

## Planned Deliverables 计划交付物

```text
apps/oc-pi-cli/src/workbench/views/
  [right pane 相关组件]
apps/oc-pi-cli/src/workbench/presenters/
  [project / plan / execution 展示适配]
```

## Source of Truth 真源来源

- [Interactive Workbench 交互工作台](../../planning/interactive-workbench)
- [Docs Structure and Output Spec 文档结构与输出规范](../../planning/docs-structure-and-output-spec)
- [Dev Task Workbench Chat Presenters 开发任务 工作台对话展示适配层](./02-workbench-chat-presenters)

## Implementation Notes 实现说明

- 本任务依赖 [Dev Task Workbench Chat Presenters 开发任务 工作台对话展示适配层](./02-workbench-chat-presenters) 已产出右侧信息区所需的 `project info 项目信息`、`plan 执行计划`、`execution 执行过程` 展示字段
- `project info 项目信息` 至少包含工作空间、goal 摘要、当前阶段、当前角色、当前主要输出目标
- `plan 执行计划` 至少展示步骤列表与状态
- `execution 执行过程` 至少展示当前动作、最近动作、涉及文件、review / guard 简短状态
- 右侧必须支持独立滚动，但第一版不要求分 tab 或切换复杂子面板

## Acceptance Criteria 验收标准

- 右侧信息区可稳定展示项目、计划、执行三组摘要
- 执行结束后可看到至少一条结果文件路径
- review / guard 结果至少能以摘要形式显示在右侧信息区

## Next Task 候选后续任务

1. 增加文件预览或 diff 预览
2. 增加更细粒度的人工修正入口
