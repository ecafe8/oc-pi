---
title: Init Monorepo Project Foundation
description: feature 背景、目标与版本边界
---

# Init Monorepo Project Foundation

## Problem

新项目初始化缺少稳定的默认骨架，导致 monorepo 结构、应用组合与文档空间经常重复搭建。

## Goal

提供一个统一初始化入口，生成默认项目骨架，并为后续 feature 规划与进度跟踪保留文档控制平面。

## Version Snapshot

```yaml
version:
  id: prd-v1
  stage: definition
  sourceOfTruth:
    prd: 01-product/prd.md
    acceptance: 01-product/acceptance-criteria.md
    architecture: 03-technical-definition/architecture.md
    tasks: 04-task-planning/task-graph.md
```
