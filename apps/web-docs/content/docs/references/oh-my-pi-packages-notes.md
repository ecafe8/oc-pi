---
title: Oh My Pi Packages Notes Oh My Pi 包结构笔记
description: 记录对 can1357/oh-my-pi packages 目录结构与分层方式的观察，以及对 oc-pi-cli 的参考意义
---

# Oh My Pi Packages Notes Oh My Pi 包结构笔记

Oh My Pi Packages Notes Oh My Pi 包结构笔记用于沉淀我们对 `https://github.com/can1357/oh-my-pi/tree/main/packages` 的结构观察。

## Source 来源

- 仓库地址: `https://github.com/can1357/oh-my-pi`
- 重点目录: `packages/`
- 读取方式: GitHub API 与 Raw 内容抓取

## Captured Structure 已捕获结构

Captured Structure 已捕获结构用于记录本次看到的 `packages` 顶层目录。

```text
packages/
  agent
  ai
  coding-agent
  natives
  stats
  swarm-extension
  tui
  typescript-edit-benchmark
  utils
```

## Key Observations 关键观察

### 1. Main Product Package 主产品包独立

- `coding-agent` 是明确的主产品整合包
- 它组合 `agent`、`ai`、`tui`、`utils`、`natives` 等基础能力
- 这说明产品入口和平台基础能力是分开的

### 2. TUI Is Its Own Package TUI 单独成包

- `tui` 作为独立包存在
- 这说明终端界面被当作基础能力，而不是只属于主产品实现细节

### 3. Agent and AI Are Separated Agent 与 AI 分层明确

- `agent` 负责更通用的 agent state agent 状态 与 transport abstraction 传输抽象
- `ai` 负责 provider / model 提供商与模型层
- 这种拆分有利于避免把模型接入和产品流程写死在同一层

### 4. Extensions Are Optional Packages 扩展能力单独包化

- `swarm-extension` 单独作为扩展包存在
- 说明多代理或编排类能力并没有被强行塞进主产品包

### 5. Platform-First Thinking 平台优先思路

- 从结构看，它更像“平台能力 + 产品装配”，而不是单体 CLI
- `stats`、`benchmark`、`natives` 这些目录都体现了平台化思路

## Reference Feedback 对 oc-pi-cli 的参考反馈

Reference Feedback 对 oc-pi-cli 的参考反馈用于说明我们应借鉴什么，不应直接照搬什么。

### Worth Learning 值得借鉴

- 基础设施分层
- 主产品入口集中
- TUI 单独抽象
- 扩展能力包化

### Not Necessary Yet 当前不必照搬

- 过早拆出大量物理 package 包
- 过早暴露非常庞大的 exports 导出面
- 过早引入 benchmark 基准测试、stats 统计分析 这类旁支模块

## Suggested Direction 建议方向

Suggested Direction 建议方向用于说明 `oc-pi-cli` 可以如何吸收这些经验。

```text
apps/oc-pi-cli
  -> 产品主入口

future packages 未来包层
  -> oc-pi-ai
  -> oc-pi-agent-core
  -> oc-pi-tui
  -> oc-pi-docs
  -> oc-pi-planning
  -> oc-pi-runtime
  -> oc-pi-extension-mcp
  -> oc-pi-extension-wecom
```

## Planning Impact 对规划的影响

- 当前可以先在 `apps/oc-pi-cli/src` 中按能力域组织目录
- 中期应预留把稳定能力下沉到 `packages/` 的空间
- `interactive-workbench 交互工作台`、`AI 提供商接入`、`agent state 代理状态` 最适合优先考虑分层

## Related Docs 相关文档

- [System Overview 系统总览](../architecture/system-overview)
- [Template System 模板系统](../planning/template-system)
- [MVP Features MVP 功能清单](../planning/mvp-features)
