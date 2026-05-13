---
title: Object Model
description: 全局层、feature 层与执行层对象模型定义
---

# Object Model

## Layers

```text
Global Layer
  - goal
  - initiative
  - milestone
  - global-progress

Feature Layer
  - feature
  - version
  - requirement
  - decision

Execution Layer
  - task
  - progress-entry
  - review-check
```

## Core Rules

- `goal` 管方向与成功标准
- `initiative` 管能力主题
- `feature` 管独立交付边界
- `task` 管执行动作
- `progress-entry` 管运行态事实

## Relationship Sketch

```text
Goal
  -> Initiatives
    -> Features
      -> Versions
        -> Requirements
        -> Decisions
        -> Tasks
        -> Progress Entries
        -> Review Checks
```
