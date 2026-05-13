---
title: PI Operational Loops
description: PI 在全局层与 feature 层进行循环检查和输出的 initiative 定义
---

# PI Operational Loops

## Outcome

让 PI 按固定 loop 持续发现缺口、输出建议、更新状态，而不是一次性生成大批文档后失去上下文。

## Planned Features

- `global-planning-loop`
- `feature-execution-loop`
- `review-loop`
- `release-loop`

## Notes

```text
Global Loop
  -> inspect goals / initiatives / global progress
  -> decide next features to refine

Feature Loop
  -> inspect feature docs / requirements / tasks / blockers
  -> output next actions and progress summary
```
