---
title: Runtime TypeScript Protocol 运行时 TypeScript 协议草案
description: 把当前规划协议下沉为 apps/oc-pi-cli 可实现的 TypeScript 类型草案
---

# Runtime TypeScript Protocol 运行时 TypeScript 协议草案

Runtime TypeScript Protocol 运行时 TypeScript 协议草案用于把 `goal-to-docs 目标到文档`、`review-loop 审查循环`、`output-target-slots 输出槽位协议`、`interactive-workbench 交互工作台` 中的核心结构，下沉为可直接映射到 `apps/oc-pi-cli/src` 的类型定义。

## Goal 目标

- 为 `apps/oc-pi-cli/src` 提供第一版共享类型边界
- 减少规划文档进入实现时的二次解释成本
- 让 `planning 规划层`、`roles 角色层`、`routing 路由层`、`review 审查层`、`workbench 工作台层` 共用同一套结构化模型

## Suggested File Split 建议文件拆分

Suggested File Split 建议文件拆分用于说明这些类型后续更适合落到哪些代码位置。

```text
apps/oc-pi-cli/src/
  shared/types/
    core.ts
    artifacts.ts
    review.ts
  planning/goal-to-docs/
    types.ts
  roles/
    types.ts
  routing/
    types.ts
  workbench/
    types.ts
  provider-adapters/
    types.ts
```

## Core Literal Types 核心字面量类型

Core Literal Types 核心字面量类型用于固定跨模块共享的稳定标识。

```ts
export type WorkMode = 'planning' | 'implementation'

export type RoleId =
  | 'goal-planner'
  | 'goal-reviewer'
  | 'doc-writer'
  | 'doc-reviewer'
  | 'code-writer'
  | 'code-reviewer'

export type SlotId =
  | 'product-goal'
  | 'capability-map'
  | 'feature-plan'
  | 'mvp-scope'
  | 'next-summary'
  | 'review-notes'
  | 'implementation-code'
  | 'progress-status'

export type SlotKind = 'docs' | 'code' | 'review' | 'status'

export type StageId =
  | 'goal-framing'
  | 'capability-breakdown'
  | 'feature-planning'
  | 'handoff-summary'

export type StageStatus =
  | 'pending'
  | 'running'
  | 'in-review'
  | 'revising'
  | 'accepted'
  | 'blocked'

export type ReviewStatus = 'accepted' | 'changes-requested'

export type RuntimeStatus = 'idle' | 'running' | 'success' | 'failed'

export type WriteMode = 'overwrite' | 'append' | 'merge'

export type CommandId =
  | 'goal.new'
  | 'role.use'
  | 'slot.show'
  | 'review.latest'
  | 'status.show'
  | 'help.show'
```

## Role and Slot Types 角色与槽位类型

Role and Slot Types 角色与槽位类型用于承载角色配置与槽位映射的基础结构。

```ts
export interface RoleConfig {
  roleId: RoleId
  name: string
  provider: string
  model: string
  responsibility: string
  outputTarget: SlotId
  reviewBy?: RoleId
}

export interface SlotDefinition {
  slotId: SlotId
  name: string
  description: string
  kind: SlotKind
  defaultPath: string
}

export interface ResolvedSlotTarget {
  slotId: SlotId
  kind: SlotKind
  path: string
  writeMode: WriteMode
}
```

## Review Types 审查类型

Review Types 审查类型用于把 `review-loop 审查循环` 的输入输出固定成共享结构。

```ts
export interface ReviewFinding {
  message: string
  severity?: 'low' | 'medium' | 'high'
}

export interface ReviewResult {
  artifactSlotId: SlotId
  reviewerRoleId: RoleId
  status: ReviewStatus
  summary: string
  findings: ReviewFinding[]
}
```

## Goal-to-Docs Types 目标到文档类型

Goal-to-Docs Types 目标到文档类型用于表达阶段契约、阶段记录与整次运行记录。

```ts
export interface GoalToDocsStageContract {
  stageId: StageId
  name: string
  inputArtifacts: string[]
  primaryOutputSlot: SlotId
  additionalOutputSlots?: SlotId[]
  writerRoleId: RoleId
  reviewerRoleId: RoleId
  reviewRequired: boolean
  completionRule: 'accepted'
}

export interface GoalToDocsStageRecord {
  stageId: StageId
  status: StageStatus
  primaryOutputSlot: SlotId
  additionalOutputSlots?: SlotId[]
  artifactPaths: string[]
  reviewerStatus?: ReviewStatus
  reviewSummary?: string
  blockingIssues: string[]
}

export interface GoalToDocsRunRecord {
  runId: string
  currentStageId: StageId
  stages: GoalToDocsStageRecord[]
}
```

## Workbench Types 工作台类型

Workbench Types 工作台类型用于把工作台状态模型固定为可以直接渲染的结构。

```ts
export interface TimelineItem {
  type: 'user-input' | 'system-summary' | 'write-result' | 'review-result'
  summary: string
  createdAt: string
}

export interface WorkbenchSessionState {
  workspacePath: string
  mode: WorkMode
  currentStageId: StageId
  currentStageStatus: StageStatus
  activeRoleId: RoleId
  activeOutputTarget: SlotId
}

export interface WorkbenchInspectorState {
  resolvedSlotId: SlotId
  resolvedPath: string
  lastExecutionStatus: RuntimeStatus
  blockingIssues: string[]
}

export interface WorkbenchReviewState {
  latestStatus?: ReviewStatus
  latestSummary?: string
  latestFindings: ReviewFinding[]
}

export interface WorkbenchStatusBarState {
  runtimeStatus: RuntimeStatus
  updatedAt: string
}

export interface WorkbenchState {
  session: WorkbenchSessionState
  timeline: {
    items: TimelineItem[]
  }
  inspector: WorkbenchInspectorState
  review: WorkbenchReviewState
  statusBar: WorkbenchStatusBarState
}
```

## Provider Adapter Types 提供商适配类型

Provider Adapter Types 提供商适配类型用于把逻辑 `provider 提供商` / `model 模型` 名称与真实 SDK 标识解耦。

```ts
export interface ProviderModelMapping {
  provider: string
  logicalModelId: string
  resolvedModelId: string
}
```

## Protocol Notes 协议说明

Protocol Notes 协议说明用于解释几个容易混淆的设计点。

- `RoleConfig 角色配置` 中的 `outputTarget 输出目标` 是角色默认主槽位
- `GoalToDocsStageContract 目标到文档阶段契约` 中允许 `additionalOutputSlots 附加输出槽位`，用于像 `feature-planning 功能规划` 这类稳定的双产物阶段
- 这不等于开放任意多路广播，仍然保持第一版受控、可预测的阶段输出
- `ResolvedSlotTarget 已解析槽位目标` 是 `routing 路由层` 和 `workbench 工作台层` 共享的桥接结果

## Implementation Hint 实现提示

Implementation Hint 实现提示用于约束后续真实代码落地方式。

- 第一版先把这些类型定义成普通 `interface 接口` 与 `type 类型别名`
- 不要过早引入运行时 schema 校验库，除非实现阶段出现真实需要
- 先让 `planning 规划层`、`review 审查层`、`workbench 工作台层` 共享同一份类型源，再考虑拆包

## Related Docs 相关文档

- [Goal-to-Docs 目标到文档草案](./goal-to-docs)
- [Interactive Workbench 交互工作台草案](./interactive-workbench)
- [Agent Role Config 角色配置协议](./agent-role-config)
- [Output Target Slots 输出槽位协议](./output-target-slots)
- [Module Structure 模块结构草案](../architecture/oc-pi-cli-module-structure)
