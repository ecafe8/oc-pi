---
title: Docs Protocol 文档协议
description: docs-native 文档原生控制平面的目录、front matter 页面头信息与结构化数据约定
---

# Docs Protocol 文档协议

Docs Protocol 文档协议定义这套文档控制平面如何组织目录、页面元数据与结构化控制信息。

## Principle 原则

```text
Docs are the workspace.
YAML is the contract.
PI is the operator.
Loops are the engine.
```

## Content Layers 内容分层

- Narrative 叙述层: 给人阅读和讨论的说明文档
- Structured Control Data 结构化控制数据层: 给人和机器共享的字段与协议
- Operational Logs 运行日志层: 由循环追加的进度、阻塞与 review 结果

## Front Matter Rule 页面头信息规则

Front Matter 页面头信息用于描述页面的最小元数据。

每个页面至少包含：

- `title`
- `description`

后续可选增加：

- `status`
- `owner`
- `initiative`
- `feature`
- `version`

## Suggested Structured Fragments 建议结构化片段

下面的字段示例中，`id` 表示唯一标识，`status` 表示状态，`owner` 表示责任人，`stage` 表示阶段。

```yaml
feature:
  id: create-feature-workspace
  status: definition
  owner: pi

version:
  id: prd-v1
  stage: planned
```

## Suggested Directory Shape 建议目录结构

```text
content/docs/
  project/
  protocols/
  features/
```

其中：

- `project/` 放全局目标、initiative、里程碑、全局进度
- `protocols/` 放对象模型与协议说明
- `features/` 放具体 feature 的版本文档、任务图、进度与 review
