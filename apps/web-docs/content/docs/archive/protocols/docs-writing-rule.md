---
title: Docs Writing Rule 文档编写规范
description: apps/web-docs/content 下文档的双语术语、关系命名、字段说明与术语解释规则
---

# Docs Writing Rule 文档编写规范

Docs Writing Rule 文档编写规范用于约束 `apps/web-docs/content` 下所有文档的术语表达方式，确保内容既适合人读，也适合后续 PI 循环稳定解析。

## Rules 规则

- For files under `apps/web-docs/content`, the first appearance of an English term must include a Chinese explanation.
- Relationship names must be written as `English + 中文语义`.
- Field names must include a Chinese definition.
- If a section title is technical jargon, the first sentence of the section should explain it in Chinese.
- Do not leave foundation/product docs with unexplained English-only terminology.

## Writing Guidance 写作指引

- `Goal 目标`、`Initiative 计划主题`、`Feature 功能单元`、`Requirement 需求条目`、`Task 任务`、`Progress 进度记录` 等术语首次出现时都要带中文语义。
- 关系表达推荐写成 `Feature -> Requirement 功能单元到需求条目` 这种形式。
- 结构化字段第一次出现时，字段名后应补一句中文定义。
- `Foundation 基础背景`、`Product 产品定义` 这类文档必须避免只留下英文术语而不解释。
