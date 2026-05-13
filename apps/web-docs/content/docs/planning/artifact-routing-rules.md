---
title: Artifact Routing Rules 产物路由规则
description: 定义 apps/oc-pi-cli 如何根据角色输出、逻辑槽位与当前映射把产物写入正确位置
---

# Artifact Routing Rules 产物路由规则

Artifact Routing Rules 产物路由规则用于定义 `apps/oc-pi-cli` 如何把不同角色产出的文档、代码和审查结果写入正确位置。

## Goal 目标

第一阶段的 `artifact-routing 产物路由` 目标是建立一条稳定路径：

```text
Role Output 角色输出
  -> Output Target 逻辑槽位
  -> Slot Mapping 槽位映射
  -> Physical Destination 物理落点
```

## Routing Inputs 路由输入

- 当前角色标识
- 当前产物类型
- `outputTarget 输出目标` 逻辑槽位
- 当前工作空间的槽位映射

## Routing Outputs 路由输出

- 最终写入位置
- 写入方式，例如 overwrite 覆盖、append 追加、merge 合并
- 产物回写结果

## Phase 1 Routing Rule 第一阶段路由规则

- 一个角色输出默认只写入一个逻辑槽位
- 一个逻辑槽位默认只解析为一个物理落点
- 路由行为优先简单稳定，不做复杂多路广播

## Example Routes 示例路由

### Goal Planner 目标规划者

- `outputTarget 输出目标`: `product-goal`
- 路由到: `apps/web-docs/content/docs/product/vision.md`

### Doc Writer 文档编写者

- `outputTarget 输出目标`: `feature-plan`
- 路由到: `apps/web-docs/content/docs/planning/mvp-features.md`

### Code Writer 代码编写者

- `outputTarget 输出目标`: `implementation-code`
- 路由到: `apps/oc-pi-cli/src`

### Reviewer 审查者

- `outputTarget 输出目标`: `review-notes`
- 路由到: review notes 默认映射位置

## Write Modes 写入模式

Write Modes 写入模式用于约束不同产物如何回写。

- `overwrite 覆盖`: 适合单页真源文档
- `append 追加`: 适合审查日志、进度记录
- `merge 合并`: 适合结构化配置或槽位映射

## Relation to Output Target Slots 与输出槽位协议的关系

- `output-target-slots 输出槽位协议` 定义逻辑槽位与默认映射
- 本文档定义角色输出如何消费这些槽位和映射

## Relation to Project Bootstrap 与项目初始化的关系

- `project-bootstrap 项目初始化` 必须种下默认槽位映射
- 没有初始化映射，产物路由无法稳定工作

## Open Questions 待定问题

- 第一版 review notes 是否应该单独落到新文件而不是 backlog
- 代码生成如果涉及多个文件，第一版如何表达“目录级落点”
- 是否要允许角色按阶段覆盖默认写入模式

## Related Docs 相关文档

- [Output Target Slots 输出槽位协议](./output-target-slots)
- [Project Bootstrap 项目初始化草案](./project-bootstrap)
- [Agent Role Config 角色配置协议](./agent-role-config)
