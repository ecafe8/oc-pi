## Context

当前 `apps/oc-pi-cli` 的 `goal-to-docs 目标到文档` 已经支持三阶段执行：`goal-framing 目标定型 -> capability-breakdown 能力拆解 -> feature-planning 功能规划`。preview 与 `--write-sandbox` 已经足以验证运行时闭环、共享路径语义、工作台状态与 CLI 输出。但真实 `--write-docs` 仍存在高风险：模型生成的文档即使满足 front matter、H1 与固定章节，也可能把页面语义整体改写到一个当前产品不存在的方向，例如把 `apps/oc-pi-cli` 重写成另一个面向状态观察或设备写入验证的工具。这种错误一旦写入 `apps/web-docs/content/docs` 真源，就会直接污染后续阶段输入。

这表明现有保护层还停留在“路径安全”和“基础结构安全”，尚未覆盖“真实文档语义安全”。在继续推进 `handoff-summary 交接摘要` 之前，需要先为真实 docs 写入增加更严格的治理策略：
- 读取原文并判断候选内容是否与原文/当前目标冲突
- 只在存在明显冲突时触发 human confirmation
- 校验候选内容是否仍在当前产品边界内
- 在真实 docs 模式下优先以现有真源文档为基线增量更新，而不是整页重写

相关文档引用：
- `apps/web-docs/content/docs/planning/goal-to-docs.md`
- `apps/web-docs/content/docs/planning/output-target-slots.md`
- `apps/web-docs/content/docs/planning/docs-structure-and-output-spec.md`
- `apps/web-docs/content/docs/product/vision.md`
- `apps/web-docs/content/docs/capabilities/overview.mdx`
- `apps/web-docs/content/docs/planning/mvp-features.md`

## Goals / Non-Goals

**Goals:**
- 让真实 `--write-docs` 进入“受控写入”模式，而不是模型生成后立即覆盖真源。
- 为 `product/vision.md`、`capabilities/overview.mdx`、`planning/mvp-features.md` 增加最小语义边界校验。
- 让真实 docs 模式优先消费现有真源文档内容，在原结构和产品定位基础上更新，而不是整页重写。
- 保持 preview / `--write-sandbox` 继续作为无确认的安全验证路径。

**Non-Goals:**
- 不改变当前三阶段执行顺序。
- 不把所有 docs 页面都纳入第一版语义校验。
- 不引入复杂的人工审批后端或多用户协作审批流程。

## Decisions

### Decision 1: `--write-docs` 改为“冲突时确认”的受控写入，而不是即时覆盖

采纳方案：当用户执行 `goal new --write-docs` 时，系统 MUST 先展示：
- 将要写入的真实目标路径
- 每个阶段的逻辑槽位与解析路径
- 候选文档摘要或结构摘要

之后系统 MUST 读取当前真源文档，并将“原文 + 候选内容 + 当前 goal”一起送入语义冲突检测：
- 若无明显冲突，可直接继续真实写入
- 若存在 `warning` 或 `blocking` 级别冲突，必须通过 human confirmation 后才允许真正覆盖 `apps/web-docs` 真源

理由：
- 当前最大的风险不是路径误判，而是语义正确性；但并非每次真实写入都需要打断，只有和原文/当前目标冲突时才需要人工兜底。

备选方案 A：保持当前 `--write-docs` 直接写入。
- 不采纳原因：已经被实际验证证明会污染真源文档。

### Decision 2: 真实 docs 第一版语义冲突检测采用“原文 + 当前目标 + 候选文档”三方比对，而不是只看候选文档

采纳方案：第一版语义边界校验采取可编程、可解释的硬规则，并同时比对：
- 当前真源文档
- 当前用户 goal
- 新候选文档

规则包括：
- 必需词/结构锚点
- 禁止的明显漂移方向
- 文档类型与当前页面职责一致性

例如：
- `product/vision.md` 必须继续围绕 `goal-to-docs`、`review-loop`、`interactive-workbench`、`agent-role-config` 等当前产品主线展开
- `capabilities/overview.mdx` 必须保持“一级能力地图”语义，不得改写成别的产品系统介绍
- `planning/mvp-features.md` 必须保持 feature list + mvp scope 共享文档职责

理由：
- 仅看候选文档会误伤某些合法更新；加入原文与当前 goal 后，才能判断它究竟是在“更新同一目标”，还是“改写成另一目标”。

### Decision 3: 真实 docs 模式优先采用“基于真源更新”的 prompt，而不是“从头生成整页”

采纳方案：在 `--write-docs` 模式下，writer prompt MUST 包含当前真源文档正文，并明确要求：
- 基于现有页面更新
- 保留页面类型与主要章节结构
- 只在当前产品边界内补充当前阶段需要增加的信息
- 不得把页面改写为其他产品定位

preview 与 `--write-sandbox` 可继续使用更自由的生成模式，因为它们不直接污染真源。

理由：
- 真源页面已经承载当前产品共识，增量更新比整页重写更稳定。

### Decision 4: 语义冲突分级决定是否需要 human confirmation

采纳方案：
- `--write-docs` 模式下，若结构校验失败，系统 MUST 阻止真实写入
- `--write-docs` 模式下，若语义冲突检测为：
  - `none`: 可直接真实写入
  - `warning`: MUST 先请求 human confirmation
  - `blocking`: MUST 默认阻止真实写入，只有 human 明确强制覆盖时才允许继续
- preview / `--write-sandbox` 模式下，同样的失败可以继续作为调试结果返回，不必阻止 sandbox 写入

理由：
- sandbox 的价值正是帮助我们观察失败样本；真实 docs 的要求则是“宁可不写，也不要写坏”

## Risks / Trade-offs

- [冲突检测可能出现误报] → 第一版先覆盖核心真源页，并让 `warning` 级别通过 human confirmation 兜底。
- [硬规则语义校验可能过于保守] → 第一版先拦住明显越界，后续再根据误报情况细化。
- [基于真源更新可能限制模型自由发挥] → 这是预期目标，真实 docs 模式本就不应鼓励整页漂移。

## Compatibility

- 对 preview / `--write-sandbox` 用户兼容：行为不变
- 对 `--write-docs` 用户不完全兼容：新增确认与校验步骤，但这属于有意的安全升级
- 对现有 docs 真源兼容：本 change 以保护这些真源不被漂移覆盖为目标

## Migration Plan

1. 先在真实 docs 路径上接入原文读取、候选摘要输出与冲突检测结果展示。
2. 为三类核心文档实现最小语义边界校验。
3. 让 `--write-docs` 的 writer prompt 消费现有真源文档内容。
4. 接入 human confirmation，只在 `warning` / `blocking` 级别冲突时触发。
5. 验证 preview / sandbox 仍可继续自由调试，而真实 docs 只在无冲突或已确认时写入。

预期验证命令：
- `bun run types:check`
- `bun run src/index.ts goal new --write-docs "<goal>"`
- `bun run src/index.ts goal new --write-sandbox "<goal>"`

## Open Questions

- 第一版 human confirmation 是用额外 flag（如 `--confirm`）还是运行时交互确认更合适？
- 语义边界校验是否需要单独输出“为什么判为越界”的结构化 findings，供用户决定是否强制覆盖？
- 后续是否需要把“真实 docs 更新”和“sandbox 草案生成”拆成两个明确命令，而不是继续复用 `goal new`？
