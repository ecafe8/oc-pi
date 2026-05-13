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
