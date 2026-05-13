---
title: Module Structure 模块结构草案
description: apps/oc-pi-cli/src 的第一阶段模块分层建议，以及未来下沉到 packages 的演进方向
---

# Module Structure 模块结构草案

Module Structure 模块结构草案用于定义 `apps/oc-pi-cli/src` 在第一阶段应该如何按能力域组织代码，而不是把所有产品逻辑混在同一层。

## Goal 目标

当前目标不是立刻拆出大量 `packages 包`，而是先在 `apps/oc-pi-cli/src` 内部建立稳定分层，使后续可以逐步把成熟能力下沉到 `packages/`。

## Design Principle 设计原则

### 1. App Layer First 应用层优先

- 第一阶段优先在 `apps/oc-pi-cli/src` 内部分域组织代码
- 不为了“像平台”而过早物理拆包

### 2. Domain-Oriented Layout 面向能力域布局

- 目录按能力域组织，而不是按技术细节零散摆放
- 每个模块尽量围绕单一产品能力负责

### 3. Reuse Pi as Foundation 复用 Pi 作为基础设施

- session 会话
- command 命令
- prompt template 提示模板
- skills 技能
- TUI 交互基础
- RPC 运行时

这些能力优先作为下层基础设施接入，而不是在 `oc-pi-cli` 中重复实现。

### 4. Separate Product Logic 分离产品逻辑

- docs-native planning docs 原生规划
- review loop 审查循环
- artifact routing 产物路由
- agent-role-config 角色配置
- interactive-workbench 交互工作台

这些能力应保持为明显的产品层模块。

## Proposed Src Layout 建议的 Src 布局

```text
apps/oc-pi-cli/src/
  cli/
  config/
  runtime/
  conversation/
  planning/
  docs/
  roles/
  review/
  routing/
  workbench/
  integrations/
  codegen/
  shared/
```

## Module Responsibilities 模块职责

### cli 命令入口层

- CLI 参数解析
- 命令分发
- 启动不同运行模式

### config 配置层

- 全局配置读取
- 项目配置读取
- agent-role-config 角色配置加载
- provider / model 提供商与模型配置读取

### runtime 运行时编排层

- 会话启动
- runtime 生命周期管理
- Pi 基础能力接入
- loop 调度入口

### conversation 对话层

- 用户输入处理
- 对话上下文聚合
- 对话结果结构化输出

### planning 规划层

- goal-to-docs 目标到文档
- 能力拆解
- feature 拆解
- 任务拆解规则

### docs 文档层

- 文档读取
- 文档写入
- 文档模板渲染
- 文档产物更新策略

### roles 角色层

- agent-role-config 角色配置解析
- 角色选择
- 角色职责定义
- 角色与 provider/model 的绑定

### review 审查层

- review-loop 审查循环
- writer-reviewer 编写者-审查者 配对
- 审查结果格式化

### routing 路由层

- artifact-routing 产物路由
- 输出目标解析
- 将文档、代码、审查结果写到不同槽位

### workbench 工作台层

- interactive-workbench 交互工作台
- TUI 视图装配
- 命令入口与状态反馈视图

### integrations 集成层

- MCP bridge MCP 桥接
- Skills 调用适配
- 外部应用接入预留

### codegen 代码生成层

- 代码草案生成
- 代码输出策略
- 与规划与任务的上下文对接

### shared 共享层

- 通用类型
- 通用错误处理
- 小型辅助函数
- 跨模块复用的轻量工具

## Suggested Dependency Direction 建议依赖方向

Suggested Dependency Direction 建议依赖方向用于避免模块互相缠绕。

```text
cli
  -> runtime
  -> config

runtime
  -> conversation
  -> planning
  -> docs
  -> roles
  -> review
  -> routing
  -> workbench
  -> integrations
  -> codegen

planning / docs / roles / review / routing / workbench / integrations / codegen
  -> shared
  -> config
```

## First Phase Priority 第一阶段优先级

### Must Stabilize 必须先稳定

- `config 配置层`
- `roles 角色层`
- `planning 规划层`
- `docs 文档层`
- `review 审查层`
- `routing 路由层`
- `workbench 工作台层`

### Can Stay Thin Early 早期可保持轻量

- `integrations 集成层`
- `codegen 代码生成层`
- `conversation 对话层` 的深度抽象

## Future Package Candidates 未来可下沉包候选

Future Package Candidates 未来可下沉包候选用于说明哪些 `src` 模块成熟后适合抽到 `packages/`。

```text
packages/oc-pi-ai
  <- config/provider 相关稳定后抽离

packages/oc-pi-agent-core
  <- roles + conversation + runtime 中稳定的 agent 能力

packages/oc-pi-tui
  <- workbench 中稳定的 TUI 基础组件

packages/oc-pi-docs
  <- docs 模板渲染与文档读写能力

packages/oc-pi-planning
  <- planning 规则与规划流水线

packages/oc-pi-runtime
  <- runtime + routing 中稳定的调度能力

packages/oc-pi-extension-mcp
  <- integrations 中的 MCP 扩展

packages/oc-pi-extension-wecom
  <- integrations 中的企微扩展
```

## Reference Basis 参考依据

Reference Basis 参考依据用于说明这份结构草案主要基于哪些外部观察。

- Pi 文档显示其已提供 session、commands、TUI、RPC、skills、prompts、provider 等基础设施
- `oh-my-pi` 的 `packages/` 结构显示主产品、TUI、AI、agent、扩展能力分层明确
- 当前 `oc-pi-cli` 仍在产品规划期，因此先采用“在 `src` 内部分层，后续再物理拆包”的策略

## Related Docs 相关文档

- [System Overview 系统总览](./system-overview)
- [Runtime Model 运行时模型](./runtime-model)
- [Oh My Pi Packages Notes Oh My Pi 包结构笔记](../references/oh-my-pi-packages-notes)
- [Pi Docs Notes PI 文档笔记](../references/pi-docs-notes)
