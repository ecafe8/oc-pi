## Context

当前 `goal-to-docs 目标到文档` 的四阶段闭环已经可运行，但验证结果仍然表现出明显的稳定性问题，尤其集中在 Stage 2 `capability-breakdown`、Stage 3 `feature-planning` 与 Stage 4 `handoff-summary` / `handoff-next-up`。常见失败模式不是产品逻辑错误，而是生成/审查链路本身对模型输出过于敏感：
- writer 在固定模板外增加前言、分析过程、总结或编号建议，导致结构校验失败
- reviewer 对“结构正确但内容简洁”的文档仍然给出 `changes-requested`
- 同一条目标在 preview 与 sandbox 中成功率波动较大，难以作为稳定回归基线

在上一个 change 中，真实 docs 写入 guard 已经建立为安全基线。当前最合理的下一步不是继续扩大真实写入测试，而是先把 preview 与 `--write-sandbox` 的文档生成稳定性做实，减少由 prompt / reviewer 波动造成的误拒。

这里的 Stage 4 需要特别说明：`handoff-summary` 是第四阶段的 primary artifact，而 `handoff-next-up` 不是独立 stage，而是通过同一次 `executeStage` 调用内的 `additionalArtifacts 附加产物` 流程生成的附属输出。因此本 change 虽然同时覆盖两者，但实现路径并不是“再新增一个 Stage 5”，而是在 Stage 4 内分别收紧 primary 与 additional artifact 的 prompt / review 行为。

## Goals / Non-Goals

**Goals:**
- 降低 Stage 2/3/4 在 preview 与 sandbox 模式下的结构漂移概率。
- 提升 reviewer 对“结构正确、内容简洁”的容错性，减少误报 `changes-requested`。
- 为 `goal-to-docs` 建立一组稳定的 sandbox 验证样本，作为后续人工回归基线。
- 保持变更最小，尽量聚焦 `run-mvp.ts` 内的 prompt / review / validation 协议，而不是大范围重构。

**Non-Goals:**
- 不修改真实 docs source-aware write guard 的总体治理逻辑。
- 不要求执行 `--write-docs` 样本作为本 change 的完成标准。
- 不引入新的测试框架、快照系统或自动化 harness。

## Decisions

### Decision 1: 以“失败样式约束”收紧 writer prompt，而不是仅靠 post-validation 拦截

采纳方案：在 Stage 2/3/4 的 writer prompt 中明确写出失败条件，例如：
- 不允许输出模板外的前言、总结、分析过程、问答
- 必须从第一行 `---` 开始输出
- 只能输出最终文档本身
- 对特定页面增加内容风格限制，例如 `handoff-summary` 禁止写成长篇执行计划，`handoff-next-up` 禁止写成完整交接摘要

理由：
- 现有问题大多发生在模型“自作主张补充说明”上；提前把失败样式讲清楚，比事后依赖校验更有效。

备选方案：保持当前 prompt，只继续增强结构校验。
- 不采纳原因：只能更快失败，不能提升成功率。

### Decision 2: reviewer prompt 改为“结构优先、内容简洁可接受”的保守判定

采纳方案：对于固定模板页，reviewer prompt 明确要求：
- 如果 front matter、H1、必需章节齐全，且页面职责未漂移，则应优先判为 `accepted`
- 不要因为“还能扩写”或“可以写得更丰富”而要求修改

理由：
- 当前 reviewer 容错偏低，是误拒的重要来源。
- 现阶段目标是稳定闭环，不是追求每次生成都达到最佳文案质量。

备选方案：继续沿用当前 reviewer 风格，仅靠人工挑目标样本绕过波动。
- 不采纳原因：不具备可持续性，回归价值低。

### Decision 3: 稳定化 change 的验证边界固定为 preview 与 sandbox

采纳方案：本 change 的完成条件只要求：
- `bun run types:check`
- 至少一组 preview 样本验证
- 至少一组 `--write-sandbox` 样本验证

不要求执行 `--write-docs` 验证。

理由：
- 当前 change 关注的是生成稳定性，不是写入治理。
- 真实 docs 写入会把生成稳定性问题与治理问题混在一起，降低定位效率。

备选方案：继续把真实 docs 也纳入验证。
- 不采纳原因：会扩大验证成本，并让该 change 与上一个 guard change 的边界重叠。

### Decision 4: 使用“稳定样本 + 失败样本”而不是通用宣称来衡量效果

采纳方案：在 tasks 中明确保留两类样本：
- 稳定样本：贴近当前产品语义、预期能通过 Stage 2/3/4
- 失败样本：故意触发模板外输出或错误文档风格，用于确认约束仍能拒绝异常产物

理由：
- 这样可以同时验证“成功率提升”与“约束没有失效”。

补充记录方式：样本验证结果应沉淀在当前 change 目录下的 `validation-notes.md` 或等价实现说明中，而不是仅停留在临时 CLI 输出里。这样后续回看时可以区分“稳定通过样本”“结构失败样本”“reviewer 拒绝样本”分别是什么。

## Risks / Trade-offs

- [prompt 约束过强，可能压缩内容质量] → 当前优先级是结构稳定性，后续可在另一个 change 中微调文案质量。
- [reviewer 容错提高，可能放过边缘问题] → 仍保留结构校验与页面职责检查，不会完全放松。
- [只做 sandbox 验证，无法证明真实写入路径稳定] → 这是有意边界；真实写入治理已在前一个 change 处理。

## Compatibility

- 对现有 CLI 与 workbench 兼容：只调整生成/审查行为，不改命令面。
- 对 preview 与 sandbox 兼容：期望成功率提升，输出路径不变。
- 对真实 docs 兼容：本 change 不主动改变真实写入验证要求。

## Migration Plan

1. 收紧 Stage 2/3/4 writer prompt 的失败样式与输出边界。
2. 提升 reviewer prompt 对结构正确文档的默认接受倾向。
3. 仅在必要时微调 Stage 2/3/4 的 validation 文案或最小规则，不扩展到新的页面治理。
4. 运行 preview 与 sandbox 样本，记录哪类样本稳定通过、哪类样本仍应失败。

预期验证命令：
- `bun run types:check`
- `bun run src/index.ts goal new "<稳定目标样本>"`
- `bun run src/index.ts goal new --write-sandbox "<稳定目标样本>"`
- `bun run src/index.ts goal new --write-sandbox "<失败样本>"`

## Open Questions

- 稳定样本目标文本是否只记录在 `validation-notes.md`，还是还要进一步沉淀成可复用的仓库基线文档？
