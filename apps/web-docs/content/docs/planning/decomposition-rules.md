---
title: Decomposition Rules 分解规则
description: 针对 apps/oc-pi-cli 产品规划的目标、能力、feature 与 task 分解规则
---

# Decomposition Rules 分解规则

Decomposition Rules 分解规则用于说明当前如何把 `apps/oc-pi-cli` 的产品目标拆到可执行任务。

## Rule Chain 规则链路

```text
Product Goal 产品目标
  -> Capability 能力模块
    -> Feature 功能单元
      -> Task 任务
```

## Capability Rule 能力规则

Capability 能力模块用于描述一级产品能力，不直接等于可编码任务。

## Feature Rule 功能规则

Feature 功能单元应满足：

- 能被单独讨论
- 能被单独规划
- 能被单独跟踪进度
- 完成后产品能力有明确变化

## Task Rule 任务规则

Task 任务应满足：

- 是动作，不是目标
- 有明确产出
- 有单一责任
- 可以判断完成或阻塞

## Anti-Patterns 反模式

- 不直接从产品愿景拆成代码任务
- 不把能力模块当成单条实现任务
- 不把未来用户项目结构误当当前产品 feature
