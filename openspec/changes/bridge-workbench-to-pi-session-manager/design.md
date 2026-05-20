## Context

当前 `apps/oc-pi-cli` 已经有可运行的 `interactive-workbench 交互工作台`，但会话持久化仍由 `FileRuntimeSessionStore` 直接读写 `.oc-pi-cli/session.json`。这套实现是典型的 `snapshot 快照模型`：文件里只保存 `workbenchState 工作台状态` 与 `latestRun 最近运行记录`，没有 `sessionId 会话标识`、`sessionFile 会话文件`、`sessionName 会话名称`、`fork 分叉` 等顶层会话语义。

与此同时，仓库已经依赖 `@earendil-works/pi-coding-agent`，而 Pi 已提供成熟的 `SessionManager 会话管理器` 抽象：

- append-only `JSONL 行级 JSON` session file 会话文件
- `sessionId 会话标识`、`sessionFile 会话文件路径`、`sessionName 会话名称`
- `create 创建`、`open 打开`、`list 列表`、`continueRecent 继续最近会话`、`forkFrom 从指定会话分叉`
- `appendCustomEntry 自定义条目追加`，可用于扩展状态持久化

本 change 的关键目标，是让 `interactive-workbench 交互工作台` 的会话真源直接切到 Pi `SessionManager 会话管理器`，同时避免把当前 workbench 立刻重写成完全依赖 Pi 历史树重放的复杂模型。

## Goals / Non-Goals

**Goals:**
- 让 Pi `SessionManager 会话管理器` 成为 workbench session 的唯一真源。
- 把 `workbenchState 工作台状态` 与 `latestRun 最近运行记录` 存到 Pi session 的 `custom entry 自定义条目` 中。
- 支持 `/session-new`、`/session-list`、`/session-resume`、`/session-fork` 四个最小多会话命令。
- 保留“重启后恢复当前会话”的产品体验。
- 为旧 `.oc-pi-cli/session.json` 提供一次性迁移。

**Non-Goals:**
- 不在本次设计中复刻 Pi 原生 `/tree`、`/clone`、`/name` 等完整 interactive 命令集。
- 不在本次设计中做复杂 session picker、session 删除或 rename。
- 不让 workbench 直接依赖 Pi 的 message tree 作为唯一 UI 数据源；第一版仍然恢复最新快照。

## Decisions

### Decision 1: Pi SessionManager 作为唯一 session 真源

采纳方案：不再把 `.oc-pi-cli/session.json` 作为主会话文件，而是通过 Pi `SessionManager 会话管理器` 维护所有会话文件、sessionId、fork 与恢复能力。

理由：
- 这能让 workbench 从开发阶段起就对齐 Pi 的长期 session 语义，减少未来迁移成本。
- 避免出现“Pi session 一份、oc-pi 自己 session 一份”的双真源问题。

备选方案 A：继续维护我们自己的多 session JSON 文件系统。
- 不采纳原因：短期实现更轻，但会把未来迁移成本显著后移。

备选方案 B：同时保存 Pi session 与 sidecar workbench JSON。
- 不采纳原因：会产生双写与一致性问题，违背单真源原则。

### Decision 2: workbench 快照通过 custom entry 持久化，而不是完全依赖 session history 重建

采纳方案：定义固定 `customType`，例如 `oc-pi-workbench-state`，每次在稳定节点把 `workbenchState 工作台状态` 与 `latestRun 最近运行记录` 作为 Pi `custom entry 自定义条目` 追加保存；恢复时扫描最近一条条目并 hydrate。

理由：
- 直接复用 Pi `appendCustomEntry 自定义条目追加` 能力。
- 比“从每条历史消息重新构建完整 workbench state”更稳、更适合当前代码结构。

备选方案 A：把 workbench 状态放到独立 sidecar JSON 文件。
- 不采纳原因：会重新引入第二份会话真源。

备选方案 B：只根据 Pi message history 重放重建 workbench state。
- 不采纳原因：对当前 `WorkbenchState 工作台状态` 结构侵入过大，第一版改造成本高且风险大。

### Decision 3: 保留一个轻量 current-session pointer 当前会话指针文件

采纳方案：保留一个很小的 pointer 文件，例如 `.oc-pi-cli/current-session.json`，只记录当前激活的 Pi `sessionFile 会话文件路径`。

理由：
- workbench 需要明确知道“下次启动默认打开哪个会话”。
- pointer 不是第二份会话数据，只是默认入口索引。

备选方案：每次启动都依赖 `continueRecent` 自动推断当前会话。
- 不采纳原因：对 workbench 来说不够明确，也更难与 `resume` / `fork` 行为保持一致。

### Decision 4: `/session-*` 命令先做文本列表与切换，不做复杂 picker

采纳方案：第一版只做 `/session-new`、`/session-list`、`/session-resume`、`/session-fork` 的最小命令行为，先通过聊天时间线输出结果与可恢复 session 列表。

理由：
- 能快速交付多会话主价值。
- 避免把 session 选择 UI 问题和真源切换问题耦合在一起。

备选方案：第一版直接接入完整 session picker。
- 不采纳原因：实现复杂度更高，且当前 workbench 已经有较多输入与滚动交互需要稳定。

## Risks / Trade-offs

- [自定义条目写入过于频繁导致 session 文件膨胀] → 只在稳定节点持久化：用户提交完成、命令执行完成、AI 回复完成、session 切换前后。
- [旧 session 迁移遗漏导致工作台首次启动状态丢失] → 启动时优先执行一次性迁移逻辑，并在迁移后保留备份文件。
- [session list 读取成本过高] → 第一版只列当前 cwd 相关 sessions，不扫全局全部会话。
- [resume/fork 切换后 UI 残留旧状态] → 在 `workbench/index.ts` 中把 session 切换定义为替换当前 `state`、`latestRun`、session metadata 的原子操作。
- [当前帮助文案与 docs 主流程命令认知冲突] → 在帮助文案与 planning 文档中明确区分 `/docs-*` 与 `/session-*`。

## Compatibility

- 对现有 `interactive-workbench 交互工作台` 的聊天、slash command、右侧信息区布局保持兼容，只替换 session 真源与增加 `/session-*` 能力。
- 对现有旧 `.oc-pi-cli/session.json` 提供一次性迁移，不要求用户手动导入。
- 对现有 `goal-to-docs 目标到文档`、`review-loop 审查循环` 不改领域行为，只改变它们所依附的 workbench session 持久化路径。

## Migration Plan

1. 新增 Pi session bridge 适配层，定义 `oc-pi-workbench-state` 自定义条目结构与 current-session pointer。
2. 启动时检测旧 `.oc-pi-cli/session.json` 是否存在；若存在且尚无 current session pointer，则创建新的 Pi session 并把旧快照迁入最新 custom entry。
3. 将 `workbench/index.ts` 与相关 CLI 入口切换为从 Pi session bridge 读取和保存状态。
4. 接入 `/session-new`、`/session-list`、`/session-resume`、`/session-fork`。
5. 更新 workbench 顶部状态、帮助文案与 planning 文档，暴露当前 session 信息与多会话语义。

预期验证命令：
- `bun run types:check`（`apps/oc-pi-cli`）
- `bun run src/index.ts workbench`
- 手动验证：旧 session 自动迁移、session new/list/resume/fork、重启后恢复到当前 session

## Open Questions

- `/session-resume` 第一版是否需要支持 inline 参数，例如 `/session-resume <id>`，还是先只输出列表并在后续补交互选择？
- current-session pointer 是否存 `sessionFile 会话文件路径` 即可，还是同时记录 `sessionId 会话标识` 以便诊断与恢复？
