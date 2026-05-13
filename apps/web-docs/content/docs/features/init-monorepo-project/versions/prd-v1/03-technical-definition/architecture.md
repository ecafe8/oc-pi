---
title: Init Monorepo Project Architecture
description: 默认 monorepo 初始化 feature 的技术定义
---

# Init Monorepo Project Architecture

## Flow

```text
CLI init command
  -> create workspace skeleton
  -> create default apps
  -> create docs control plane seed
  -> reserve apps/oc-pi-cli/src
  -> print next-step summary
```

## Architectural Notes

- 初始化逻辑将落在 `apps/oc-pi-cli/src`
- `web-docs` 文档控制平面是初始化产物的一部分
- 初始化完成后，后续 flow 将切换到 `create-feature-workspace` feature
