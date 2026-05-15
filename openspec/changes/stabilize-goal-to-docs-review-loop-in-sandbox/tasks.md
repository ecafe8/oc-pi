## 1. Writer prompt 稳定化

- [ ] 1.1 在 `apps/oc-pi-cli/src/planning/goal-to-docs/run-mvp.ts` 中收紧 Stage 2 `capability-breakdown` 的 writer prompt，明确禁止模板外前言、解释、分析过程、总结与问答式输出，并要求从文档首行直接开始返回最终内容。
- [ ] 1.2 在 `apps/oc-pi-cli/src/planning/goal-to-docs/run-mvp.ts` 中收紧 Stage 3 `feature-planning` 的 writer prompt，降低 `planning/mvp-features.md` 漂移成总结/建议页的概率。
- [ ] 1.3 在 `apps/oc-pi-cli/src/planning/goal-to-docs/run-mvp.ts` 中收紧 Stage 4 `handoff-summary` 与 `handoff-next-up` 的 writer prompt，确保两类页面继续保持对称但不混写的 closing 角色。

## 2. Reviewer prompt 稳定化

- [ ] 2.1 调整 Stage 2 `capability-breakdown` 与 Stage 3 `feature-planning` 的 reviewer prompt，使其与当前 Stage 4 一样优先依据固定 front matter、固定 H1、必需章节与页面职责做判定。
- [ ] 2.2 明确 Stage 2/3 reviewer 不得仅因“内容还可以更丰富”就对结构正确的简洁文档返回 `changes-requested`；Stage 4 继续保持当前已实现的同类容错规则。
- [ ] 2.3 保留对模板外输出、章节缺失、角色漂移与错误文风的拒绝路径，避免容错提升后丢失边界检查。

## 3. 最小规则与失败样式对齐

- [ ] 3.1 视需要微调 Stage 2/3/4 的 normalize / validate 文案或最小规则，使其与新的 writer / reviewer 约束一致。
- [ ] 3.2 基于当前已存在的 `validateArtifactDocument` 结构校验与 reviewer 分支，为 `capabilities/overview.mdx`、`planning/mvp-features.md`、`tasks/handoff-summary.md`、`tasks/handoff-next-up.md` 明确失败样式，至少覆盖模板外说明、总结式漂移、页面职责互混与结构缺项，并仅在必要时补充代码约束。

## 4. 样本与验证边界

- [ ] 4.1 选定至少一条稳定目标样本，用于 preview 验证 Stage 2/3/4 在当前 prompt 约束下可稳定通过。
- [ ] 4.2 选定至少一条稳定目标样本，用于 `bun run src/index.ts goal new --write-sandbox "<goal>"` 验证 sandbox 产物结构与 reviewer 结果。
- [ ] 4.3 选定至少一条失败样本或观察到的失败风格，用于验证模板外输出/角色漂移仍会被结构校验或 review loop 拦截。
- [ ] 4.4 将本 change 的完成标准明确限制为 preview 与 `--write-sandbox`，不再把 `--write-docs` 作为必做验证项。

## 5. 结果确认

- [ ] 5.1 执行 `bun run types:check`，确认稳定化改动后的类型检查通过。
- [ ] 5.2 执行至少一次 preview：`bun run src/index.ts goal new "<goal>"`，确认 Stage 2/3/4 的接受路径比改动前更稳定。
- [ ] 5.3 执行至少一次 `--write-sandbox`：`bun run src/index.ts goal new --write-sandbox "<goal>"`，确认 sandbox 产物可被保留用于检查，且不会影响真实 docs。
- [ ] 5.4 在本 change 目录下新增 `validation-notes.md` 或等价实现说明，记录稳定样本与失败样本的观察结果，并引用 `goal-to-docs.md`、`output-target-slots.md`、`docs-structure-and-output-spec.md` 与当前 Stage 2/3/4 目标页面，确保本 change 与既有协议一致。
