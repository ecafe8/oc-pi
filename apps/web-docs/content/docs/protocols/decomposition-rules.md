---
title: Decomposition Rules
description: 从全局目标向下拆分 initiative、feature 与 task 的规则
---

# Decomposition Rules

## Rule Chain

```text
Goal -> Initiative -> Feature -> Requirement -> Task
```

## Goal Rule

一个 `goal` 应描述长期方向，而不是某个实现动作。

## Initiative Rule

一个 `initiative` 应描述一类持续建设主题，通常可拆成 `2-5` 个 feature。

## Feature Rule

一个 `feature` 应同时满足：

- 能被单独命名为独立能力
- 能被单独讨论 PRD
- 能被单独规划任务
- 能被单独跟踪进度
- 完成后系统状态有明确变化

## Task Rule

一个 `task` 应满足：

- 是动作，不是目标
- 有单一责任
- 有明确产出
- 可以判断 done / blocked / verified
- 最好有依赖关系

## Anti-Patterns

- 不直接从 `goal` 拆 `task`
- 不按 `frontend/backend/docs` 直接拆 feature
- 不让 milestone 兼任 feature
- 不让 task 只来自灵感而失去 requirement 来源
