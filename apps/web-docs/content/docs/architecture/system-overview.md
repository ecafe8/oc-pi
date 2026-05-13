---
title: System Overview 系统总览
description: 说明 apps/oc-pi-cli 与 apps/web-docs 在当前仓库中的角色分工与系统关系
---

# System Overview 系统总览

System Overview 系统总览用于说明当前仓库中 `apps/web-docs` 与 `apps/oc-pi-cli` 的角色边界。

## Current Role Split 当前角色划分

```text
apps/web-docs
  -> 产品规划与讨论文档空间

apps/oc-pi-cli
  -> 产品核心实现目录
```

## Architecture Sketch 架构草图

Architecture Sketch 架构草图用于帮助我们避免把“当前产品文档”和“未来生成项目”混为一谈。

```text
Current Repository 当前仓库
├── apps/web-docs
│   └── define goals, capabilities, architecture, planning
└── apps/oc-pi-cli
    └── implement runtime, loops, templates, AI orchestration

Future Generated Project 未来生成项目
└── not finalized yet 尚未定稿
```

## Key Rule 关键规则

- 当前 `apps/web-docs` 先服务 `apps/oc-pi-cli`
- 未来用户项目结构是后续产品输出，不是当前仓库现状

## Related Reading 相关阅读

- [Module Structure 模块结构草案](./oc-pi-cli-module-structure)
- [Pi Capability Reuse PI 能力复用对照](./pi-capability-reuse)
