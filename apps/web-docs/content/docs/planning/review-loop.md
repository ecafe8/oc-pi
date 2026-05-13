---
title: Review Loop 审查循环草案
description: 定义 apps/oc-pi-cli 中 writer-reviewer 编写者-审查者 协作的输入、输出与收敛流程
---

# Review Loop 审查循环草案

Review Loop 审查循环草案用于定义 `apps/oc-pi-cli` 如何让不同角色围绕目标、文档或代码形成持续收敛，而不是单次生成后结束。

## Goal 目标

第一阶段的 `review-loop 审查循环` 目标是建立一个最小可运行的编写者-审查者流程，使系统能够：

- 接收初始产物
- 生成审查意见
- 回写审查结果
- 支持继续修订

## Core Pattern 核心模式

```text
Writer 编写者
  -> produce artifact 生成产物
  -> Reviewer 审查者
  -> produce review notes 生成审查意见
  -> Writer 编写者 revise 修订
```

## Supported Loop Types 支持的循环类型

### Goal Review 目标审查

- writer 编写者: `goal-planner 目标规划者`
- reviewer 审查者: `goal-reviewer 目标审查者`
- artifact 产物: `product-goal 产品目标槽位`、`capability-map 能力地图槽位`

### Document Review 文档审查

- writer 编写者: `doc-writer 文档编写者`
- reviewer 审查者: `doc-reviewer 文档审查者`
- artifact 产物: `feature-plan 功能规划槽位`、`mvp-scope MVP 范围槽位`、`next-summary 下一步摘要槽位`

### Code Review 代码审查

- writer 编写者: `code-writer 代码编写者`
- reviewer 审查者: `code-reviewer 代码审查者`
- artifact 产物: `implementation-code 实现代码槽位`

## Inputs 输入

- 当前待审产物
- 该产物的角色配置
- 对应 review 规则或质量标准
- 上下文摘要

## Outputs 输出

- 审查意见
- 是否通过当前轮审查
- 建议修订方向
- 写入 `review-notes 审查记录槽位` 的结构化结果

## Suggested Review Output 建议审查输出

```yaml
review:
  artifact: feature-plan
  reviewerRole: doc-reviewer
  status: changes-requested
  summary: 需要补充 feature 边界说明
  findings:
    - 缺少 MVP 范围约束
    - 术语定义不够一致
```

## Completion Rule 完成规则

- 一轮审查完成不代表流程结束
- 只有在当前产物被标记为 `accepted 已接受` 或进入下一阶段时，当前循环才结束

## Relation to Other Features 与其他功能的关系

- 依赖 `agent-role-config 角色化代理配置` 决定 writer/reviewer 配对
- 依赖 `output-target-slots 输出槽位协议` 决定审查结果回写位置
- 支撑 `goal-to-docs 目标到文档` 与后续代码生成流程

## Open Questions 待定问题

- 第一版是否需要“最多审查轮次”限制
- 是否要支持人工确认后再进入下一轮
- 审查意见是否需要分 severity 严重级别

## Related Docs 相关文档

- [Agent Role Config 角色配置协议](./agent-role-config)
- [Output Target Slots 输出槽位协议](./output-target-slots)
- [Goal-to-Docs 目标到文档草案](./goal-to-docs)
- [Runtime TypeScript Protocol 运行时 TypeScript 协议草案](./runtime-typescript-protocol)
