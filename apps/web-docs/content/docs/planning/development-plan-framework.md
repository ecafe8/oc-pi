---
title: Development Plan Framework 开发计划框架
description: apps/oc-pi-cli 从运行时骨架到 MVP 闭环的高层开发阶段、依赖关系与决策门框架
---

# Development Plan Framework 开发计划框架

Development Plan Framework 开发计划框架用于给 `apps/oc-pi-cli` 的实现工作提供一个高层推进框架，避免后续直接陷入局部任务实现而丢失阶段目标、依赖顺序和验收出口。

## Why This Doc Exists 为什么需要这份文档

Why This Doc Exists 为什么需要这份文档用于回答一个问题：在协议、模块、任务都已经逐步清晰后，为什么还需要一个更大的开发计划框架。

- 当前规划文档已经足够支持开始写代码
- 但不同任务之间的先后顺序、依赖关系和阶段出口还没有被统一描述
- 如果没有高层框架，开发会很容易陷入“先写哪一个都可以”的局部最优
- 这份文档的目标不是替代具体任务，而是给所有开发任务提供总方向

## Planning Horizon 规划视角

Planning Horizon 规划视角用于限定这份框架主要覆盖哪个阶段。

- 主覆盖范围: `M2 Runtime Skeleton Ready 运行时骨架可用`
- 次覆盖范围: 为 `M4 Docs and Task Loop MVP 文档与任务循环 MVP` 预留清晰入口
- 当前不覆盖: 未来用户项目生成与外部应用扩展的详细实现

## Strategic Goal 战略目标

Strategic Goal 战略目标用于把阶段实现目标压缩成一句明确的话。

在 `apps/oc-pi-cli/src` 中先建立一个可持续演进的产品级运行时骨架，使 `goal-to-docs 目标到文档`、`review-loop 审查循环`、`artifact-routing 产物路由`、`interactive-workbench 交互工作台` 能围绕同一组共享类型、状态和模块边界逐步闭环。

## Development Principles 开发原则

### 1. Skeleton Before Behavior 先骨架后行为

- 先稳定类型、目录、状态结构和模块边界
- 再逐步实现行为逻辑

### 2. Product Model First 产品模型优先

- 优先实现 `oc-pi-cli` 自己的产品协议
- 不把产品协议直接等同为 Pi 内部对象模型

### 3. One Shared Runtime Vocabulary 单一运行时词汇表

- `RoleId 角色标识`
- `SlotId 槽位标识`
- `StageId 阶段标识`
- `ReviewStatus 审查状态`
- `WorkbenchState 工作台状态`

这些词汇需要先稳定，才能降低跨模块沟通成本。

### 4. MVP Path First MVP 路径优先

- 优先支持文档规划闭环
- 暂缓复杂外部扩展与高级交互特性

## Development Stages 开发阶段

## Stage 1: Runtime Type Skeleton 运行时类型骨架

Stage 1 Runtime Type Skeleton 运行时类型骨架用于把当前规划协议第一次变成真实代码文件。

### Goal 目标

- 创建共享类型文件
- 创建最小模块目录
- 让 `apps/oc-pi-cli` 具备可以继续分层实现的代码地基

### Main Outputs 主要输出

- `shared/types`
- `planning/goal-to-docs/types.ts`
- `review/types.ts`
- `routing/types.ts`
- `workbench/types.ts`
- `provider-adapters/types.ts`

### Exit Criteria 出口标准

- 类型命名与规划文档一致
- `bun run types:check` 通过
- 没有引入超过当前协议范围的运行逻辑

### Reference Task 关联任务

- [Runtime Type Skeleton 运行时类型骨架](../tasks/dev-tasks/00-runtime-type-skeleton)

## Stage 2: Runtime State Skeleton 运行时状态骨架

Stage 2 Runtime State Skeleton 运行时状态骨架用于把类型骨架推进为“可存活的状态对象”，但仍不进入完整业务执行。

### Goal 目标

- 建立 `goal-to-docs run state 目标到文档运行状态`
- 建立 `workbench state 工作台状态`
- 建立最小状态更新接口

### Main Outputs 主要输出

- `planning/goal-to-docs/state.ts`
- `workbench/state.ts`
- 与 `review`、`routing`、`roles` 对接的最小结构化结果对象

### Exit Criteria 出口标准

- 能表示当前阶段、当前角色、当前槽位、当前审查状态
- 能表示 `blocked 已阻塞`、`in-review 审查中`、`accepted 已接受` 等核心状态
- 状态对象不依赖真实 Pi UI 渲染

## Stage 3: Protocol Execution Skeleton 协议执行骨架

Stage 3 Protocol Execution Skeleton 协议执行骨架用于把状态对象推进为最小执行流，但仍保持空实现或半实现。

### Goal 目标

- 建立 `goal-to-docs` 阶段调度骨架
- 建立 `review-loop` 的 writer-reviewer 编写者-审查者 调度骨架
- 建立 `artifact-routing` 的解析骨架

### Main Outputs 主要输出

- `planning/goal-to-docs/run.ts`
- `review/run-review-loop.ts`
- `routing/resolve-slot-target.ts`

### Exit Criteria 出口标准

- 能串起“阶段输入 -> 结构化输出 -> 审查结果 -> 阶段状态更新”的最小链路
- 可以使用 mock 或占位返回值，不要求真实模型调用

## Stage 4: Workbench Integration Skeleton 工作台集成骨架

Stage 4 Workbench Integration Skeleton 工作台集成骨架用于让运行时状态第一次被用户可见入口消费。

### Goal 目标

- 建立工作台控制层
- 建立工作台命令层
- 建立工作台展示适配层

### Main Outputs 主要输出

- `workbench/controller`
- `workbench/commands`
- `workbench/presenters`

### Exit Criteria 出口标准

- `goal new`、`status show`、`review latest` 至少有结构化响应
- 工作台可以消费运行时状态，但不要求完整 TUI 视觉实现

## Stage 5: Pi Adapter Integration PI 适配集成

Stage 5 Pi Adapter Integration PI 适配集成用于把产品层骨架接到 Pi 提供的基础设施上。

### Goal 目标

- 明确 provider adapter 提供商适配层 映射
- 明确哪些能力直接复用 Pi
- 建立产品层与 Pi 层的边界封装

### Main Outputs 主要输出

- `provider-adapters` 的真实映射定义
- 最小 Pi 接入桥接代码
- 产品层与 Pi 基础设施的接口边界

### Exit Criteria 出口标准

- 产品层不直接散落依赖 Pi 内部结构
- 逻辑模型标识可以映射到真实 provider/model ID

## Stage 6: MVP Closed Loop MVP 闭环

Stage 6 MVP Closed Loop MVP 闭环用于达成第一条最小可演示主流程。

### Goal 目标

- 用户输入目标
- 系统生成规划产物
- 系统执行审查
- 系统更新工作台状态与下一步摘要

### Main Outputs 主要输出

- 最小 `goal-to-docs -> review-loop -> routing -> workbench` 闭环
- 一条可演示的 planning 模式主路径

### Exit Criteria 出口标准

- 能完成一次最小 goal-to-docs 闭环
- 能看到结构化阶段状态和审查状态
- 能稳定回写至少一类规划产物

## Dependency Spine 依赖主干

Dependency Spine 依赖主干用于说明这些阶段并不是平铺并行，而是有明显前置关系。

```text
Stage 1 Runtime Type Skeleton 运行时类型骨架
  -> Stage 2 Runtime State Skeleton 运行时状态骨架
  -> Stage 3 Protocol Execution Skeleton 协议执行骨架
  -> Stage 4 Workbench Integration Skeleton 工作台集成骨架
  -> Stage 5 Pi Adapter Integration PI 适配集成
  -> Stage 6 MVP Closed Loop MVP 闭环
```

## Current Recommended Focus 当前建议聚焦

Current Recommended Focus 当前建议聚焦用于给现在这个时间点一个明确落点。

当前最推荐聚焦 `Stage 1 Runtime Type Skeleton 运行时类型骨架`，原因是：

- 文档协议已经足够稳定
- `apps/oc-pi-cli` 包与 Pi 依赖已建立
- 这是进入真实代码实现前成本最低、收益最高的一步
- 它会直接决定后续 `Stage 2` 和 `Stage 3` 的可执行性

## Decision Gates 决策门

Decision Gates 决策门用于定义哪些问题需要在进入下一阶段前先收敛。

### Gate 1 类型收敛门

- `RoleConfig 角色配置`、`GoalToDocsRunRecord 目标到文档执行记录`、`WorkbenchState 工作台状态` 已稳定到可以进入实现

### Gate 2 状态收敛门

- `goal-to-docs` 与 `workbench` 的状态对象已经足够支持最小执行链路

### Gate 3 适配收敛门

- provider adapter 提供商适配层 与 Pi 接口边界已足够清晰，避免实现层大面积返工

## Risks 风险

- 如果过早进入 Pi 深度集成，会把产品协议绑死在外部实现细节上
- 如果没有高层阶段框架，任务会不断局部前进但整体不可演示
- 如果阶段出口不清楚，很容易出现“写了很多代码但没有形成闭环”的问题

## How To Use 如何使用

How To Use 如何使用用于说明这份框架和其他文档的关系。

- 这份文档负责回答“先做哪一段、做到什么程度算完成”
- 具体开发任务应从这里拆出去，例如类型骨架任务、状态骨架任务、执行骨架任务
- `backlog`、`in-progress`、`next-up` 应该引用这里的当前聚焦阶段，而不是各自定义不同路线

## Related Docs 相关文档

- [Roadmap 路线图](../product/roadmap)
- [Milestones 里程碑](../product/milestones)
- [Global Status 全局状态](../product/global-status)
- [Runtime TypeScript Protocol 运行时 TypeScript 协议草案](./runtime-typescript-protocol)
- [Module Structure 模块结构草案](../architecture/oc-pi-cli-module-structure)
- [Runtime Type Skeleton 运行时类型骨架](../tasks/dev-tasks/00-runtime-type-skeleton)
