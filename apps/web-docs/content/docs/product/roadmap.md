---
title: Roadmap 路线图
description: 说明 apps/oc-pi-cli 从能力定义到模板生成的阶段路线图
---

# Roadmap 路线图

Roadmap 路线图用于定义 `apps/oc-pi-cli` 的阶段目标，而不是单条实现任务清单。

## Phase 1 第一阶段

建立 `oc-pi-cli 核心执行引擎` 的产品定义与规划框架。

- 明确能力地图
- 明确系统架构草案
- 明确 feature 与 task 拆解规则
- 明确模板系统的目标边界

## Phase 2 第二阶段

在 `apps/oc-pi-cli/src` 中逐步实现核心执行能力。

- 文档读取与写入
- loop 循环运行时
- AI 对话编排
- MCP 与 Skills 桥接

## Phase 3 第三阶段

建立生成能力的协议与模板引擎。

- 生成文档模板
- 生成用户项目文档空间
- 生成任务与进度骨架

## Phase 4 第四阶段

建立面向用户项目的初始化输出能力。

- 生成用户项目的 monorepo 草案
- 生成用户项目的 `web-docs` 控制平面
- 让 PI loop 服务生成项目而不只是当前产品仓库
