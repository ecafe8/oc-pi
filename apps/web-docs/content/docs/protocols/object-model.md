---
title: Object Model 对象模型
description: 全局层、feature 层与执行层对象模型定义
---

# Object Model 对象模型

Object Model 对象模型用于定义系统里有哪些一等对象，以及它们之间的关系。

## Layers 分层

```text
Global Layer 全局层
  - goal 目标
  - initiative 计划主题
  - milestone 里程碑
  - global-progress 全局进度

Feature Layer 功能层
  - feature 功能单元
  - version 版本快照
  - requirement 需求条目
  - decision 决策记录

Execution Layer 执行层
  - task 任务
  - progress-entry 进度记录
  - review-check 复核检查项
```

## Core Rules 核心规则

- `goal 目标` 管方向与成功标准
- `initiative 计划主题` 管能力主题
- `feature 功能单元` 管独立交付边界
- `task 任务` 管执行动作
- `progress-entry 进度记录` 管运行态事实

## Relationship Sketch 关系草图

Relationship Sketch 关系草图展示 `Goal 目标 -> Initiative 计划主题 -> Feature 功能单元` 的主干关系。

```text
Goal 目标
  -> Initiatives 计划主题集合
    -> Features 功能单元集合
      -> Versions 版本快照集合
        -> Requirements 需求条目集合
        -> Decisions 决策记录集合
        -> Tasks 任务集合
        -> Progress Entries 进度记录集合
        -> Review Checks 复核检查集合
```
