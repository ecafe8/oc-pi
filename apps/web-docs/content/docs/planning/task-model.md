---
title: Task Model 任务模型
description: apps/oc-pi-cli 产品研发任务的类型、粒度与状态模型草案
---

# Task Model 任务模型

Task Model 任务模型用于定义当前产品研发任务如何分类、追踪和演进。

## Task Types 任务类型

- `research 调研任务`
- `definition 定义任务`
- `implementation 实现任务`
- `integration 集成任务`
- `verification 验证任务`
- `documentation 文档任务`

## Task States 任务状态

- `todo 待处理`
- `in-progress 进行中`
- `blocked 阻塞中`
- `done 已完成`

## Granularity Rule 粒度规则

- 一个任务应尽量聚焦单一结果
- 一个任务不应同时覆盖多个一级能力模块
- 一个任务应能在任务看板中被清晰解释
