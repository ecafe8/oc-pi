---
title: Dev Task Workbench TUI CLI Entry 开发任务 工作台 TUI CLI 入口接线
description: 为 interactive-workbench 交互工作台建立明确的 CLI 入口与启动方式，避免 TUI 外壳存在但无法统一进入
---

# Dev Task Workbench TUI CLI Entry 开发任务 工作台 TUI CLI 入口接线

Dev Task Workbench TUI CLI Entry 开发任务 工作台 TUI CLI 入口接线用于解决第一版工作台最容易被忽略的一步：即使 `pi-tui` 外壳已经存在，如果没有统一 CLI 入口，用户仍然无法稳定进入同一条交互路径。

## Task Goal 任务目标

- 为 `interactive-workbench 交互工作台` 提供统一 CLI 启动入口
- 明确 TUI 启动点与现有非交互式 CLI 命令的关系
- 保持 `goal-to-docs 目标到文档`、`status`、`review` 等现有命令语义不被破坏

## Scope 范围

### In Scope 纳入范围

- 决定 TUI 的启动方式，例如新增专属 scope 或子命令
- 在 `apps/oc-pi-cli/src/index.ts` 中完成入口接线
- 让工作台入口可以启动 `workbench/index.ts` 提供的 TUI shell

### Out of Scope 非范围

- 不重写现有 CLI 命令体系
- 不在本任务中实现完整 TUI 交互逻辑
- 不在本任务中扩展新的业务能力

## Planned Deliverables 计划交付物

```text
apps/oc-pi-cli/src/
  index.ts
  workbench/
    index.ts
apps/oc-pi-cli/package.json
```

## Source of Truth 真源来源

- [Interactive Workbench 交互工作台](../../planning/interactive-workbench)
- [OC PI CLI Module Structure 模块结构草案](../../architecture/oc-pi-cli-module-structure)

## Implementation Notes 实现说明

- 入口必须足够明确，避免执行者把 `workbench/index.ts` 只实现成内部模块导出而没有用户可达启动路径
- 入口命令应与现有 CLI 语义保持一致，不应破坏 `goal new`、`status show`、`review latest` 等现有路径
- 若需要在 `package.json` 暴露专用脚本，也应保持语义清晰，避免与现有 `dev` / `start` 混淆

## Acceptance Criteria 验收标准

- 用户可以通过明确 CLI 入口启动第一版工作台 TUI
- 现有非交互式命令入口仍然可用
- `apps/oc-pi-cli` 的 `bun run types:check` 通过

## Next Task 候选后续任务

1. 让 slash command 交互与 CLI 入口保持一致
2. 补充工作台入口的使用说明文档
