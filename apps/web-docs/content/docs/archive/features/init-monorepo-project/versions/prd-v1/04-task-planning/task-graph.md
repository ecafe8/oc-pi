---
title: Init Monorepo Project Task Graph 初始化项目任务图
description: 默认 monorepo 初始化 feature 功能单元的任务图草案
---

# Init Monorepo Project Task Graph 初始化项目任务图

Task Graph 任务图用于表达 task 任务之间的依赖关系与 requirement 需求追踪关系。

## Task Graph 任务图

下面的字段中，`id` 表示任务标识，`type` 表示任务类型，`title` 表示任务标题，`dependsOn` 表示依赖任务，`requirements` 表示关联需求。

```yaml
tasks:
  - id: task-init-001
    type: definition # 定义类任务
    title: Define init command inputs and defaults 定义初始化命令输入与默认值
    dependsOn: [] # 无前置依赖
    requirements: [imp-001, imp-002, imp-003] # 关联需求
  - id: task-init-002
    type: implementation # 实现类任务
    title: Generate monorepo directories and root config 生成目录与根配置
    dependsOn: [task-init-001] # 依赖前一任务
    requirements: [imp-001, imp-002] # 关联需求
  - id: task-init-003
    type: implementation # 实现类任务
    title: Seed docs control plane and CLI root 初始化文档控制平面与 CLI 根目录
    dependsOn: [task-init-002] # 依赖目录生成
    requirements: [imp-003, imp-004] # 关联需求
  - id: task-init-004
    type: verification # 验证类任务
    title: Verify generated structure and next-step output 验证生成结构与后续提示
    dependsOn: [task-init-002, task-init-003] # 依赖实现完成
    requirements: [imp-001, imp-002, imp-003, imp-004] # 关联需求
```

## Notes 说明

- 任务图先作为文档协议样例，后续可迁移为独立结构化数据文件
- `verification` 任务必须覆盖全部 `must` requirement
