---
title: Output Target Slots 输出槽位协议
description: 定义 outputTarget 输出目标 的逻辑槽位模型、默认槽位集合以及与物理路径映射的关系
---

# Output Target Slots 输出槽位协议

Output Target Slots 输出槽位协议用于定义 `outputTarget 输出目标` 在第一阶段不应直接绑定物理路径，而应先绑定到 `logical slot 逻辑槽位`。

## Goal 目标

当前目标是建立一个能同时服务：

- `agent-role-config 角色化代理配置`
- `goal-to-docs 目标到文档`
- `artifact-routing 产物路由`
- `project-bootstrap 项目初始化`

的统一输出目标模型。

## Core Model 核心模型

Core Model 核心模型用于定义 `outputTarget 输出目标` 的推荐结构。

```text
outputTarget 输出目标
  = logical slot 逻辑槽位
  + optional physical mapping 可选物理映射
```

## Why Logical Slots 为什么先用逻辑槽位

Why Logical Slots 为什么先用逻辑槽位用于说明为什么不应一开始就把角色产物写死到物理路径。

- 当前产品仓库与未来用户项目仓库的文档结构并不相同
- 角色配置应尽量稳定，不应被目录结构变化频繁打断
- 产物路由可以先决定“写到哪个槽位”，再决定“落到哪个路径”
- `project-bootstrap 项目初始化` 可以通过模板初始化槽位映射，而不是直接写死代码

## Slot Model 槽位模型

Slot Model 槽位模型用于说明一个槽位最小需要哪些信息。

```yaml
slotId: product-goal # 槽位唯一标识
name: Product Goal # 槽位显示名称
description: 产品目标文档落点 # 槽位说明
kind: docs # 产物类型，例如 docs/code/review/status
defaultPath: apps/web-docs/content/docs/product/vision.md # 当前仓库默认物理路径
```

## Field Definitions 字段定义

Field Definitions 字段定义用于解释槽位结构中每个字段的意义。

- `slotId 槽位标识`: 逻辑槽位的稳定唯一名称
- `name 槽位名称`: 在界面与配置中展示给用户的名称
- `description 槽位说明`: 该槽位承载什么类型的产物
- `kind 产物类型`: 区分 docs 文档、code 代码、review 审查、status 状态 等类别
- `defaultPath 默认路径`: 在当前产品仓库中的默认映射路径

## Phase 1 Default Slot Set 第一阶段默认槽位集合

Phase 1 Default Slot Set 第一阶段默认槽位集合用于定义当前 MVP 最推荐支持的槽位。

### product-goal 产品目标槽位

- 作用: 承载产品目标草案与目标修订结果
- kind 产物类型: `docs`

### capability-map 能力地图槽位

- 作用: 承载能力拆解结果
- kind 产物类型: `docs`

### feature-plan 功能规划槽位

- 作用: 承载 feature 功能单元清单与功能规划内容
- kind 产物类型: `docs`

### mvp-scope MVP 范围槽位

- 作用: 承载当前阶段纳入范围的功能集合
- kind 产物类型: `docs`

### next-summary 下一步摘要槽位

- 作用: 承载当前阶段的下一步建议与交接摘要
- kind 产物类型: `status`

### review-notes 审查记录槽位

- 作用: 承载 review-loop 审查循环的审查意见
- kind 产物类型: `review`

### implementation-code 实现代码槽位

- 作用: 承载代码生成或代码修改输出
- kind 产物类型: `code`

### progress-status 进度状态槽位

- 作用: 承载产品状态、进度摘要与推进结论
- kind 产物类型: `status`

## Suggested Slot Mapping 建议槽位映射

Suggested Slot Mapping 建议槽位映射用于给出当前产品仓库中的默认物理映射示例。

```yaml
slots:
  - slotId: product-goal
    name: Product Goal
    description: 产品目标文档落点
    kind: docs
    defaultPath: apps/web-docs/content/docs/product/vision.md

  - slotId: capability-map
    name: Capability Map
    description: 能力拆解文档落点
    kind: docs
    defaultPath: apps/web-docs/content/docs/capabilities/overview.mdx

  - slotId: feature-plan
    name: Feature Plan
    description: 功能规划文档落点
    kind: docs
    defaultPath: apps/web-docs/content/docs/planning/mvp-features.md

  - slotId: mvp-scope
    name: MVP Scope
    description: MVP 范围文档落点
    kind: docs
    defaultPath: apps/web-docs/content/docs/planning/mvp-features.md

  - slotId: next-summary
    name: Next Summary
    description: 下一步摘要落点
    kind: status
    defaultPath: apps/web-docs/content/docs/tasks/next-up.md

  - slotId: review-notes
    name: Review Notes
    description: 审查结果落点
    kind: review
    defaultPath: apps/web-docs/content/docs/tasks/review-notes.md

  - slotId: implementation-code
    name: Implementation Code
    description: 实现代码落点
    kind: code
    defaultPath: apps/oc-pi-cli/src

  - slotId: progress-status
    name: Progress Status
    description: 进度状态落点
    kind: status
    defaultPath: apps/web-docs/content/docs/product/global-status.md
```

## Role Binding Example 角色绑定示例

Role Binding Example 角色绑定示例用于说明角色配置如何引用逻辑槽位而不是直接写死路径。

```yaml
roles:
  - roleId: goal-planner
    outputTarget: product-goal

  - roleId: doc-writer
    outputTarget: feature-plan

  - roleId: doc-reviewer
    outputTarget: review-notes

  - roleId: code-writer
    outputTarget: implementation-code

  - roleId: code-reviewer
    outputTarget: review-notes
```

## Routing Strategy 路由策略

Routing Strategy 路由策略用于说明 `artifact-routing 产物路由` 未来如何消费这些槽位。

```text
Role Output 角色输出
  -> resolve slot 解析逻辑槽位
  -> resolve mapping 解析当前环境下的物理映射
  -> write artifact 写入对应产物位置
```

## Relation to Project Bootstrap 与项目初始化的关系

Relation to Project Bootstrap 与项目初始化的关系用于说明初始化功能为什么需要这个协议。

- `project-bootstrap 项目初始化` 不只是创建目录
- 它还需要初始化默认槽位映射
- 后续生成项目时也需要按不同模板替换这些映射

## First Version Constraints 第一版约束

First Version Constraints 第一版约束用于控制第一版复杂度。

- 不支持一个 `outputTarget 输出目标` 同时写多个槽位
- 不支持复杂优先级路由
- 先支持单角色到单槽位的稳定映射
- 路由结果先以单一默认路径映射为主

## Open Questions 待定问题

Open Questions 待定问题用于记录后续还要继续细化的部分。

- `review-notes 审查记录槽位` 是否需要独立 review 文档目录
- `mvp-scope MVP 范围槽位` 是否应与 `feature-plan 功能规划槽位` 分离成不同物理文档
- `next-summary 下一步摘要槽位` 和 `progress-status 进度状态槽位` 是否应该继续合并或拆分
- 将来是否允许一个槽位映射到“目录 + 文件模板”的组合对象

## Related Docs 相关文档

- [Agent Role Config 角色配置协议](./agent-role-config)
- [Goal-to-Docs 目标到文档草案](./goal-to-docs)
- [MVP Features MVP 功能清单](./mvp-features)
- [Runtime TypeScript Protocol 运行时 TypeScript 协议草案](./runtime-typescript-protocol)
