# oc-pi

`oc-pi` 是一个基于 Bun workspaces + Turborepo 的 monorepo，当前主要包含两个核心应用：

- `apps/oc-pi-cli`：产品主运行时，负责 CLI、goal-to-docs、review-loop、workbench 等能力实现。
- `apps/web-docs`：当前产品规划与文档控制平面，用来组织 `apps/oc-pi-cli` 的愿景、能力、架构和任务，不是最终用户项目模板。

## Requirements

- Node `>=22.18.0`
- Bun `>=1.3.4`

## Install

```bash
bun install
```

## Workspace Commands

根目录只提供这几个聚合脚本：

```bash
bun run dev
bun run build
bun run lint
```

这个仓库没有根级 `test` 脚本；需要按应用执行针对性的校验命令。

## Main Apps

### `apps/oc-pi-cli`

CLI 入口在 `apps/oc-pi-cli/src/index.ts`。

常用命令：

```bash
bun --filter oc-pi-cli run dev
bun --filter oc-pi-cli run types:check
```

当前 CLI 支持的主要命令族包括：

- `auth`
- `prompt`
- `goal`
- `status`
- `review`

其中：

- `goal new <目标>` 是 preview 模式，只预览目标路径，不写文件；解析路径指向 `tests/sandbox`
- `goal new --write-sandbox <目标>` 会把产物真实写入 `tests/sandbox/web-docs/content/...`，用于验证完整写盘流程但不触碰真实 docs
- `goal new --write-docs <目标>` 才会把真实文档写入 `apps/web-docs/content/docs/...`
- `--write-sandbox` 与 `--write-docs` 不能同时使用
- 真实写入路径会被 `apps/oc-pi-cli/src/runtime/paths.ts` 限制在 `apps/web-docs` 内
- 只有真实 `--write-docs` 会持久化 `.oc-pi-cli/session.json`；preview 与 sandbox write 不会写 runtime session

示例：

```bash
bun run src/index.ts goal new "两阶段 preview 仅预览路径"
bun run src/index.ts goal new --write-sandbox "两阶段写入 sandbox 验证完整流程"
bun run src/index.ts goal new --write-docs "两阶段真实写入 docs"
```

### `apps/web-docs`

`apps/web-docs` 是 Next.js 16 + Fumadocs 应用，文档内容真源在 `apps/web-docs/content/docs`。

常用命令：

```bash
bun --filter web-docs run dev
bun --filter web-docs run lint
bun --filter web-docs run types:check
bun --filter web-docs run build
```

补充说明：

- 开发服务端口固定为 `4124`
- Fumadocs 内容目录在 `apps/web-docs/source.config.ts` 中硬编码为 `content/docs`
- 首页仅做 `/docs` 重定向
- `apps/web-docs/.source/` 为生成目录，不应手动编辑

## Docs Control Plane

当前项目文档集中在 `apps/web-docs/content/docs`，用于收敛 `apps/oc-pi-cli` 的产品目标和实现路线。

目录角色以 `apps/web-docs/content/docs/planning/docs-structure-and-output-spec.md` 为准：

- `product/`：愿景、路线图、里程碑、全局状态
- `capabilities/`：能力地图与边界
- `architecture/`：运行时模型、系统结构、模块边界
- `planning/`：规则、协议、功能规划
- `tasks/`：backlog、in-progress、next-up、执行任务
- `references/`：外部参考，不直接驱动实现
- `protocols/`：横切文档规则
- `archive/`：历史上下文

新增文档前，优先更新现有真源页，而不是平行创建新文件。

## Docs Writing Rules

对 `apps/web-docs/content` 下文档，当前仓库要求：

- 第一次出现的英文术语必须附带中文解释
- 关系名称使用 `English + 中文语义`
- 字段名称附带中文定义
- 技术术语标题所在章节的第一句先用中文解释
- `foundation` 或 `product` 层文档不要留下未解释的纯英文术语

规范真源文件：`apps/web-docs/content/docs/protocols/docs-writing-rule.md`

## Verification Guidance

如果改动的是：

- CLI 运行时：至少执行 `bun --filter oc-pi-cli run types:check`
- 文档站或文档内容：至少执行 `bun --filter web-docs run lint`，必要时再跑 `bun --filter web-docs run types:check`
- 跨应用改动：按影响范围分别验证，不要假设根命令会覆盖全部问题
