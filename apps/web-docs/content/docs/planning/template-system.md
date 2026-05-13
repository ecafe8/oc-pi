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

## Future Direction 未来方向

- 让 `apps/oc-pi-cli` 可读取模板清单并执行渲染
- 让模板系统同时支持文档输出与后续代码输出
