---
title: Template System 模板系统
description: apps/oc-pi-cli 中模板系统的产品目标、模板分层与后续实现方向草案
---

# Template System 模板系统

Template System 模板系统用于定义产品未来要支持哪些模板，以及这些模板服务什么对象。

## Template Layers 模板分层

- Product Planning Template 产品规划模板
- Runtime Output Template 运行时输出模板
- Generated Project Template 生成项目模板

## Current Focus 当前聚焦

- 先定义模板概念与协议边界
- 暂不把未来用户项目模板当作当前实现对象
- 当前模板系统需要同时服务 `project bootstrap 项目初始化` 与 `goal-to-docs 目标到文档`

## Future Direction 未来方向

- 让 `apps/oc-pi-cli` 可读取模板清单并执行渲染
- 让模板系统同时支持文档输出与后续代码输出

## Immediate Relevance 当前直接关联

Immediate Relevance 当前直接关联用于说明模板系统与当前 MVP 功能的关系。

- `project bootstrap 项目初始化` 依赖工作空间与配置模板
- `goal-to-docs 目标到文档` 依赖文档骨架模板
- `artifact-routing 产物路由` 需要明确不同模板输出落点
