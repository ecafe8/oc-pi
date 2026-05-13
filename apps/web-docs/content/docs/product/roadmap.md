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
- 明确第一批 MVP 功能范围

## Phase 2 第二阶段

在 `apps/oc-pi-cli/src` 中逐步实现核心执行能力。

- 工作空间初始化能力
- 目标到文档生成能力
- 角色化 Agent 配置能力
- review loop 审查循环能力
- artifact routing 产物路由能力

## Phase 3 第三阶段

建立生成能力的协议与模板引擎。

- 生成产品规划模板
- 生成运行时输出模板
- 生成未来用户项目模板草案

## Phase 4 第四阶段

建立面向用户项目的初始化输出能力。

- 生成用户项目的 monorepo 草案
- 生成用户项目的 `web-docs` 控制平面
- 让 PI loop 服务生成项目而不只是当前产品仓库
