---
title: Docs Protocol
description: docs-native 控制平面的目录、front matter 与结构化数据约定
---

# Docs Protocol

## Principle

```text
Docs are the workspace.
YAML is the contract.
PI is the operator.
Loops are the engine.
```

## Content Layers

- Narrative: 给人阅读和讨论的说明文档
- Structured Control Data: 给人和机器共享的字段与协议
- Operational Logs: 由循环追加的进度、阻塞与 review 结果

## Front Matter Rule

每个页面至少包含：

- `title`
- `description`

后续可选增加：

- `status`
- `owner`
- `initiative`
- `feature`
- `version`

## Suggested Structured Fragments

```yaml
feature:
  id: create-feature-workspace
  status: definition
  owner: pi

version:
  id: prd-v1
  stage: planned
```

## Suggested Directory Shape

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
