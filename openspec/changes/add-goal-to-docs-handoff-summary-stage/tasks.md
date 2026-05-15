## 1. Stage 4 接入

- [ ] 1.1 在 `apps/oc-pi-cli/src/runtime/default-config.ts` 中新增 `handoff-summary`、`handoff-next-up` 两个 slot，并将 Stage 4 的 `primaryOutputSlot` 设为 `handoff-summary`、`additionalOutputSlots` 设为 `['handoff-next-up']`。
- [ ] 1.2 在 `apps/oc-pi-cli/src/runtime/default-config.ts` 中把 `handoff-summary.inputArtifacts` 补齐为 `product-goal`、`capability-map`、`feature-plan`、`mvp-scope`，并移除 Stage 4 对 `next-summary` 的直接依赖。
- [ ] 1.3 在 `apps/oc-pi-cli/src/planning/goal-to-docs/run-mvp.ts` 中把 `handoff-summary` 接到前三阶段全部 `accepted` 之后的执行链路中，并同时生成 `handoff-summary` 与 `handoff-next-up` 两类输出。

## 2. 文档生成与审查规则

- [ ] 2.1 为 `handoff-summary` 增加固定模板 prompt、front matter 规范化与固定 H1/章节结构定义。
- [ ] 2.2 为 `handoff-next-up` 增加固定模板、生成规则与与 `handoff-summary` 对称的命名/路径约定。
- [ ] 2.3 为 `handoff-summary` 与 `handoff-next-up` 增加结构校验与 reviewer prompt，确保缺少固定结构时进入 `changes-requested` 或阻止真实写入。
- [ ] 2.4 将 Stage 4 的双输出槽位、目标路径与审查结果接入 CLI 输出与 workbench 展示。

## 3. 真实写入防护集成

- [ ] 3.1 在真实 docs 模式下让 `handoff-summary` 与 `handoff-next-up` 的 writer prompt 分别读取当前真源内容并基于现有页面更新。
- [ ] 3.2 为 `tasks/handoff-summary.md` 与 `tasks/handoff-next-up.md` 明确定义最小语义锚点规则，至少覆盖固定 front matter、固定 H1、必需章节名与页面职责关键词。
- [ ] 3.3 将上述锚点规则接入现有 source-aware write guard，使 Stage 4 页面在漂移为其他文档类型时触发 `warning` 或 `blocking`。
- [ ] 3.4 明确 `apps/web-docs/content/docs/tasks/next-up.md` 的兼容策略，并在实现中保证它不再作为 Stage 4 的 source of truth 或真实输出目标页。

## 4. 验证与对齐

- [ ] 4.1 执行 `bun run types:check`，确认第四阶段接入后类型检查通过。
- [ ] 4.2 执行一次 preview：`bun run src/index.ts goal new "<goal>"`，确认第四阶段可运行并出现在 CLI 返回结果中。
- [ ] 4.3 执行一次 `--write-sandbox`：`bun run src/index.ts goal new --write-sandbox "<goal>"`，确认 `tasks/handoff-summary.md` 与 `tasks/handoff-next-up.md` sandbox 产物可写入且不影响真实 docs。
- [ ] 4.4 执行一次 `--write-docs` 样本，确认 Stage 4 走 source-aware write guard，必要时触发 human confirmation。
- [ ] 4.5 若验证过程中改动真实 docs 页面，验证完成后恢复 `apps/web-docs/content/docs/tasks/handoff-summary.md`、`apps/web-docs/content/docs/tasks/handoff-next-up.md` 及其他受影响真源页的正确语义。
