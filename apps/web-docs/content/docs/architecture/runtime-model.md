---
title: Runtime Model 运行时模型
description: 说明 apps/oc-pi-cli 作为执行引擎时的主要输入、处理与输出模型
---

# Runtime Model 运行时模型

Runtime Model 运行时模型用于描述 `apps/oc-pi-cli` 如何消费输入并产出动作结果。

## Flow 流程

```text
User Intent 用户意图
  -> Context Resolution 上下文解析
  -> Capability Dispatch 能力分发
  -> AI / MCP / Skills Execution 外部能力执行
  -> Docs / Tasks / Code Output 输出
  -> Loop Feedback 循环反馈
```

## Main Inputs 主要输入

- 用户对话输入
- 规划文档输入
- 当前任务与进度状态
- MCP 与 Skills 可用能力信息

## Main Outputs 主要输出

- 文档更新
- 任务建议
- 进度摘要
- 代码草案
- loop 结果

## Workbench Runtime Slice 工作台运行时切片

Workbench Runtime Slice 工作台运行时切片用于说明 `interactive-workbench 交互工作台` 在整体运行时中的位置。

```text
User Intent 用户意图
  -> Workbench Input 工作台输入
  -> Runtime Dispatch 运行时分发
  -> Planning / Review / Routing / Roles 模块执行
  -> Workbench State Update 工作台状态更新
  -> TUI Refresh 终端界面刷新
```

- 工作台不是独立业务引擎，而是运行时主循环的可视化入口
- 工作台状态需要消费 `roles 角色层`、`review 审查层`、`routing 路由层` 的结构化结果
- 这样可以保证命令模式与自然语言模式共享同一套底层执行链路
