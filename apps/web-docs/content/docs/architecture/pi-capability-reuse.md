---
title: Pi Capability Reuse PI 能力复用对照
description: 基于 pi.dev 文档梳理哪些能力可以直接复用，哪些能力需要由 oc-pi-cli 自建
---

# Pi Capability Reuse PI 能力复用对照

Pi Capability Reuse PI 能力复用对照用于记录 `pi.dev` 当前提供的现成能力，以及 `apps/oc-pi-cli` 仍需自行设计和实现的产品能力。

## Purpose 目的

- 避免在 `oc-pi-cli` 中重复实现 Pi 已提供的基础设施
- 明确哪些能力属于 `Pi 基础层`，哪些属于 `OC-PI 产品层`
- 为后续 feature 功能规划提供依据

## Documentation Source 文档来源

- 调研来源: `https://pi.dev/docs/latest`
- Context7 文档源: `/websites/pi_dev`

## Reusable Primitives 可复用原语

Reusable Primitives 可复用原语指可以直接借用或封装使用的 Pi 基础能力。

### Session Runtime 会话运行时

- Pi 提供 session 会话创建、持久化、恢复、fork 分叉与切换能力
- 这类能力适合直接作为 `oc-pi-cli` 的会话基础设施

### Extension Hooks 扩展钩子

- Pi 支持 TypeScript extension 扩展
- 支持事件监听、工具注册、命令注册与工具调用拦截
- 这类能力适合用来承载产品层自定义逻辑

### Command System 命令系统

- Pi 可统一暴露 extension command 扩展命令、prompt template 提示模板命令、skill 技能命令
- 可通过 `pi.getCommands()` 或 RPC `get_commands` 获取命令列表
- 这类能力适合作为 `oc-pi-cli` 的命令发现与路由基础

### Prompt Templates 提示模板

- Pi 支持 prompt template 提示模板与覆盖机制
- 这类能力可直接复用于规划命令、review 命令、生成命令的模板层

### Skills Loading Skills 加载

- Pi 支持 skills 技能目录与 skill command 技能命令
- 这类能力可直接复用于 `oc-pi-cli` 的技能型能力发现与调用入口

### Provider Abstraction 模型提供商抽象

- Pi 支持自定义 provider 提供商 与 model 模型列表
- 可用于承载多模型、多 API 的接入层

### Package System 包系统

- Pi 支持 package 包级资源分发
- 可打包 extension 扩展、skills 技能、prompts 提示模板、themes 主题
- 这类能力适合未来作为 `oc-pi-cli` 扩展生态的分发基础

## Missing Product Features 缺失的产品能力

Missing Product Features 缺失的产品能力指 Pi 官方没有内建，而 `oc-pi-cli` 产品目标又明确需要的能力。

### MCP Integration Layer MCP 集成层

- Pi 官方明确说明没有内建 `MCP support MCP 支持`
- 如果 `oc-pi-cli` 需要统一管理 MCP 调用、结果解析与工作流衔接，必须自行实现产品层能力

### Docs-Native Planning Docs 原生规划层

- Pi 没有内建面向 `goal 目标 -> capability 能力 -> feature 功能 -> task 任务` 的 docs-native 规划体系
- 这部分属于 `oc-pi-cli` 的核心产品能力

### Loop Product Logic 循环产品逻辑

- Pi 虽然有 session、command、extension 等基础设施，但没有现成的全局 planning loop 规划循环、feature execution loop 功能执行循环等产品逻辑
- 这部分需要 `oc-pi-cli` 自行设计

### Task and Progress Control Task 与进度控制

- Pi 官方明确说明没有 built-in to-dos 内建待办
- 因此 task graph 任务图、progress tracking 进度跟踪、global status 全局状态都需要 `oc-pi-cli` 自建

### Sub-Agent Orchestration 子代理编排

- Pi 官方明确说明没有 sub-agents 子代理
- 如果未来 `oc-pi-cli` 需要多角色或多代理协作，这部分要自行设计

### Plan Mode 规划模式

- Pi 官方明确说明没有 plan mode 规划模式
- 因此产品级规划工作流需要在 `oc-pi-cli` 中单独建设

### Background Work 后台执行

- Pi 官方明确说明没有 background bash 后台 Bash 执行
- 如果未来有后台任务、长跑 loop 或异步调度需求，需要额外设计

## Reuse vs Build Matrix 复用与自建矩阵

Reuse vs Build Matrix 复用与自建矩阵用于帮助后续做 feature 功能规划时快速判断边界。

| Area 能力域 | Pi Reuse 可复用 | OC-PI Build 需自建 |
|---|---|---|
| Session 会话 | session 持久化、恢复、fork 分叉 | 会话与规划文档、任务、loop 的语义关联 |
| Commands 命令 | slash command 命令机制 | 面向产品的命令语义与工作流 |
| Prompts 提示模板 | prompt template 模板加载 | 产品级模板体系与模板协议 |
| Skills 技能 | skills 加载与命令暴露 | 技能选择策略与产品工作流整合 |
| Providers 提供商 | provider / model 抽象 | 模型选择策略与任务场景适配 |
| Extensions 扩展 | hook、tool、command 注册 | 面向规划、loop、代码生成的产品逻辑 |
| MCP 集成 | 无内建 | 完整自建 |
| Task / Progress 任务与进度 | 无内建待办 | 完整自建 |
| Plan Mode 规划模式 | 无内建 | 完整自建 |
| Sub-Agents 子代理 | 无内建 | 如需要则自建 |

## Planning Impact 对规划的影响

Planning Impact 对规划的影响用于指导后续 feature 功能列表如何拆分。

### Treat as Foundation 视为基础设施

- session runtime 会话运行时
- command system 命令系统
- prompt templates 提示模板系统
- skills loading 技能加载
- provider abstraction 提供商抽象
- extension hooks 扩展钩子

这些能力优先作为依赖基础设施理解，而不是 `oc-pi-cli` 的核心创新 feature 功能。

### Treat as Core Product 视为核心产品能力

- docs-native planning docs 原生规划
- loop engine product logic 循环引擎产品逻辑
- task-progress control plane 任务进度控制平面
- MCP bridge MCP 桥接层
- generated project spec 生成项目规格

这些能力更适合进入 `oc-pi-cli` 的主 feature 功能规划列表。

## Suggested Next Step 建议下一步

- 基于本页把 `oc-pi-cli` feature 功能列表拆成 `foundation 基础层` 与 `product 产品层`
- 优先规划产品层 feature，而不是重复实现 Pi 已内建的能力
