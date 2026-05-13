---
title: Pi Docs Notes PI 文档笔记
description: 基于 Context7 与 pi.dev 文档整理的可复用能力、缺失能力与对 oc-pi-cli 的规划影响
---

# Pi Docs Notes PI 文档笔记

Pi Docs Notes PI 文档笔记用于沉淀本轮从 `pi.dev` 文档中获取的能力信息，方便后续做产品规划时直接引用。

## Source 来源

- 官方文档: `https://pi.dev/docs/latest`
- Context7 文档源: `/websites/pi_dev`

## Captured Capabilities 已捕获能力

Captured Capabilities 已捕获能力用于记录 Pi 已经提供的基础设施能力。

### Session Management 会话管理

- 支持 in-memory memory 内存会话
- 支持 persistent 持久化会话
- 支持 continue recent 续接最近会话
- 支持 open / fork / clone 打开与分叉会话

### Extension System 扩展系统

- 支持 TypeScript extension 扩展
- 支持事件监听、工具注册、命令注册与工具调用拦截

### Command / Prompt / Skill 命令提示词与技能

- 可获取统一命令列表
- 包括 extension command 扩展命令、prompt template 提示模板命令、skill 技能命令

### Interactive TUI 交互式终端界面

- SDK 提供 `InteractiveMode 交互模式`
- 包含 editor 编辑器、chat history 聊天历史 与 built-in commands 内建命令
- 提供 `ctx.ui.select`、`ctx.ui.confirm`、`ctx.ui.input`、`ctx.ui.editor`、`ctx.ui.notify`

### RPC Runtime RPC 运行时

- 支持 `pi --mode rpc`
- 支持 SDK `runRpcMode(runtime)`
- 可作为外部应用驱动的后端运行时基础

### Provider / Model Abstraction 提供商与模型抽象

- 支持自定义 provider 提供商
- 支持动态模型发现

### Package System 包系统

- 支持 package 资源分发
- 可打包 extensions 扩展、skills 技能、prompts 提示模板、themes 主题

## Missing Features 缺失能力

Missing Features 缺失能力用于记录 Pi 官方明确没有内建的内容。

- 没有内建 `MCP support MCP 支持`
- 没有内建 `sub-agents 子代理`
- 没有内建 `plan mode 规划模式`
- 没有内建 `built-in to-dos 内建待办`
- 没有内建 `background bash 后台 Bash 执行`

## Planning Impact 对规划的影响

Planning Impact 对规划的影响用于帮助我们判断什么该复用，什么该自己做。

### Reuse as Foundation 作为基础设施复用

- session runtime 会话运行时
- interactive TUI 交互式终端界面基础
- RPC runtime RPC 运行时基础
- extension system 扩展系统
- prompt / skill / command 提示词技能命令系统
- provider abstraction 提供商抽象

### Build as Product 作为产品能力自建

- docs-native planning docs 原生规划
- loop product logic 循环产品逻辑
- task-progress control plane 任务进度控制平面
- agent-role-config 角色化代理配置
- interactive-workbench 交互工作台信息架构
- external integration workflow 外部集成工作流
- MCP bridge MCP 桥接层

## Related Docs 相关文档

- [Pi Capability Reuse PI 能力复用对照](../architecture/pi-capability-reuse)
- [MVP Features MVP 功能清单](../planning/mvp-features)
