---
title: Decomposition Rules 分解规则
description: 从全局目标向下拆分 initiative、feature、requirement 与 task 的规则
---

# Decomposition Rules 分解规则

Decomposition Rules 分解规则用于说明这套系统如何从全局目标逐层拆到可执行任务。

## Rule Chain 规则链路

```text
Goal 目标 -> Initiative 计划主题 -> Feature 功能单元 -> Requirement 需求条目 -> Task 任务
```

## Goal Rule 目标规则

Goal Rule 目标规则说明什么样的事项应被视为项目级目标。

一个 `goal` 应描述长期方向，而不是某个实现动作。

## Initiative Rule 计划主题规则

Initiative Rule 计划主题规则说明什么样的事项应被视为能力建设主题。

一个 `initiative` 应描述一类持续建设主题，通常可拆成 `2-5` 个 feature。

## Feature Rule 功能单元规则

Feature Rule 功能单元规则说明什么样的事项应被视为独立交付边界。

一个 `feature` 应同时满足：

- 能被单独命名为独立能力
- 能被单独讨论 PRD
- 能被单独规划任务
- 能被单独跟踪进度
- 完成后系统状态有明确变化

## Task Rule 任务规则

Task Rule 任务规则说明什么样的事项应被视为可执行动作。

一个 `task` 应满足：

- 是动作，不是目标
- 有单一责任
- 有明确产出
- 可以判断 done / blocked / verified
- 最好有依赖关系

## Anti-Patterns 反模式

Anti-Patterns 反模式用于提醒哪些拆分方式会让控制平面失稳。

- 不直接从 `goal` 拆 `task`
- 不按 `frontend/backend/docs` 直接拆 feature
- 不让 milestone 兼任 feature
- 不让 task 只来自灵感而失去 requirement 来源
