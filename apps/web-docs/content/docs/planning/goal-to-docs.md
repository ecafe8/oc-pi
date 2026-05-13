---
title: Goal-to-Docs 目标到文档草案
description: 定义 apps/oc-pi-cli 如何把用户目标转成最小规划文档集合、阶段流程与角色协作方式
---

# Goal-to-Docs 目标到文档草案

Goal-to-Docs 目标到文档草案用于定义 `apps/oc-pi-cli` 如何把用户输入的目标描述，逐步沉淀成可持续维护的规划文档，而不是一次性输出一份孤立 PRD。

## Goal 目标

第一阶段的 `goal-to-docs 目标到文档` 目标是建立一个最小可运行的规划文档流水线，使系统能稳定完成：

- 接收用户目标
- 产出最小规划文档集
- 让不同角色协作编写与审查
- 为后续 feature 拆解、任务拆解与进度跟踪建立输入基础

## Minimal Artifact Set 最小产物集合

Minimal Artifact Set 最小产物集合用于定义第一轮必须落下来的文档产物。

### 1. Product Goal Draft 产品目标草案

- 作用: 说明用户到底想实现什么
- 建议落点: `docs/product/vision` 相关位置或项目规划区域

### 2. Capability Breakdown 能力拆解文档

- 作用: 把目标拆成一级能力模块
- 建议落点: `docs/capabilities` 或规划区域

### 3. Feature List 功能清单文档

- 作用: 把能力继续拆成可规划的 feature 功能单元
- 建议落点: `docs/planning` 或 feature 规划区域

### 4. MVP Scope MVP 范围文档

- 作用: 标记哪些 feature 功能单元进入当前阶段范围
- 建议落点: `docs/planning` 或 `docs/product`

### 5. Next-Step Summary 下一步摘要

- 作用: 给出继续推进的建议，而不是让流程停在文档生成
- 建议落点: `docs/tasks` 或状态摘要区域

## Phase Flow 阶段流程

Phase Flow 阶段流程用于说明第一版 `goal-to-docs 目标到文档` 不应一次性生成所有内容，而应分阶段推进。

```text
User Goal 用户目标
  -> Goal Draft 产品目标草案
  -> Capability Breakdown 能力拆解
  -> Feature List 功能清单
  -> MVP Scope MVP 范围
  -> Next-Step Summary 下一步摘要
```

## Stage-by-Stage Output 分阶段输出

### Stage 1: Goal Framing 目标定型

- 输入: 用户目标描述
- 输出:
  - Product Goal Draft 产品目标草案
- 主角色:
  - `goal-planner 目标规划者`
- 审查角色:
  - `goal-reviewer 目标审查者`

### Stage 2: Capability Breakdown 能力拆解

- 输入: 已审过的目标草案
- 输出:
  - Capability Breakdown 能力拆解文档
- 主角色:
  - `goal-planner 目标规划者`
- 审查角色:
  - `goal-reviewer 目标审查者`

### Stage 3: Feature Planning 功能规划

- 输入: 能力拆解结果
- 输出:
  - Feature List 功能清单文档
  - MVP Scope MVP 范围文档
- 主角色:
  - `doc-writer 文档编写者`
- 审查角色:
  - `doc-reviewer 文档审查者`

### Stage 4: Handoff Summary 交接摘要

- 输入: 已收敛的规划结果
- 输出:
  - Next-Step Summary 下一步摘要
- 主角色:
  - `doc-writer 文档编写者`
- 审查角色:
  - `doc-reviewer 文档审查者`

## Role Collaboration 角色协作

Role Collaboration 角色协作用于说明不同角色在 `goal-to-docs 目标到文档` 中如何配合。

```text
goal-planner 目标规划者
  -> 起草目标与能力拆解
  -> 交给 goal-reviewer 目标审查者

goal-reviewer 目标审查者
  -> 审查范围、逻辑与边界
  -> 输出修订意见

doc-writer 文档编写者
  -> 把已收敛内容写成结构化规划文档
  -> 交给 doc-reviewer 文档审查者

doc-reviewer 文档审查者
  -> 审查结构、术语与表达一致性
```

## Suggested Output Slots 建议输出槽位

Suggested Output Slots 建议输出槽位用于回答 `outputTarget 输出目标` 更像什么。

相关阅读: [Output Target Slots 输出槽位协议](./output-target-slots)

第一阶段更推荐把 `outputTarget 输出目标` 理解成 `logical slots 逻辑槽位`，而不是绝对物理路径。

建议槽位：

- `product-goal 产品目标槽位`
- `capability-map 能力地图槽位`
- `feature-plan 功能规划槽位`
- `mvp-scope MVP 范围槽位`
- `next-summary 下一步摘要槽位`

这样做的好处是：

- 当前产品仓库内可映射到当前文档结构
- 未来生成用户项目时也可以映射到另一套目录结构
- 避免角色配置过早绑定死路径

## Relation to Project Bootstrap 与项目初始化的关系

Relation to Project Bootstrap 与项目初始化的关系用于说明为什么应先定义 `goal-to-docs 目标到文档`，再定义初始化模板。

- `project bootstrap 项目初始化` 需要知道要预置哪些文档模板
- 这些模板本质上由 `goal-to-docs 目标到文档` 的最小产物集合决定
- 因此 `goal-to-docs 目标到文档` 是初始化模板设计的上游输入

相关阅读: [Project Bootstrap 项目初始化草案](./project-bootstrap)

## First Version Constraints 第一版约束

First Version Constraints 第一版约束用于控制范围，避免一开始生成过多文档。

- 不一次性生成完整 PRD 套件
- 不在第一轮就拆到详细任务图
- 不在第一轮就直接触发代码生成
- 先保证“目标 -> 规划文档”链路稳定

## Open Questions 待定问题

Open Questions 待定问题用于标记后续还需继续细化的部分。

- Stage 3 是否需要额外引入 `feature-planner 功能规划者` 角色
- `next-summary 下一步摘要槽位` 是否由 doc-writer 文档编写者 负责，还是由专门进度角色负责
- 第一版的 Capability Breakdown 能力拆解 是自由文本、半结构化 YAML，还是两者结合
- 文档生成后，是否立即进入 review-loop 审查循环，还是需要人工确认开关

## Related Docs 相关文档

- [MVP Features MVP 功能清单](./mvp-features)
- [Agent Role Config 角色配置协议](./agent-role-config)
- [Template System 模板系统](./template-system)
- [Module Structure 模块结构草案](../architecture/oc-pi-cli-module-structure)
