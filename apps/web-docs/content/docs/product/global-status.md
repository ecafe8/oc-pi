---
title: Global Status 全局状态
description: 当前产品规划进度、关键风险与近期聚焦点
---

# Global Status 全局状态

Global Status 全局状态用于聚合当前 `apps/oc-pi-cli` 产品规划阶段的总体状态。

## Status Snapshot 状态快照

- Overall status 总体状态: `planning`
- Current milestone 当前里程碑: `M1 Product Planning Stable`
- Main implementation root 主要实现目录: `apps/oc-pi-cli/src`

## Feature Progress 功能进度

Feature Progress 功能进度用于按 `Progress Model 进度模型` 中的 feature 层来汇总当前规划成熟度。

- `project-bootstrap 项目初始化`: `defined 已定义，待转实现协议`
- `goal-to-docs 目标到文档`: `defined 已定义，待细化阶段产物`
- `agent-role-config 角色化代理配置`: `defined 已定义，已有最小配置协议草案`
- `review-loop 审查循环`: `defined 已定义，已有第一版收敛规则`
- `artifact-routing 产物路由`: `defined 已定义，已有第一版路由规则`
- `interactive-workbench 交互工作台`: `defined 已定义，已收敛为左聊天、右信息、等待用户确认的最小 TUI 闭环方向`

## Current Risks 当前风险

- 产品能力地图尚未完全稳定
- 未来“用户项目模板”和“当前产品实现”仍容易被概念混淆
- loop 输入输出契约已经有第一版草案，但还未下沉为实现协议
- 角色化 Agent 配置已经有最小协议草案，但 provider adapter 提供商适配层尚未定义
- 交互工作台方向已收敛，但 `waiting-user 等待用户确认`、计划状态、执行过程状态与 context 上下文指标还未完整映射到运行时状态模型

## Next Focus 下一步聚焦

- 把 `goal-to-docs 目标到文档` 细化成阶段产物与执行步骤
- 把 `interactive-workbench 交互工作台` 的“左聊天、右信息、顶部状态、底部输入”结构映射到 `apps/oc-pi-cli/src` 模块边界
- 把 `review-loop 审查循环` 与 `artifact-routing 产物路由` 下沉成可执行协议
- 明确 provider adapter 提供商适配层如何把逻辑模型名映射为真实模型标识
