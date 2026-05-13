---
title: MVP Features MVP 功能清单
description: apps/oc-pi-cli 当前第一批核心功能与其作用边界定义
---

# MVP Features MVP 功能清单

MVP Features MVP 功能清单用于固定当前阶段最值得优先规划和实现的产品能力。

## Feature List 功能列表

- `project-bootstrap 项目初始化`
- `goal-to-docs 目标到文档`
- `agent-role-config 角色化代理配置`
- `review-loop 审查循环`
- `artifact-routing 产物路由`
- `interactive-workbench 交互工作台`

## 1. Project Bootstrap 项目初始化

Project Bootstrap 项目初始化用于快速生成一个可被 `oc-pi-cli` 接管的工作空间，而不只是复制目录。

相关阅读: [Project Bootstrap 项目初始化草案](./project-bootstrap)

### Scope 范围

- 初始化基础工作空间
- 初始化最小文档结构
- 初始化配置文件与默认模板引用
- 为后续 loop 和 agent 配置提供落点

## 2. Goal-to-Docs 目标到文档

Goal-to-Docs 目标到文档用于把用户输入的目标描述转成可持续维护的规划文档。

相关阅读: [Goal-to-Docs 目标到文档草案](./goal-to-docs)

### Scope 范围

- 生成目标草案文档
- 生成能力拆解文档
- 生成 feature 功能拆解文档
- 为后续任务拆解与进度跟踪建立基础产物

## 3. Agent-Role-Config 角色化代理配置

Agent-Role-Config 角色化代理配置用于允许用户为不同角色指定不同模型、提供商与后续可扩展的代理画像。

相关阅读: [Agent Role Config 角色配置协议](./agent-role-config)

### Scope 范围

- 支持 `goal planner 目标规划者`
- 支持 `goal reviewer 目标审查者`
- 支持 `doc writer 文档编写者`
- 支持 `doc reviewer 文档审查者`
- 支持 `code writer 代码编写者`
- 支持 `code reviewer 代码审查者`

### Direction 方向

- 第一版可先支持 `Provider 提供商 + Model 模型`
- 后续演进为 `Agent Profile 代理画像`

## 4. Review Loop 审查循环

Review Loop 审查循环用于形成 `writer-reviewer 编写者-审查者` 的持续收敛机制。

### Scope 范围

- 支持目标审查
- 支持文档审查
- 支持代码审查
- 支持基于审查结果继续修订

## 5. Artifact Routing 产物路由

Artifact Routing 产物路由用于定义不同角色输出的内容应该写到哪里。

### Scope 范围

- 目标产物写入规划文档位置
- 文档产物写入 docs 位置
- 代码产物写入实现位置
- 审查结果写入 review 或状态摘要位置

## 6. Interactive Workbench 交互工作台

Interactive Workbench 交互工作台用于为用户提供一个基于 `TUI 终端用户界面` 的交互入口，类似 OpenCode 或 Claude Code 的终端操作体验。

相关阅读: [Interactive Workbench 交互工作台草案](./interactive-workbench)

### Scope 范围

- 提供对话入口
- 提供命令入口
- 提供角色配置入口
- 提供状态反馈与审查反馈入口
- 基于 Pi 的 `InteractiveMode 交互模式` 与 UI dialogs 对话框能力构建产品工作台

### Direction 方向

- 第一版优先建立最小终端工作台
- 外部应用接入能力先不纳入 MVP 主闭环，但需保留后续扩展空间

## Planning Note 规划说明

Planning Note 规划说明用于强调这五项功能共同构成当前阶段的最小产品闭环。

```text
User Goal 用户目标
  -> Project Bootstrap 项目初始化
  -> Goal-to-Docs 目标到文档
  -> Agent-Role-Config 角色化代理配置
  -> Review Loop 审查循环
  -> Artifact Routing 产物路由
  -> Interactive Workbench 交互工作台
```
