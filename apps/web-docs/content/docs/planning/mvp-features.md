---
title: MVP Features MVP 功能清单
description: apps/oc-pi-cli 当前第一批核心功能与其作用边界定义
---

# MVP Features MVP 功能清单

本页用于在 apps/oc-pi-cli 产品边界下，定义第一批 MVP 功能（feature-plan 功能规划槽位）与本次交付必须进入的 MVP 范围（mvp-scope MVP 范围槽位），以支持“当前产品边界下三阶段真实写入验证”的目标。

## Feature List 功能清单

（注：本节为 feature-plan 功能规划槽位，列出来自 Capability Map 能力地图中一级能力的 feature 单元。首次出现的英文术语需带中文解释。）

- conversation-orchestration 对话编排：负责 CLI 命令解析、交互式流程推进与多步骤执行流控制（Conversation Orchestration，对话编排）。
- context-management 上下文管理：维护会话态、目标设备元数据、阶段状态与回滚快照（Context Management，上下文管理）。
- loop-engine 循环引擎：为读写/校验步骤提供重试、轮询与超时/退避策略（Loop Engine，循环引擎）。
- template-engine 模板引擎：渲染命令、校验脚本与报告模板，支持变量替换与片段复用（Template Engine，模板引擎）。
- docs-generation 文档生成：输出结构化 JSON 报告与终端友好摘要，支持审计与 CI 集成（Docs Generation，文档生成）。
- skills-integration Skills 集成：集成校验算法（如 checksum）、回滚策略与硬件适配工具（Skills Integration，Skills 集成）。
- mcp-integration MCP 集成：提供与 CI/CD 或管理控制面的集成锚点（退出码与可解析报告）（MCP Integration，MCP 集成）。

## MVP Scope MVP 范围

（注：本节为 mvp-scope MVP 范围槽位，明确哪些来自上文 feature-plan 的功能必须进入本次 MVP，以及哪些能力暂不进入当前范围。）

必须进入 MVP 的功能项：
- conversation-orchestration 对话编排 的基础子集：
  - 接受命令行参数并触发预定义三阶段流程（Stage 1 准备、Stage 2 写入、Stage 3 读回校验）。
  - 提供交互式提示与最小化的错误引导信息。
- context-management 上下文管理 的核心能力：
  - 持久化单次执行的会话上下文（内存序列化/本地临时文件）和目标设备元数据。
  - 在三阶段间维护状态与可选回滚快照（基本快照/恢复点）。
- loop-engine 循环引擎 的基本策略：
  - 为写入与读回校验提供可配置的重试次数、超时与固定退避（exponential backoff 可选基础实现）。
- template-engine 模板引擎 的最小实现：
  - 支持 YAML/JSON 模板变量替换，用于渲染写入命令与校验脚本。
- docs-generation 文档生成 的 MVP 输出：
  - 生成结构化 JSON 报告（包含阶段结果、错误码、校验摘要）与终端文本摘要。
  - 支持返回可被 CI 解析的退出码（成功/失败/partial）。
- skills-integration 的核心校验模块：
  - 集成常见 checksum/哈希 校验算法以完成读回比对。
- mcp-integration 的最低耦合点：
  - 保证输出满足外部 CI 解析的基本要求（退出码 + JSON 报告输出到 stdout/文件）。

不进入当前 MVP 范围的能力项（先期延后）：
- code-generation 代码生成：插件骨架自动生成工具暂不进入 MVP，作为后续可选增强。
- 高级 conversation-orchestration：复杂的多分支对话流、策略化提问与自然语言理解暂不进入。
- 完整的可插拔 adapter 生态：对外开放插件市场或在线适配器仓库不在本阶段交付范围。
- 高级 loop-engine 策略：例如复杂的条件循环 DSL、分布式任务协同暂不进入。
- 完整审计/长期存储：长期审计日志仓库与外部 MCP 持久化接口（除基础 JSON 输出及退出码外）暂不进入。

## Prioritization Rule 优先级规则

（注：本节说明为何按下列规则决定先实现哪些 feature。）

- 从可交付价值优先（Value-first）：优先实现能在 CI/CD 流水线中被直接验证并产生可审计结果的能力（docs-generation、mcp-integration、loop-engine 基础），以最快实现“真实写入验证”的闭环。
- 从风险控制优先（Risk-reduction）：优先完成影响安全与数据一致性的模块（context-management、skills-integration 中校验算法与回滚快照），以降低写入带来的风险。
- 从端到端可用性优先（End-to-end usability）：优先保证从命令触发到报告生成的完整链路（conversation-orchestration + template-engine + docs-generation），即使是简化版本也必须可执行完整三阶段。
- 先做可扩展的最小实现（Composable MVP）：实现可被后续扩展的最小接口与数据格式（例如标准化 JSON 报告 schema、模板占位符规范），为未来 code-generation 与插件生态留出扩展点。
- 低耦合先行（Low-coupling first）：先实现低耦合的集成点（标准输入/输出、文件路径、退出码），避免一开始就引入复杂运行时依赖。

## Open Questions 待定问题

- 报告 schema 的最终版本如何定稿？（需确认 JSON 报告字段、错误码规范与版本兼容策略）
- 三阶段流程的标准化阶段定义与失败策略细节如何（例如 Stage 2 写入失败时是否必须立即回滚、或允许重试策略差异化）？
- 模板语言与变量替换规则采用何种子集（是否支持条件逻辑/循环、或仅支持键值替换）？
- 回滚快照的粒度与存储策略（仅内存/本地临时文件/可选上传到外部存储）应如何权衡以满足安全与可追溯性需求？
- 与现有 CI/CD 的集成契约细节（例如退出码语义、报告路径约定、是否需要特定 HTTP 回调）需要与目标 CI 平台进一步确认。
