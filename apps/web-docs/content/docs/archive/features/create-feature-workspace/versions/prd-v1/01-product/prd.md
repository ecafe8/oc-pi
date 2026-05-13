---
title: Create Feature Workspace PRD 功能工作空间产品定义
description: 创建 feature 功能文档工作空间的产品定义
---

# Create Feature Workspace PRD 功能工作空间产品定义

PRD 产品需求文档用于说明这个 feature 功能单元的目标用户、范围与预期结果。

## User Story 用户故事

作为框架使用者，我希望通过一条命令生成一个标准化 feature 文档空间，使后续 PRD、任务规划、进度跟进与 review 都有固定落点。

## Scope 范围

- 创建 `features/<feature-name>/` 文档空间
- 创建 version 骨架，例如 `versions/prd-v1`
- 创建 foundation、product、technical definition、task planning、progress 等目录
- 预填基础 front matter 与样例结构

## Out of Scope 范围外事项

- 当前不自动生成最终实现代码
- 当前不自动同步外部项目管理平台

## Expected Outcome 预期结果

每个 feature 都有一致的输入面、输出面与跟踪面，可供 PI loop 稳定消费。
