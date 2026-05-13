---
title: Create Feature Workspace Architecture 功能工作空间技术定义
description: 创建 feature 功能文档工作空间的技术定义
---

# Create Feature Workspace Architecture 功能工作空间技术定义

Architecture 技术架构页用于描述 feature 功能工作空间生成流程的技术结构与关键落点。

## Flow 流程

```text
CLI create-feature command
  -> resolve feature name and initiative
  -> create feature root
  -> create version root
  -> seed docs files with front matter
  -> print refinement checklist
```

## Architectural Notes 架构说明

- 生成器逻辑将位于 `apps/oc-pi-cli/src`
- docs 结构必须足够稳定，便于 PI loop 后续追加 progress 与 review 信息
- narrative 页面与 task/progress 协议应保持分层，不把运行态信息全部写进 PRD 页面
