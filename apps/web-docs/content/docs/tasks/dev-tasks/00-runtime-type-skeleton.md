---
title: Dev Task Runtime Type Skeleton 开发任务 运行时类型骨架
description: 为 apps/oc-pi-cli 建立第一版共享 TypeScript 类型文件与模块骨架的开发任务定义
---

# Dev Task Runtime Type Skeleton 开发任务 运行时类型骨架

Dev Task Runtime Type Skeleton 开发任务 运行时类型骨架用于把当前规划文档中的协议草案，第一次下沉为 `apps/oc-pi-cli/src` 中真实存在的类型文件与最小模块目录骨架。

## Task Goal 任务目标

- 在 `apps/oc-pi-cli/src` 中建立第一版共享类型定义
- 建立 `planning 规划`、`review 审查`、`routing 路由`、`workbench 工作台`、`provider-adapters 提供商适配` 的最小目录骨架
- 让后续实现不再直接依赖 Markdown 文档中的示例结构

## Scope 范围

### In Scope 纳入范围

- 创建 `shared/types` 下的基础类型文件
- 创建 `planning/goal-to-docs/types.ts`
- 创建 `review/types.ts`
- 创建 `routing/types.ts`
- 创建 `workbench/types.ts`
- 创建 `provider-adapters/types.ts`
- 让这些文件能通过 `types:check`

### Out of Scope 非范围

- 不实现真正的 `goal-to-docs 目标到文档` 执行逻辑
- 不实现真正的 `review-loop 审查循环` 执行逻辑
- 不实现 TUI 渲染
- 不实现 provider SDK 调用
- 不实现产物落盘逻辑

## Planned Deliverables 计划交付物

```text
apps/oc-pi-cli/src/
  shared/types/
    core.ts
    artifacts.ts
    review.ts
  planning/goal-to-docs/
    types.ts
  review/
    types.ts
  routing/
    types.ts
  workbench/
    types.ts
  provider-adapters/
    types.ts
```

## Source of Truth 真源来源

Source of Truth 真源来源用于说明这次开发任务应该以哪些文档为准。

- [Runtime TypeScript Protocol 运行时 TypeScript 协议草案](../planning/runtime-typescript-protocol)
- [Goal-to-Docs 目标到文档草案](../planning/goal-to-docs)
- [Review Loop 审查循环草案](../planning/review-loop)
- [Output Target Slots 输出槽位协议](../planning/output-target-slots)
- [Interactive Workbench 交互工作台草案](../planning/interactive-workbench)

## Implementation Order 实现顺序

1. 先创建 `shared/types/core.ts`
2. 再创建 `shared/types/artifacts.ts` 与 `shared/types/review.ts`
3. 再创建 `planning/goal-to-docs/types.ts`
4. 再创建 `workbench/types.ts`
5. 最后创建 `review/types.ts`、`routing/types.ts`、`provider-adapters/types.ts`
6. 完成后运行 `bun run types:check`

## Acceptance Criteria 验收标准

- 所有计划中的类型文件已经创建
- 类型命名与规划文档中的协议命名保持一致
- `RoleConfig 角色配置`、`SlotDefinition 槽位定义`、`ReviewResult 审查结果`、`GoalToDocsRunRecord 目标到文档执行记录`、`WorkbenchState 工作台状态`、`ProviderModelMapping 提供商模型映射` 至少已真实存在
- `apps/oc-pi-cli` 的 `bun run types:check` 通过
- 未引入超出当前规划文档范围的实现逻辑

## Risks 风险

- 如果过早把类型切得太细，可能与后续真实实现分层产生偏差
- 如果直接 import Pi 内部类型过多，可能过早绑定外部结构
- 如果 `review 结果` 与 `routing 结果` 未来扩展过快，当前类型可能需要再次收敛

## Decision Notes 决策说明

- 第一版优先自己定义产品层类型，不直接把产品协议等同于 Pi 内部结构
- 第一版允许 `goal-to-docs` 某些阶段使用 `primary output slot 主输出槽位 + additional output slots 附加输出槽位`
- 第一版的目标是建立稳定边界，而不是一次完成运行时引擎

## Next Task 候选后续任务

1. 基于类型骨架创建 `goal-to-docs` run state 空实现
2. 基于类型骨架创建 `workbench` state 空实现
3. 建立 `provider-adapters` 的逻辑模型到真实模型映射表
