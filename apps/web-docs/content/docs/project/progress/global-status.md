---
title: Global Status 全局状态
description: 当前全局进度、风险与下一步聚焦点
---

# Global Status 全局状态

Global Status 全局状态用于聚合项目层的当前阶段、主要风险与下一步聚焦点。

## Status Snapshot 状态快照

- Overall status: `planning`
- Current milestone: `M1 Docs Protocol Stabilized`
- Active initiatives:
  - `project-bootstrap`
  - `docs-native-control-plane`
  - `task-and-progress-control-plane`
  - `pi-operational-loops`

## Current Risks 当前风险

- task graph 的最小结构还未完全固定
- feature progress 与 global progress 的聚合规则仍需进一步细化
- CLI 的命令边界尚未落到 `apps/oc-pi-cli/src`

## Next Focus 下一步聚焦

- 固定 `feature.yaml / tasks.yaml / progress.yaml` 的最小协议
- 明确 feature loop 与 global loop 的输入输出边界
- 为优先 feature 建立更完整的样例文档
