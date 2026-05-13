---
title: Project Bootstrap 项目初始化草案
description: 定义 apps/oc-pi-cli 第一阶段初始化工作空间时应生成的最小结构、模板集合与默认槽位映射
---

# Project Bootstrap 项目初始化草案

Project Bootstrap 项目初始化草案用于定义 `apps/oc-pi-cli` 在第一阶段初始化工作空间时，到底应生成哪些最小结构，而不是只创建几个空目录。

## Goal 目标

第一阶段的 `project bootstrap 项目初始化` 目标是生成一个能立即支撑：

- `goal-to-docs 目标到文档`
- `agent-role-config 角色化代理配置`
- `artifact-routing 产物路由`
- `interactive-workbench 交互工作台`

的最小工作空间。

## Bootstrap Principle 初始化原则

### 1. Seed a Working System 初始化一个可运行系统

- 初始化后应能直接进入目标输入与文档生成流程
- 不只是得到一个空仓库

### 2. Prefer Minimum Scaffolding 优先最小骨架

- 第一阶段只初始化必要模板与必要配置
- 不一次性铺开未来所有用户项目结构

### 3. Use Logical Slot Mapping 使用逻辑槽位映射

- 初始化时应生成 `outputTarget 输出目标` 的默认槽位映射
- 角色配置和路由逻辑依赖这层映射，而不是写死路径

## Minimum Bootstrap Output 最小初始化输出

Minimum Bootstrap Output 最小初始化输出用于定义第一版最推荐生成的内容。

### 1. Workspace Config 工作空间配置

- 产品基础配置文件
- provider / model 提供商与模型配置入口
- 角色配置文件
- 输出槽位映射文件

### 2. Planning Docs Seed 规划文档种子

- 产品目标草案模板
- 能力拆解模板
- 功能清单模板
- MVP 范围模板
- 下一步摘要模板

### 3. Runtime Entry Runtime 运行时入口

- CLI 主入口配置
- 最小交互工作台启动入口

### 4. Implementation Root 实现目录根

- `apps/oc-pi-cli/src` 作为代码实现目录

## Suggested First-Phase Shape 第一阶段建议结构

```text
workspace-root/
  .oc-pi/
    config/
      roles.yaml
      slots.yaml
      providers.yaml
    templates/
      product-goal.md
      capability-map.md
      feature-plan.md
      mvp-scope.md
      next-summary.md
  apps/
    oc-pi-cli/
      src/
  docs/
    product/
    capabilities/
    planning/
    tasks/
```

## Default Slot Mapping 默认槽位映射

Default Slot Mapping 默认槽位映射用于说明初始化时至少要种下哪些逻辑槽位。

```yaml
slots:
  product-goal: docs/product/vision.md
  capability-map: docs/capabilities/overview.md
  feature-plan: docs/planning/features.md
  mvp-scope: docs/planning/mvp-scope.md
  next-summary: docs/tasks/next-up.md
  review-notes: docs/tasks/review-notes.md
  implementation-code: apps/oc-pi-cli/src
  progress-status: docs/tasks/status.md
```

## Relation to Goal-to-Docs 与目标到文档的关系

Relation to Goal-to-Docs 与目标到文档的关系用于说明为什么初始化结构受 `goal-to-docs 目标到文档` 反向约束。

- `goal-to-docs 目标到文档` 定义了最小产物集合
- `project bootstrap 项目初始化` 负责为这些产物预置模板与槽位映射
- 也就是说，初始化是文档流水线的地基，而不是独立功能

## Relation to Agent Roles 与角色配置的关系

Relation to Agent Roles 与角色配置的关系用于说明为什么初始化结构必须和角色配置一起考虑。

- 角色配置依赖默认槽位映射
- 工作台依赖角色配置文件存在
- review-loop 审查循环依赖 review 槽位与模板存在

## First Version Constraints 第一版约束

First Version Constraints 第一版约束用于控制初始化功能的复杂度。

- 不初始化完整未来用户项目 monorepo
- 不初始化业务应用模板
- 不初始化复杂多环境配置
- 先围绕当前产品规划流建立最小工作空间

## Open Questions 待定问题

Open Questions 待定问题用于标记后续还需继续细化的部分。

- 第一版是否需要生成 `.oc-pi/` 目录，还是直接使用仓库根配置
- `docs/` 是否应完全放在 `apps/web-docs/content/docs` 风格下，还是产品初始化时采用更轻的目录结构
- `providers.yaml` 与 `roles.yaml` 是否应拆开，还是允许合并为一个 agent 配置文件
- review-notes 是否应从第一版就独立为单独文档

## Related Docs 相关文档

- [Goal-to-Docs 目标到文档草案](./goal-to-docs)
- [Agent Role Config 角色配置协议](./agent-role-config)
- [Output Target Slots 输出槽位协议](./output-target-slots)
- [Template System 模板系统](./template-system)
