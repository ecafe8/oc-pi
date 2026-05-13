---
title: Docs Structure and Output Spec 文档结构与输出规范
description: 定义当前产品阶段的基础文档目录结构、文档类型分层与默认输出规范
---

# Docs Structure and Output Spec 文档结构与输出规范

Docs Structure and Output Spec 文档结构与输出规范用于为当前 `apps/oc-pi-cli` 产品阶段建立一份统一的文档目录真源，使 `goal-to-docs 目标到文档`、`artifact-routing 产物路由`、`project-bootstrap 项目初始化`、`interactive-workbench 交互工作台` 在讨论“文档该写到哪里”时使用同一套基础规则。

## Goal 目标

- 定义当前阶段推荐采用的基础文档目录结构
- 定义不同文档类型应该落在哪个目录层级
- 定义文档输出时的默认文件粒度与命名原则
- 为 `output-target-slots 输出槽位协议` 提供更高一层的目录真源

## Scope 边界

### In Scope 纳入范围

- 当前产品仓库中的规划文档结构
- 当前产品阶段的默认文档输出规范
- 默认目录、默认文件粒度、默认命名语义

### Out of Scope 非范围

- 未来用户项目生成后的完整文档系统
- 业务内容模板细节
- 非文档产物，例如代码目录和 provider 配置目录

## Base Docs Tree 基础文档树

Base Docs Tree 基础文档树用于定义当前阶段产品文档的推荐主结构。

```text
apps/web-docs/content/docs/
  index.mdx
  product/
  capabilities/
  architecture/
  planning/
  tasks/
  references/
  protocols/       # 待创建：横切性文档规范
  archive/
```

## Directory Roles 目录职责

Directory Roles 目录职责用于固定每个目录的主要语义，避免文档放置漂移。

### product 产品目录

- 承载产品愿景、路线图、里程碑、全局状态
- 用于回答“产品要去哪里、当前在哪”

### capabilities 能力目录

- 承载一级能力地图与能力边界
- 用于回答“产品需要具备哪些能力域”

### architecture 架构目录

- 承载系统结构、运行时模型、模块边界、生成项目草案
- 用于回答“系统如何组织与如何运行”

### planning 规划目录

- 承载 feature 功能规划、协议草案、阶段框架、规则说明
- 用于回答“接下来如何实现与如何约束输出”

### tasks 任务目录

- 承载 backlog 待办池、in-progress 进行中、next-up 下一步 和具体开发任务
- 用于回答“当前做什么、后面做什么”

推荐子结构：

```text
tasks/
  backlog.md
  in-progress.md
  next-up.md
  dev-tasks/
```

### references 参考目录

- 承载外部资料沉淀、Pi 研究笔记、结构对照记录
- 用于回答“这个设计参考了什么外部事实”

### protocols 协议目录

- 承载横切性的文档规范、写作规则、输出标准
- 用于回答“所有文档共同遵循什么规则”

### archive 归档目录

- 承载已废弃、已迁移或当前不再作为真源的内容
- 用于避免历史内容污染当前真源结构

## Document Classes 文档类别

Document Classes 文档类别用于把当前文档进一步分成几类稳定角色。

- `source-of-truth 真源文档`: 当前实现与规划必须遵循的稳定规则
- `working-draft 工作草案`: 仍在快速演进，但已具方向价值
- `task-doc 任务文档`: 面向执行和验收
- `reference-note 参考笔记`: 用于保留背景，不直接驱动实现
- `archived-doc 已归档文档`: 仅保留历史上下文

## Default Output Rules 默认输出规则

Default Output Rules 默认输出规则用于定义文档输出时默认如何落点。

### Rule 1 一类信息优先落一类目录

- 产品目标与状态优先进入 `product/`
- 能力定义优先进入 `capabilities/`
- 架构与模块边界优先进入 `architecture/`
- 功能协议与开发框架优先进入 `planning/`
- 执行任务与进度优先进入 `tasks/`
- 外部资料沉淀优先进入 `references/`

### Rule 2 单页真源优先

- 如果某类信息已经有稳定真源文档，应优先更新该文档
- 不要为同一语义不断生成平行新文件

### Rule 3 新文件要有明确角色

- 新建文档前必须能回答“它是 product、planning、task 还是 reference”
- 如果回答不清楚，优先更新现有文档而不是新增新页

### Rule 4 任务文档允许更细粒度

- `tasks/` 下可以出现具体开发任务页
- 但这些任务页必须回指对应的高层规划或协议文档

### Rule 6 任务文档需要顺序前缀

- `tasks/dev-tasks/` 下的任务型文档文件名应使用数字前缀，例如 `00-runtime-type-skeleton.md`
- 数字前缀用于按执行顺序浏览，而不是表示永久优先级
- 如果后续任务需要插队，应优先保留整体顺序可读性，而不是强行维持严格连续编号

### Rule 5 草案与真源分开

- `generated-project-spec 生成项目规格草案` 一类内容应明确为草案
- 不应冒充当前实现真源

## Suggested File Granularity 建议文件粒度

Suggested File Granularity 建议文件粒度用于回答“什么时候更新现有文件，什么时候新开文件”。

- 如果只是在补充某个已存在协议的字段、规则、示例，优先更新原文件
- 如果是一个新的跨模块主题，例如“开发计划框架”，可以新开独立文件
- 如果是某个具体执行任务，应放到 `tasks/` 下独立成页
- 如果只是外部调研记录，应放到 `references/` 下而不是 `planning/`

## Default Naming Rule 默认命名规则

Default Naming Rule 默认命名规则用于让文档文件名保持可预测。

- 文件名使用 kebab-case
- 文件名优先体现主题而不是动作
- 如果是任务文档，可使用 `dev-task-*` 前缀
- `tasks/dev-tasks/` 下的任务文档应优先使用 `NN-topic-name.md` 形式
- 如果是规则文档，可使用 `*-rules` 或 `*-spec` 后缀
- 如果是框架性文档，可使用 `*-framework`

## Mapping to Output Targets 与输出槽位的映射

Mapping to Output Targets 与输出槽位的映射用于说明目录规范和槽位协议的关系。

```text
product-goal 产品目标槽位
  -> product/

capability-map 能力地图槽位
  -> capabilities/

feature-plan 功能规划槽位
  -> planning/

mvp-scope MVP 范围槽位
  -> planning/ 或 product/

next-summary 下一步摘要槽位
  -> tasks/

review-notes 审查记录槽位
  -> tasks/ 或后续 review 专用目录

progress-status 进度状态槽位
  -> product/ 或 tasks/

implementation-code 实现代码槽位
  -> 不在本文档范围（代码产物，参见 artifact-routing-rules）
```

## Current Default Docs Outputs 当前默认文档输出

Current Default Docs Outputs 当前默认文档输出用于给出当前阶段推荐的默认落点。

| Output Target 输出槽位 | Default Directory 默认目录 | Current Default File 当前默认文件 |
|---|---|---|
| `product-goal 产品目标槽位` | `product/` | `product/vision.md` |
| `capability-map 能力地图槽位` | `capabilities/` | `capabilities/overview.mdx` |
| `feature-plan 功能规划槽位` | `planning/` | `planning/mvp-features.md` |
| `mvp-scope MVP 范围槽位` | `planning/` | `planning/mvp-features.md`（当前与 `feature-plan 功能规划槽位` 共用文件，按段落分区） |
| `next-summary 下一步摘要槽位` | `tasks/` | `tasks/next-up.md` |
| `review-notes 审查记录槽位` | `tasks/` | `tasks/review-notes.md` |
| `progress-status 进度状态槽位` | `product/` | `product/global-status.md` |
| `implementation-code 实现代码槽位` | `apps/oc-pi-cli/` | `apps/oc-pi-cli/src` |

## Relation to Other Docs 与其他文档的关系

- `output-target-slots 输出槽位协议` 定义逻辑槽位与默认映射
- 本文档定义这些映射背后的目录结构总规则
- `artifact-routing 产物路由规则` 消费槽位与目录规范来完成写入决策
- `project-bootstrap 项目初始化草案` 需要预置与本文档一致的默认文档骨架

## First Version Constraints 第一版约束

- 第一版不追求一次定义未来用户项目的完整文档系统
- 第一版文档规范只服务当前产品仓库与 MVP 开发过程
- 第一版允许 `review-notes 审查记录槽位` 继续临时落在 `tasks/review-notes.md`，后续再评估是否独立目录

## Open Questions 待定问题

- `review-notes 审查记录槽位` 是否应尽快独立成 `reviews/` 目录
- `mvp-scope MVP 范围槽位` 是否应从 `planning/mvp-features.md` 拆成独立文件
- `progress-status 进度状态槽位` 最终应以 `product/` 还是 `tasks/` 为主

## Related Docs 相关文档

- [Output Target Slots 输出槽位协议](./output-target-slots)
- [Artifact Routing Rules 产物路由规则](./artifact-routing-rules)
- [Project Bootstrap 项目初始化草案](./project-bootstrap)
- [Generated Project Spec 生成项目规格草案](../architecture/generated-project-spec)
- [Docs Writing Rule 文档编写规则](../protocols/docs-writing-rule)
