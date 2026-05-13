---
title: Init Monorepo Project Acceptance Criteria 初始化项目验收标准
description: 默认 monorepo 初始化 feature 功能单元的验收标准
---

# Init Monorepo Project Acceptance Criteria 初始化项目验收标准

Acceptance Criteria 验收标准用于把产品定义转成可验证的 requirement 需求条目。

## Criteria 验收条目

下面的字段中，`id` 表示需求标识，`title` 表示需求标题，`priority` 表示优先级。

```yaml
requirements:
  - id: imp-001
    title: Initialize default monorepo layout 初始化默认 Monorepo 结构
    priority: must # 必须项
  - id: imp-002
    title: Include server, web, and docs apps 包含 server、web 与 docs 应用
    priority: must # 必须项
  - id: imp-003
    title: Reserve CLI implementation root at apps/oc-pi-cli/src 预留 CLI 实现根目录
    priority: must # 必须项
  - id: imp-004
    title: Provide a clear post-init next step for feature planning 提供初始化后的下一步规划提示
    priority: should # 建议项
```

## Readable Form 可读说明

- `imp-001` 初始化完成后，仓库具备统一 monorepo 目录结构
- `imp-002` 默认应用集合至少包含 `server-api`、`web-app`、`web-docs`
- `imp-003` 目录中保留 `apps/oc-pi-cli/src` 作为 CLI 代码根
- `imp-004` 初始化后能够明确进入 feature 规划阶段
