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

### 5. Handoff Summary 交接摘要

- 作用: 在规划闭环收束后确认已接受产物、下一步动作与待确认问题
- 建议落点: `docs/tasks/handoff-summary.md`

### 6. Handoff Next Up 下一步指引

- 作用: 从交接摘要中提炼动态下一步动作，而不是重复整页交接摘要
- 建议落点: `docs/tasks/handoff-next-up.md`

## Phase Flow 阶段流程

Phase Flow 阶段流程用于说明第一版 `goal-to-docs 目标到文档` 不应一次性生成所有内容，而应分阶段推进。

```text
User Goal 用户目标
  -> Goal Draft 产品目标草案
  -> Capability Breakdown 能力拆解
  -> Feature Planning 功能规划
  -> Handoff Summary 交接摘要
  -> Handoff Next Up 下一步指引
```

## Execution Protocol 执行协议

Execution Protocol 执行协议用于把阶段流程从“文档顺序”下沉为“运行时可调度的阶段协议”。

```text
goal-to-docs run 目标到文档执行
  -> ingest goal 接收目标
  -> execute current stage 执行当前阶段
  -> write stage artifact 写入阶段产物
  -> run review loop 进入审查循环
  -> accept or revise 接受或修订
  -> unlock next stage 解锁下一阶段
```

## Stage Contract 阶段契约

Stage Contract 阶段契约用于定义每个阶段至少要有的统一字段，使运行时可以用同一种方式调度不同阶段。

```yaml
stageId: goal-framing # 阶段唯一标识
name: Goal Framing # 阶段显示名称
inputArtifacts: # 输入产物列表
  - user-goal
primaryOutputSlot: product-goal # 主输出逻辑槽位
additionalOutputSlots: [] # 附加输出逻辑槽位，可选
writerRole: goal-planner # 编写角色
reviewerRole: goal-reviewer # 审查角色
reviewRequired: true # 是否必须经过审查
completionRule: accepted # 进入下一阶段前的完成条件
```

说明：`primaryOutputSlot 主输出槽位` 用于保持和 `Role Config 角色配置` 中单一 `outputTarget 输出目标` 的默认主映射一致；只有少数稳定阶段才允许声明 `additionalOutputSlots 附加输出槽位`。

## Stage Status Model 阶段状态模型

Stage Status Model 阶段状态模型用于让 `runtime 运行时编排层` 和 `interactive-workbench 交互工作台` 能共同观察流程推进状态。

```yaml
goalToDocsRun:
  runId: run-001 # 当前执行标识
  currentStageId: goal-framing # 当前阶段标识
  stages:
    - stageId: goal-framing
      status: in-review # 阶段状态
      primaryOutputSlot: product-goal # 阶段主输出槽位
      additionalOutputSlots: [] # 阶段附加输出槽位
      artifactPaths:
        - apps/web-docs/content/docs/product/vision.md # 当前产物路径
      reviewerStatus: changes-requested # 最近审查状态
```

### Status Values 状态值

- `pending 待开始`: 阶段尚未开始执行
- `running 运行中`: 编写阶段正在生成产物
- `in-review 审查中`: 产物已生成并进入审查循环
- `revising 修订中`: 编写角色正在根据审查意见修订
- `accepted 已接受`: 当前阶段已完成，可进入下一阶段
- `blocked 已阻塞`: 缺少前置输入、角色配置或槽位映射

## Stage-by-Stage Output 分阶段输出

### Stage 1: Goal Framing 目标定型

- 输入: 用户目标描述
- 输出:
  - Product Goal Draft 产品目标草案
- 主输出槽位:
  - `product-goal 产品目标槽位`
- 主角色:
  - `goal-planner 目标规划者`
- 审查角色:
  - `goal-reviewer 目标审查者`
- 完成条件:
  - `product-goal 产品目标槽位` 产物被审查为 `accepted 已接受`

### Stage 2: Capability Breakdown 能力拆解

- 输入: 已审过的目标草案
- 输出:
  - Capability Breakdown 能力拆解文档
- 主输出槽位:
  - `capability-map 能力地图槽位`
- 主角色:
  - `goal-planner 目标规划者`
- 审查角色:
  - `goal-reviewer 目标审查者`
- 完成条件:
  - `capability-map 能力地图槽位` 产物被审查为 `accepted 已接受`

### Stage 3: Feature Planning 功能规划

- 输入: 能力拆解结果
- 输出:
  - Feature List 功能清单文档
  - MVP Scope MVP 范围文档
- 主角色:
  - `doc-writer 文档编写者`
- 审查角色:
  - `doc-reviewer 文档审查者`
- 主输出槽位:
  - `feature-plan 功能规划槽位`
- 附加输出槽位:
  - `mvp-scope MVP 范围槽位`
- 完成条件:
  - `feature-plan 功能规划槽位` 与 `mvp-scope MVP 范围槽位` 产物都被审查为 `accepted 已接受`

### Stage 4: Handoff Summary 交接摘要

- 输入: 已收敛的规划结果
- 输出:
  - Handoff Summary 交接摘要
  - Handoff Next Up 下一步指引
- 主角色:
  - `doc-writer 文档编写者`
- 审查角色:
  - `doc-reviewer 文档审查者`
- 主输出槽位:
-  - `handoff-summary 交接摘要槽位`
- 附加输出槽位:
  - `handoff-next-up 下一步指引槽位`
- 完成条件:
  - `handoff-summary 交接摘要槽位` 与 `handoff-next-up 下一步指引槽位` 产物都被审查为 `accepted 已接受`

## Stage Transition Rule 阶段切换规则

Stage Transition Rule 阶段切换规则用于限定阶段之间如何推进，避免运行时跳步。

- Stage 1 未被接受前，不能进入 Stage 2
- Stage 2 未被接受前，不能进入 Stage 3
- Stage 3 未被接受前，不能进入 Stage 4
- 如果某阶段审查结果为 `changes-requested 需要修改`，则阶段状态回到 `revising 修订中`
- 如果缺少角色配置、槽位映射或模板，阶段状态进入 `blocked 已阻塞`

## Runtime Inputs 运行时输入

Runtime Inputs 运行时输入用于定义 `goal-to-docs 目标到文档` 每次执行最少需要什么上下文。

- `user goal 用户目标`
- `roles config 角色配置`
- `slot mapping 槽位映射`
- `stage templates 阶段模板`
- `current stage state 当前阶段状态`
- `review policy 审查规则`

## Runtime Outputs 运行时输出

Runtime Outputs 运行时输出用于定义执行结束后运行时至少应返回哪些结构化结果。

- `stage artifact 阶段产物`
- `resolved slot 已解析槽位`
- `resolved path 已解析路径`
- `review result 审查结果`
- `next stage suggestion 下一阶段建议`
- `progress update 进度更新`

## Workbench Integration 与工作台集成

Workbench Integration 与工作台集成用于说明为什么这个协议需要和 `interactive-workbench 交互工作台` 共用状态概念。

- `Session Header 会话头部` 应显示当前 `stageId 阶段标识`
- `Conversation Timeline 对话时间线` 应展示阶段执行摘要与阶段切换结果
- `Inspector Panel 检查面板` 应显示 `resolved slot 已解析槽位`、`resolved path 已解析路径`、`blocked issues 阻塞问题`
- `Review Feed 审查反馈区` 应显示当前阶段最近一次审查状态
- `Status Bar 状态栏` 应显示当前阶段状态，例如 `running 运行中` 或 `in-review 审查中`

## Routing and Review Binding 路由与审查绑定

Routing and Review Binding 路由与审查绑定用于明确 `goal-to-docs 目标到文档` 如何消费已有协议，而不是再发明一套新规则。

- 阶段产物必须先绑定到 `outputTarget 输出目标` 逻辑槽位
- `artifact-routing 产物路由` 负责把阶段产物写入对应物理落点
- `review-loop 审查循环` 负责把阶段产物送入对应 writer-reviewer 编写者-审查者 配对
- 只有在当前阶段产物达到 `accepted 已接受` 后，运行时才允许解锁下一阶段

## Suggested Run Record 建议执行记录

Suggested Run Record 建议执行记录用于给第一版运行时提供一个轻量但稳定的可持久化结构。

```yaml
run:
  runId: run-001
  currentStageId: capability-breakdown
  stages:
    - stageId: goal-framing
      primaryOutputSlot: product-goal
      additionalOutputSlots: []
      artifactPaths:
        - apps/web-docs/content/docs/product/vision.md
      status: accepted
    - stageId: capability-breakdown
      primaryOutputSlot: capability-map
      additionalOutputSlots: []
      artifactPaths:
        - apps/web-docs/content/docs/capabilities/overview.mdx
      status: in-review
      reviewStatus: changes-requested
      reviewSummary: 需要补充能力边界
```

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
- `handoff-summary 交接摘要槽位`
- `handoff-next-up 下一步指引槽位`

兼容说明：`next-summary 下一步摘要槽位` 仍可保留为历史兼容槽位，但不再是当前 Stage 4 的 source-of-truth 真源输出。

这样做的好处是：

- 当前产品仓库内可映射到当前文档结构
- 未来生成用户项目时也可以映射到另一套目录结构
- 避免角色配置过早绑定死路径

## Relation to Project Bootstrap 与项目初始化的关系

Relation to Project Bootstrap 与项目初始化的关系用于说明为什么应先定义 `goal-to-docs 目标到文档`，再定义初始化模板。

- `project bootstrap 项目初始化` 需要知道要预置哪些文档模板
- 这些模板本质上由 `goal-to-docs 目标到文档` 的最小产物集合决定
- 因此 `goal-to-docs 目标到文档` 是初始化模板设计的上游输入

## Relation to Runtime Modules 与运行时模块的关系

Relation to Runtime Modules 与运行时模块的关系用于说明后续 `apps/oc-pi-cli/src` 里哪些模块需要共同消费这份协议。

- `planning 规划层` 负责定义阶段顺序与阶段输入输出
- `roles 角色层` 负责解析每个阶段的 writer/reviewer 编写者/审查者 绑定
- `routing 路由层` 负责把阶段产物写到对应槽位与路径
- `review 审查层` 负责驱动阶段审查与修订闭环
- `workbench 工作台层` 负责展示当前阶段状态与审查反馈

相关阅读: [Project Bootstrap 项目初始化草案](./project-bootstrap)

## First Version Constraints 第一版约束

First Version Constraints 第一版约束用于控制范围，避免一开始生成过多文档。

- 不一次性生成完整 PRD 套件
- 不在第一轮就拆到详细任务图
- 不在第一轮就直接触发代码生成
- 先保证“目标 -> 规划文档”链路稳定
- 第一版只支持线性阶段推进，不支持并行阶段分叉
- 第一版每个阶段默认只产出到一个主槽位集合；仅稳定收束阶段允许 `primaryOutputSlot 主输出槽位 + additionalOutputSlots 附加输出槽位` 组合输出

## Validation Boundary 验证边界

Validation Boundary 验证边界用于说明当前实现如何在不污染真实 docs 真源的前提下验证 `goal-to-docs 目标到文档` 的稳定性。

- 日常稳定性验证优先使用 `preview 预览模式` 与 `--write-sandbox 沙盒写入模式`
- `preview 预览模式` 只返回结构化结果，不落盘真实 docs
- `--write-sandbox 沙盒写入模式` 只写入 `tests/sandbox/...`，用于观察失败样本与稳定样本
- `--write-docs 真实文档写入模式` 只用于明确需要更新真源时，并受 real-write guard 真实写入守卫保护

## Open Questions 待定问题

Open Questions 待定问题用于标记后续还需继续细化的部分。

- Stage 3 是否需要额外引入 `feature-planner 功能规划者` 角色
- `handoff-next-up 下一步指引槽位` 是否长期继续作为 Stage 4 附加输出，还是未来拆成单独阶段
- 第一版的 Capability Breakdown 能力拆解 是自由文本、半结构化 YAML，还是两者结合
- 文档生成后，是否立即进入 review-loop 审查循环，还是需要人工确认开关

## Related Docs 相关文档

- [MVP Features MVP 功能清单](./mvp-features)
- [Agent Role Config 角色配置协议](./agent-role-config)
- [Runtime TypeScript Protocol 运行时 TypeScript 协议草案](./runtime-typescript-protocol)
- [Template System 模板系统](./template-system)
- [Module Structure 模块结构草案](../architecture/oc-pi-cli-module-structure)
