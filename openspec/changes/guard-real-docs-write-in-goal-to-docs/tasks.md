## 1. 原文读取与条件确认机制

- [x] 1.1 为 `goal new --write-docs` 增加真实目标路径与阶段/槽位摘要输出，并在写入前读取当前目标页面原文。
- [x] 1.2 设计并实现 human confirmation 机制，仅在检测到 `warning` 或 `blocking` 级别语义冲突时触发；无冲突时允许直接真实写入。

## 2. 真实 docs 语义边界校验

- [x] 2.1 为 `apps/web-docs/content/docs/product/vision.md` 增加最小语义边界校验，结合原文、当前 goal 与候选文档，阻止把当前产品改写成明显不同的新产品方向。
- [x] 2.2 为 `apps/web-docs/content/docs/capabilities/overview.mdx` 增加最小语义边界校验，结合原文、当前 goal 与候选文档，确保其继续保持一级能力地图页面职责。
- [x] 2.3 为 `apps/web-docs/content/docs/planning/mvp-features.md` 增加最小语义边界校验，结合原文、当前 goal 与候选文档，确保其继续承载 `feature-plan 功能规划槽位` 与 `mvp-scope MVP 范围槽位` 的共享文档职责。

## 3. 基于真源更新的真实写入模式

- [x] 3.1 在 `--write-docs` 模式下，让 writer prompt 读取目标页面当前真源内容，并明确要求基于现有页面更新，而不是整页重写。
- [x] 3.2 保持 preview / `--write-sandbox` 模式不受此限制，以便继续用于调试失败样本。

## 4. 失败阻断与调试边界

- [x] 4.1 当真实 docs 模式的结构校验失败，或语义冲突达到 `blocking` 等级时，阻止真实写入并返回清晰的失败原因。
- [x] 4.2 当真实 docs 模式的语义冲突达到 `warning` 等级时，触发 human confirmation，并向用户展示原文摘要、候选摘要与冲突点。
- [x] 4.3 当 preview / `--write-sandbox` 的候选失败时，允许继续保留调试产物，但不得影响真实 docs 真源。

## 5. 验证与协议对齐

- [x] 5.1 执行 `bun run types:check`，确认写入保护层改动后的类型检查通过。
- [x] 5.2 执行一次无语义冲突的 `bun run src/index.ts goal new --write-docs "<goal>"`，确认系统可在不触发 human confirmation 的情况下完成真实写入。
- [x] 5.3 执行一次语义越界样本验证，确认真实 docs 模式会触发 human confirmation 或拒绝该候选写入。
- [x] 5.4 执行一次 preview 或 `--write-sandbox` 验证，确认失败样本仍可被观察而不污染真实 docs。
- [x] 5.5 对照并在实现说明中引用以下文档，确保行为与规划协议一致：`goal-to-docs.md`、`output-target-slots.md`、`docs-structure-and-output-spec.md`、`product/vision.md`、`capabilities/overview.mdx`、`planning/mvp-features.md`。
