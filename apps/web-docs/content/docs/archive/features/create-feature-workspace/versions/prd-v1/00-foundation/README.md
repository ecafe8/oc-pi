---
title: Create Feature Workspace Foundation 功能工作空间基础背景
description: feature 功能单元的背景、目标与版本边界
---

# Create Feature Workspace Foundation 功能工作空间基础背景

Foundation 基础背景页用于解释为什么需要标准 feature 功能工作空间，以及当前版本准备覆盖什么范围。

## Problem 问题

即使项目初始化完成，如果没有统一的 feature workspace 生成能力，后续 PRD、任务与进度文档仍会碎片化。

## Goal 目标

通过 CLI 生成标准 feature 文档空间，让 PI 能稳定读取、拆分、跟踪和汇总。

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
