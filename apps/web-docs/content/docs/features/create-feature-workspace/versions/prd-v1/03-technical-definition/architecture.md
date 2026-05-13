---
title: Create Feature Workspace Architecture
description: 创建 feature 文档工作空间的技术定义
---

# Create Feature Workspace Architecture

## Flow

```text
CLI create-feature command
  -> resolve feature name and initiative
  -> create feature root
  -> create version root
  -> seed docs files with front matter
  -> print refinement checklist
```

## Architectural Notes

- 生成器逻辑将位于 `apps/oc-pi-cli/src`
- docs 结构必须足够稳定，便于 PI loop 后续追加 progress 与 review 信息
- narrative 页面与 task/progress 协议应保持分层，不把运行态信息全部写进 PRD 页面
