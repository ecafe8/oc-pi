---
title: Create Feature Workspace Task Graph 功能工作空间任务图
description: 创建 feature 功能文档工作空间的任务图草案
---

# Create Feature Workspace Task Graph 功能工作空间任务图

Task Graph 任务图用于表达 task 任务之间的依赖关系与 requirement 需求追踪关系。

## Task Graph 任务图

下面的字段中，`id` 表示任务标识，`type` 表示任务类型，`title` 表示任务标题，`dependsOn` 表示依赖任务，`requirements` 表示关联需求。

```yaml
tasks:
  - id: task-cfw-001
    type: definition # 定义类任务
    title: Define feature metadata inputs 定义功能元数据输入
    dependsOn: [] # 无前置依赖
    requirements: [cfw-001, cfw-002, cfw-003] # 关联需求
  - id: task-cfw-002
    type: implementation # 实现类任务
    title: Generate feature and version directories 生成功能与版本目录
    dependsOn: [task-cfw-001] # 依赖元数据定义
    requirements: [cfw-001, cfw-002] # 关联需求
  - id: task-cfw-003
    type: implementation # 实现类任务
    title: Seed front-matter documentation pages 写入页面头信息文档页
    dependsOn: [task-cfw-002] # 依赖目录生成
    requirements: [cfw-003] # 关联需求
  - id: task-cfw-004
    type: verification # 验证类任务
    title: Verify generated workspace completeness 验证生成工作空间的完整性
    dependsOn: [task-cfw-002, task-cfw-003] # 依赖实现完成
    requirements: [cfw-001, cfw-002, cfw-003, cfw-004] # 关联需求
```

## Notes 说明

- 后续可为每个 task 增加 `domain`、`owner`、`status` 字段
- 这一版先突出依赖关系与 requirement traceability
