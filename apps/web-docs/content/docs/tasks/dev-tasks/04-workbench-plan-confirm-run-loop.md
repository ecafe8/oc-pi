---
title: Dev Task Workbench Plan Confirm Run Loop 开发任务 工作台 方案确认执行闭环
description: 为第一版工作台接入 AI 先给方案、用户确认后执行的最小主循环
---

# Dev Task Workbench Plan Confirm Run Loop 开发任务 工作台 方案确认执行闭环

Dev Task Workbench Plan Confirm Run Loop 开发任务 工作台 方案确认执行闭环用于把第一版 TUI 从“静态外壳”推进到“可讨论、可确认、可执行”的最小工作流闭环。

## Task Goal 任务目标

- 用户输入 goal 后，AI 先输出执行方案，而不是直接开跑
- 系统进入 `waiting-user 等待用户确认`
- 用户确认后，系统才开始真正执行 `goal-to-docs 目标到文档`
- 左侧聊天区持续展示执行过程消息

## Scope 范围

### In Scope 纳入范围

- 为工作台接入 goal 输入 -> AI 方案 -> 用户确认 -> 执行 的最小控制流
- 将执行阶段状态映射到工作台状态
- 将关键过程摘要写入聊天时间线

### Out of Scope 非范围

- 不实现复杂多轮对话策略
- 不实现 artifact 原地编辑
- 不实现多种确认粒度矩阵

## Planned Deliverables 计划交付物

```text
apps/oc-pi-cli/src/workbench/
  controller/
    index.ts
  state.ts
  views/
apps/oc-pi-cli/src/planning/goal-to-docs/
  [按需要复用现有 runner，不重写一套新执行引擎]
```

## Source of Truth 真源来源

- [Interactive Workbench 交互工作台](../../planning/interactive-workbench)
- [Goal-to-Docs 目标到文档草案](../../planning/goal-to-docs)

## Implementation Notes 实现说明

- 当前 `apps/oc-pi-cli/src/workbench/controller/index.ts` 与 `apps/oc-pi-cli/src/workbench/state.ts` 已有骨架；本任务应在其基础上补齐 plan-first 控制流，而不是重新创建平行模块
- 第一版优先打通 `preview 预览模式` 与 `sandbox 沙盒模式`
- 默认不把 `workspace docs 真实文档写入路径` 作为 TUI 主路径；开发与测试下的 `--write` 应自动落到 sandbox
- 执行前必须清晰展示当前边界与计划步骤
- 当前 `goal-to-docs 目标到文档` 已是四阶段闭环：`goal-framing`、`capability-breakdown`、`feature-planning`、`handoff-summary`
- 执行过程展示必须覆盖 Stage 4 的 `handoff-summary 交接摘要` 主输出与 `handoff-next-up 下一步指引` 附加输出，而不是只停留在 Stage 3 语义

## Acceptance Criteria 验收标准

- 用户在 TUI 中输入目标后，AI 会先返回执行方案
- 状态明确进入 `waiting-user 等待用户确认`
- 用户确认后，系统开始执行并更新状态为 `running 运行中`
- 左侧聊天区能看到至少一条执行过程消息与最终结果摘要

## Next Task 候选后续任务

1. 让右侧信息区显示计划步骤与执行结果
2. 将 review / guard 结果映射到用户可见摘要
