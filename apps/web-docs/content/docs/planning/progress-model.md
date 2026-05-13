---
title: Progress Model 进度模型
description: apps/oc-pi-cli 产品研发中的全局进度与 feature 进度聚合模型草案
---

# Progress Model 进度模型

Progress Model 进度模型用于定义如何记录并汇总产品研发的推进状态。

## Layers 分层

- Global Progress 全局进度: 看产品整体推进
- Feature Progress 功能进度: 看单个 feature 的推进情况
- Loop Output Progress 循环输出进度: 看每一轮 loop 的结论

## Aggregation Rule 聚合规则

- 全局进度由能力模块与 feature 状态汇总而来
- 任务状态是 feature 进度的基础输入
- loop 输出可以补充风险、缺口与下一步建议
