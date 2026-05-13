---
title: Init Monorepo Project Foundation 初始化项目基础背景
description: feature 功能单元的背景、目标与版本边界
---

# Init Monorepo Project Foundation 初始化项目基础背景

Foundation 基础背景页用于解释这个 feature 功能单元为什么存在，以及当前版本准备覆盖什么范围。

## Problem 问题

新项目初始化缺少稳定的默认骨架，导致 monorepo 结构、应用组合与文档空间经常重复搭建。

## Goal 目标

提供一个统一初始化入口，生成默认项目骨架，并为后续 feature 规划与进度跟踪保留文档控制平面。

## Version Snapshot 版本快照

Version Snapshot 版本快照用于标记当前 `prd-v1` 版本快照的主要真源文档位置。

```yaml
version:
  id: prd-v1 # 版本标识
  stage: definition # 当前阶段
  sourceOfTruth:
    prd: 01-product/prd.md # 产品定义文档
    acceptance: 01-product/acceptance-criteria.md # 验收标准文档
    architecture: 03-technical-definition/architecture.md # 技术定义文档
    tasks: 04-task-planning/task-graph.md # 任务图文档
```
