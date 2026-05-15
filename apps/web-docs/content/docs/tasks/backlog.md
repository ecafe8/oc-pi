---
title: Backlog 待办池
description: apps/oc-pi-cli 当前产品规划阶段的待办任务池
---

# Backlog 待办池

Backlog 待办池用于记录当前产品规划阶段尚未开工的高优先任务。

## High Priority 高优先级

- 定义 `project bootstrap 项目初始化` 的最小输出结构与默认模板集合
- 定义 `agent-role-config 角色化代理配置` 的最小配置协议
- 定义 `review-loop 审查循环` 的输入输出边界
- 定义 `artifact-routing 产物路由` 的规则草案
- 固定 `apps/oc-pi-cli/src` 的模块结构草案
- 把 `Runtime TypeScript Protocol 运行时 TypeScript 协议草案` 下沉到 `apps/oc-pi-cli/src` 真实类型文件
- 基于运行时类型草案建立 `planning/review/routing/workbench` 的最小代码骨架
- 把 `interactive-workbench 交互工作台` 收敛为“左聊天、右信息、顶部状态、底部输入”的最小 TUI 闭环，并按小任务逐步下沉到 `apps/oc-pi-cli/src/workbench`

## Medium Priority 中优先级

- 定义文档生成与代码生成之间的边界
- 定义当前产品文档与未来用户项目文档的映射关系
- 定义 foundation 基础层 与 product 产品层 的 feature 分层
- 定义外部应用接入的初步目标边界
