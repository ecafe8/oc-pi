---
title: Dev Task Workbench Pi TUI Shell Layout 开发任务 工作台 Pi TUI 外壳布局
description: 基于 pi-tui 搭建 interactive-workbench 第一版固定布局外壳，不先做复杂自由多窗格系统
---

# Dev Task Workbench Pi TUI Shell Layout 开发任务 工作台 Pi TUI 外壳布局

Dev Task Workbench Pi TUI Shell Layout 开发任务 工作台 Pi TUI 外壳布局用于把 `Interactive Workbench 交互工作台` 的 ASCII Wireframe 线框草图第一次实现为真实可启动的 `pi-tui` 外壳。

## Task Goal 任务目标

- 搭出第一版固定布局：顶部状态、左聊天、右信息、底部输入
- 使用 `@earendil-works/pi-tui` 现成能力，而不是自建终端基础设施
- 让工作台至少能作为静态壳启动并刷新状态

## Scope 范围

### In Scope 纳入范围

- 创建 `apps/oc-pi-cli/src/workbench/views/` 下的最小布局组件
- 创建 `apps/oc-pi-cli/src/workbench/index.ts` 作为 TUI shell 启动入口，而不是模糊的 barrel export 入口
- 复用仓库中已存在的 `@earendil-works/pi-tui` 依赖，接入 `TUI`、`ProcessTerminal`、`Editor`、`Text` / `Markdown`、`TruncatedText`
- 实现左右结构与底部输入区固定布局

### Out of Scope 非范围

- 不实现完整执行闭环
- 不实现复杂 overlay 菜单系统
- 不实现 diff 预览器
- 不实现多会话或分支管理

## Planned Deliverables 计划交付物

```text
apps/oc-pi-cli/src/workbench/
  index.ts
  views/
    [header / chat / info / composer 等最小组件]
```

## Source of Truth 真源来源

- [Interactive Workbench 交互工作台](../../planning/interactive-workbench)
- [ASCII Wireframe 线框草图](../../planning/interactive-workbench#ascii-wireframe-线框草图)

## Implementation Notes 实现说明

- 本任务默认依赖 [Dev Task Workbench Chat Presenters 开发任务 工作台对话展示适配层](./02-workbench-chat-presenters) 已提供基础展示字段
- 第一版只允许固定左右布局，不实现可拖拽或自由切 pane
- 左侧聊天区必须明显大于右侧信息区
- 右侧信息区必须支持独立滚动
- 底部输入区必须固定，不漂移成弹窗输入

## Acceptance Criteria 验收标准

- 启动后可见顶部状态、左聊天、右信息、底部输入四个区域
- 布局与 `interactive-workbench` 文档中的 ASCII 草图语义一致
- `apps/oc-pi-cli` 的 `bun run types:check` 通过

## Next Task 候选后续任务

1. 连接真实消息流与执行状态
2. 接入用户确认后执行的主循环
