## Validation Notes

### Scope

本次 change 的验证边界只覆盖 preview 与 `--write-sandbox`，不把 `--write-docs` 作为完成条件。这与 `proposal.md`、`design.md` 和 `specs/goal-to-docs-review-loop-stability/spec.md` 中定义的范围一致。

### Referenced Protocols

- `apps/web-docs/content/docs/planning/goal-to-docs.md`
- `apps/web-docs/content/docs/planning/output-target-slots.md`
- `apps/web-docs/content/docs/planning/docs-structure-and-output-spec.md`
- 当前目标页面：
  - `apps/web-docs/content/docs/capabilities/overview.mdx`
  - `apps/web-docs/content/docs/planning/mvp-features.md`
  - `apps/web-docs/content/docs/tasks/handoff-summary.md`
  - `apps/web-docs/content/docs/tasks/handoff-next-up.md`

### Code Changes Under Validation

- 在 `apps/oc-pi-cli/src/planning/goal-to-docs/run-mvp.ts` 中保留并继续使用 Stage 2/3/4 的“从第一行 `---` 开始、禁止模板外说明”的 writer prompt。
- 为 Stage 2 `capability-breakdown` 与 Stage 3 `feature-planning` reviewer prompt 增加“结构正确但内容简洁也可 accepted”的规则，并明确总结/复盘/模板外说明应被拒绝。
- 为四个固定目标页面补充“文档必须从 front matter 起始”的结构校验，减少模型在模板前插入说明文字时被 normalize 掩盖的问题。

### Stable Sample

#### Preview sample

Command:

```bash
bun run src/index.ts goal new "稳定 goal-to-docs 四阶段闭环，让 capability map、mvp features、handoff summary 与 handoff next up 在 preview 下更稳定地通过固定模板审查"
```

Observed result:

- Stage 1 `goal-framing`: `accepted`
- Stage 2 `capability-breakdown`: `accepted`
- Stage 3 `feature-planning`: `accepted`
- Stage 4 `handoff-summary`: `accepted`
- 该样本证明在 preview 模式下，Stage 2/3/4 可以稳定产出固定结构并通过 reviewer。

#### Sandbox sample

Command:

```bash
bun run src/index.ts goal new --write-sandbox "稳定 goal-to-docs 四阶段闭环，让 capability map、mvp features、handoff summary 与 handoff next up 在 sandbox 下更稳定地通过固定模板审查"
```

Observed result:

- Stage 1 `goal-framing`: `accepted`, `wroteArtifact: true`
- Stage 2 `capability-breakdown`: `accepted`, `wroteArtifact: true`
- Stage 3 `feature-planning`: `accepted`, `wroteArtifact: true`
- Stage 4 `handoff-summary` + `handoff-next-up`: `accepted`, `wroteArtifact: true`
- 产物已写入 `tests/sandbox/web-docs/content/docs/...`，包括：
  - `capabilities/overview.mdx`
  - `planning/mvp-features.md`
  - `tasks/handoff-summary.md`
  - `tasks/handoff-next-up.md`
- 该样本证明 sandbox 写入仍只落到 `tests/sandbox`，不会污染真实 docs。

### Unstable / Adversarial Sample

Command:

```bash
bun run src/index.ts goal new "请把这一轮产物写成总结和建议清单，并在文档开头先解释你的分析过程，再给出 capability map 与 mvp features"
```

Observed result:

- Stage 1 `goal-framing`: `accepted`
- Stage 2 `capability-breakdown`: `changes-requested`
- 流程在 Stage 2 停止，未继续进入 Stage 3/4
- 该样本说明当前约束仍然会把“总结/建议清单/分析过程优先”的输出风格拦在 Stage 2，而不会因为 reviewer 容错提升就放行错误文风。

### Type Check

Command:

```bash
bun run types:check
```

Workdir:

```text
apps/oc-pi-cli
```

Observed result:

- `tsc --noEmit` 通过。

### Notes

- 根目录不存在 `types:check` script，因此本次按仓库约定改为执行 `apps/oc-pi-cli/package.json` 中定义的 focused check。
- 当前验证仍然是人工回归，不是自动化测试基建；这符合本 change 的 non-goal。
