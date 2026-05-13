---
title: Agent Role Config 角色配置协议
description: 定义 apps/oc-pi-cli 中多角色 Agent 的最小配置模型、默认角色集合与后续扩展方向
---

# Agent Role Config 角色配置协议

Agent Role Config 角色配置协议用于定义 `apps/oc-pi-cli` 如何为不同产品角色分配不同的 `AI Provider 人工智能提供商`、`Model 模型` 与后续可扩展的 `Agent Profile 代理画像`。

## Purpose 目的

- 为 `goal-to-docs 目标到文档` 提供明确的角色分工
- 为 `review-loop 审查循环` 提供 writer-reviewer 编写者-审查者 配对基础
- 为 `interactive-workbench 交互工作台` 提供可配置入口
- 为后续代码生成、MCP 集成、Skills 调用提供角色选择基础

## Core Principle 核心原则

Core Principle 核心原则说明第一版配置模型应先简单可用，再逐步演进。

- 第一版先支持 `role -> provider + model` 的稳定映射
- 同时保留向 `Agent Profile 代理画像` 扩展的空间
- 角色配置不仅决定模型，还决定职责与产物落点

## Minimum Field Set 最小字段集合

Minimum Field Set 最小字段集合用于定义第一版配置协议至少应该包含哪些字段。

```yaml
roleId: goal-planner # 角色唯一标识
name: Goal Planner # 角色显示名称
provider: openai # 提供商
model: gpt-5.4 # 模型
responsibility: 负责目标拆解与规划草案 # 职责说明
outputTarget: docs/product # 输出目标位置
reviewBy: goal-reviewer # 对应审查角色，可选
```

## Field Definitions 字段定义

Field Definitions 字段定义用于解释每个字段在产品中的语义。

- `roleId 角色标识`: 角色的稳定唯一名称，用于内部路由
- `name 角色名称`: 在界面和文档中展示给用户的名称
- `provider 提供商`: 角色默认使用的模型提供商
- `model 模型`: 角色默认使用的模型名称
- `responsibility 职责`: 该角色负责什么类型的输出或判断
- `outputTarget 输出目标`: 该角色的主要输出落点
- `reviewBy 审查角色`: 哪个角色负责审查当前角色的产物

## Phase 1 Required Fields 第一阶段必需字段

Phase 1 Required Fields 第一阶段必需字段用于限定最小可运行配置。

- `roleId 角色标识`
- `name 角色名称`
- `provider 提供商`
- `model 模型`
- `responsibility 职责`
- `outputTarget 输出目标`

## Phase 2 Optional Fields 第二阶段可选字段

Phase 2 Optional Fields 第二阶段可选字段用于支持更细的运行时控制。

- `reviewBy 审查角色`
- `allowedTools 允许工具`
- `promptTemplate 提示模板`
- `temperature 温度参数`
- `notes 备注`
- `fallbackProvider 回退提供商`
- `fallbackModel 回退模型`

## Default Role Set 默认角色集合

Default Role Set 默认角色集合用于固定第一版最推荐支持的角色。

### Goal Planner 目标规划者

- `roleId 角色标识`: `goal-planner`
- `responsibility 职责`: 负责把用户目标拆成产品目标、能力和 feature 草案
- `outputTarget 输出目标`: `docs/product` 与 `docs/planning`

### Goal Reviewer 目标审查者

- `roleId 角色标识`: `goal-reviewer`
- `responsibility 职责`: 审查目标定义、能力拆解与范围边界
- `outputTarget 输出目标`: `docs/product` 或 review 摘要位置

### Doc Writer 文档编写者

- `roleId 角色标识`: `doc-writer`
- `responsibility 职责`: 生成或更新规划文档、功能文档与说明文档
- `outputTarget 输出目标`: `docs/**`

### Doc Reviewer 文档审查者

- `roleId 角色标识`: `doc-reviewer`
- `responsibility 职责`: 审查文档结构、逻辑一致性与术语表达
- `outputTarget 输出目标`: 文档 review 结果与摘要位置

### Code Writer 代码编写者

- `roleId 角色标识`: `code-writer`
- `responsibility 职责`: 根据规划和任务输出代码草案或实现
- `outputTarget 输出目标`: `apps/oc-pi-cli/src`

### Code Reviewer 代码审查者

- `roleId 角色标识`: `code-reviewer`
- `responsibility 职责`: 审查代码质量、边界一致性与实现风险
- `outputTarget 输出目标`: review 结果与状态摘要位置

## Example Configuration 配置示例

Example Configuration 配置示例用于演示第一版最小可行配置长什么样。

```yaml
roles:
  - roleId: goal-planner
    name: Goal Planner
    provider: openai
    model: gpt-5.4
    responsibility: 负责目标拆解与规划草案
    outputTarget: docs/product
    reviewBy: goal-reviewer

  - roleId: goal-reviewer
    name: Goal Reviewer
    provider: anthropic
    model: claude-sonnet-4.6
    responsibility: 审查目标与规划质量
    outputTarget: docs/product

  - roleId: doc-writer
    name: Doc Writer
    provider: openai
    model: gpt-5.4
    responsibility: 编写规划文档与功能文档
    outputTarget: docs
    reviewBy: doc-reviewer

  - roleId: doc-reviewer
    name: Doc Reviewer
    provider: anthropic
    model: claude-sonnet-4.6
    responsibility: 审查文档结构与逻辑一致性
    outputTarget: docs/review

  - roleId: code-writer
    name: Code Writer
    provider: anthropic
    model: claude-sonnet-4.6
    responsibility: 编写代码实现
    outputTarget: apps/oc-pi-cli/src
    reviewBy: code-reviewer

  - roleId: code-reviewer
    name: Code Reviewer
    provider: openai
    model: gpt-5.4
    responsibility: 审查代码质量与边界一致性
    outputTarget: docs/review
```

## Relation to Other Features 与其他功能的关系

Relation to Other Features 与其他功能的关系用于说明角色配置协议并不是孤立功能。

- `goal-to-docs 目标到文档` 依赖角色来决定谁负责起草与谁负责审查
- `review-loop 审查循环` 依赖 `reviewBy 审查角色` 建立流程
- `artifact-routing 产物路由` 依赖 `outputTarget 输出目标` 决定写入位置
- `interactive-workbench 交互工作台` 依赖角色配置决定界面里展示哪些可切换角色

## Open Questions 待定问题

Open Questions 待定问题用于标记后续还需继续细化的部分。

- 第一版是否允许一个角色绑定多个模型候选
- 第一版是否允许用户在会话内临时覆盖角色模型
- `outputTarget 输出目标` 是路径、逻辑槽位，还是两者结合
- review 结果是否应绑定固定的 review artifact 审查产物结构
