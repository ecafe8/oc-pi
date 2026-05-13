---
title: Init Monorepo Project Architecture 初始化项目技术定义
description: 默认 monorepo 初始化 feature 功能单元的技术定义
---

# Init Monorepo Project Architecture 初始化项目技术定义

Architecture 技术架构页用于描述初始化流程的技术骨架和关键落点。

## Flow 流程

```text
CLI init command
  -> create workspace skeleton
  -> create default apps
  -> create docs control plane seed
  -> reserve apps/oc-pi-cli/src
  -> print next-step summary
```

## Architectural Notes 架构说明

- 初始化逻辑将落在 `apps/oc-pi-cli/src`
- `web-docs` 文档控制平面是初始化产物的一部分
- 初始化完成后，后续 flow 将切换到 `create-feature-workspace` feature
