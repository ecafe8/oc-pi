---
title: Init Monorepo Project PRD
description: 默认 monorepo 初始化 feature 的产品定义
---

# Init Monorepo Project PRD

## User Story

作为框架使用者，我希望通过一次 CLI 命令初始化一个本地 monorepo 项目，使我可以立即开始定义 feature、规划任务并在统一文档空间中推进开发。

## Scope

- 生成 `apps/server-api`
- 生成 `apps/web-app`
- 生成 `apps/web-docs`
- 预留 `apps/oc-pi-cli/src` 作为后续 CLI 实现目录
- 初始化共享配置与 workspace 基础结构

## Out of Scope

- 当前不定义具体业务模块代码
- 当前不接入远端模板仓库拉取策略

## Expected Outcome

运行初始化流程后，项目拥有统一 monorepo 骨架，并可直接进入 feature 规划阶段。
