## 1. 第三阶段执行骨架扩展

- [x] 1.1 扩展 `apps/oc-pi-cli/src/planning/goal-to-docs/run-mvp.ts`，使其在 `capability-breakdown 能力拆解` 被接受后继续进入 `feature-planning 功能规划`。
- [x] 1.2 为第三阶段拆出独立的输入解析函数，明确消费 `capability-map 能力地图槽位` 的完整文档文本，而不是复用上游 summary。
- [x] 1.3 保持当前前两阶段行为不回退：若第二阶段未 `accepted 已接受`，第三阶段不得执行。

## 2. 第三阶段双槽位输出

- [x] 2.1 按 `Stage Contract 阶段契约` 保留第三阶段 `primaryOutputSlot = feature-plan 功能规划槽位` 与 `additionalOutputSlots = [mvp-scope MVP 范围槽位]`。
- [x] 2.2 处理 `feature-plan 功能规划槽位` 与 `mvp-scope MVP 范围槽位` 当前共享 `apps/web-docs/content/docs/planning/mvp-features.md` 物理落点的运行时语义：`artifactPaths 产物路径` 需要去重，且运行时必须保留 `resolvedTargets = [{ slotId, path }]` 或等价结构作为 `slotId -> path` 真源，避免因为同路径而丢失附加槽位信息。
- [x] 2.3 扩展 `goal new` 返回结构，使第三阶段结果可表达 `primaryOutputSlot 主输出槽位`、`additionalOutputSlots 附加输出槽位` 与 `resolvedTargets 已解析目标`。

## 3. 文档生成与审查约束

- [x] 3.1 设计并实现第三阶段 writer prompt，改为“固定模板填充”模式，要求输出 `planning/mvp-features.md` 的稳定骨架，并固定 front matter 为 `title: MVP Features MVP 功能清单`、`description: apps/oc-pi-cli 当前第一批核心功能与其作用边界定义`，固定 H1 为 `# MVP Features MVP 功能清单`。
- [x] 3.2 为第三阶段增加最小 front matter / H1 / 固定章节的程序化结构校验，不合规时直接返回 `changes-requested 需要修改`。
- [x] 3.3 设计并实现第三阶段 reviewer prompt，使其明确审查 `feature-plan 功能规划槽位` 与 `mvp-scope MVP 范围槽位` 共存语义。

## 4. 路径、安全与模式一致性

- [x] 4.1 保持 preview 模式只解析 `tests/sandbox/...` 路径、不写盘，但仍能完成第三阶段输入消费。
- [x] 4.2 保持 `--write-sandbox` 将第三阶段文档写入 `tests/sandbox/web-docs/content/docs/planning/mvp-features.md`。
- [ ] 4.3 保持 `--write-docs` 为唯一真实写入开关，并确保第三阶段真实写入继续受 `apps/web-docs/` 路径 guard 保护。

## 5. 运行状态与工作台同步

- [x] 5.1 扩展 `GoalToDocsRunRecord 目标到文档执行记录`，使其能记录第三阶段状态、去重后的共享物理路径、双逻辑槽位元数据，以及 `resolvedTargets 已解析目标` 或等价的 `slotId -> path` 真源映射。
- [x] 5.2 扩展 `WorkbenchState 工作台状态` 同步逻辑，使 `status show` 能观察到第三阶段当前阶段与输出槽位信息。
- [x] 5.3 扩展 `review latest` 的来源，使其在第三阶段执行后返回第三阶段最近审查结果。

## 6. 验证与协议对齐

- [x] 6.1 执行 `bun run types:check`，确认第三阶段扩展后的类型检查通过。
- [x] 6.2 执行 `bun run src/index.ts goal new "<goal>"`，验证默认 preview 模式下第三阶段能消费第二阶段内存产物，并返回第三阶段路径与槽位信息。
- [x] 6.3 执行 `bun run src/index.ts goal new --write-sandbox "<goal>"`，验证第三阶段共享物理文档写入 `tests/sandbox/.../planning/mvp-features.md`。
- [ ] 6.4 执行 `bun run src/index.ts status show` 与 `bun run src/index.ts review latest`，确认第三阶段状态与最近审查结果可以被观察。
- [x] 6.5 对照并在实现说明中引用以下文档，确保行为与规划协议一致：`development-plan-framework.md`、`goal-to-docs.md`、`output-target-slots.md`、`agent-role-config.md`、`docs-structure-and-output-spec.md`。
