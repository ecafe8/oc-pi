---
title: Global Goal
description: 全局目标、成功指标与系统边界定义
---

# Global Goal

## Goal

构建一个本地基于 harness 的 docs-native 自动化开发框架，使团队可以在 monorepo 中完成从 PRD 编写、feature 分解、任务规划、进度跟进到 review/release 的闭环。

## Why

- 让需求、设计、技术定义、任务与进度聚合在同一个工作空间内
- 利用 PI 的循环能力持续巡检、推进、总结，而不是一次性生成结果
- 默认以 monorepo 方式初始化项目，降低新项目起步成本

## Success Metrics

- 可以快速初始化包含 `server-api`、`web-app`、`web-docs` 的 monorepo 项目
- 可以基于文档空间创建独立 feature workspace
- 可以从 feature 文档稳定派生 requirement 与 task graph
- 可以持续聚合 feature progress 为全局进度摘要
- 可以由 `apps/oc-pi-cli/src` 中的 CLI 驱动全局 loop 与 feature loop

## Non-Goals

- 当前阶段不直接定义业务应用代码实现
- 当前阶段不绑定外部 issue 平台或远端协作系统
- 当前阶段不把所有自由文本强制转成结构化数据

## Implementation Locus

- 控制平面文档：`apps/web-docs/content/docs`
- 未来 CLI 实现：`apps/oc-pi-cli/src`
