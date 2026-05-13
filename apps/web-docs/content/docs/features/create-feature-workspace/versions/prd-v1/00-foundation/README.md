---
title: Create Feature Workspace Foundation
description: feature 背景、目标与版本边界
---

# Create Feature Workspace Foundation

## Problem

即使项目初始化完成，如果没有统一的 feature workspace 生成能力，后续 PRD、任务与进度文档仍会碎片化。

## Goal

通过 CLI 生成标准 feature 文档空间，让 PI 能稳定读取、拆分、跟踪和汇总。

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
