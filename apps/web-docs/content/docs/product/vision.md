---
title: Product Vision 产品愿景
description: 说明 apps/oc-pi-cli 要解决什么问题、服务什么场景、形成什么产品能力
---

# Product Vision 产品愿景

Product Vision 产品愿景用于说明 `apps/oc-pi-cli` 为什么存在，以及它最终想成为怎样的 AI harness 平台。

## Vision 愿景

构建一个本地优先的 `AI harness 人工智能编排框架`，让使用者可以围绕目标、任务、代码与文档进行持续协作，而不是只进行一次性对话生成。

## Product Positioning 产品定位

- `apps/oc-pi-cli` 是产品核心执行引擎
- 它负责模板生成、AI 对话编排、loop 循环推进、MCP 调用、Skills 调用、文档生成与代码生成
- `apps/web-docs` 当前用于讨论和规划这些能力，不是未来用户项目模板的实例

## Core Promise 核心承诺

- 能把模糊目标拆成可推进的任务结构
- 能持续巡检上下文并输出下一步建议
- 能读写文档、生成代码、调用 MCP 与 Skills
- 能逐步演进成面向用户项目初始化与自动化开发的产品

## Non-Goals 非目标

- 当前阶段不把未来用户项目模板视为已定稿产物
- 当前阶段不把 `apps/web-docs` 直接当作用户项目控制平面实例
- 当前阶段不优先追求完整业务应用脚手架
