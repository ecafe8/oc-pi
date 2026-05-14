## 1. 两阶段运行骨架扩展

- [ ] 1.1 将 `apps/oc-pi-cli/src/planning/goal-to-docs/run-mvp.ts` 从单阶段执行器扩展为按顺序处理前两阶段的最小线性执行器。
- [ ] 1.2 为 `goal-framing 目标定型` 与 `capability-breakdown 能力拆解` 明确拆出阶段级输入解析函数，避免把两阶段 prompt 组装继续堆叠在同一段逻辑里。
- [ ] 1.3 为第二阶段补充 `capability-map 能力地图槽位` 的逻辑目标路径与 preview/write 物理路径解析，保持与现有 `product-goal 产品目标槽位` 同一规则体系。
- [ ] 1.4 确保第一阶段未 `accepted 已接受` 时，第二阶段不会执行，并在缺少输入产物时返回 `blocked 已阻塞` 状态。

## 2. 阶段输入与产物消费

- [ ] 2.1 实现第一阶段产物内容读取逻辑，使第二阶段能够消费 `product-goal 产品目标槽位` 的实际文档文本，而不是只消费 summary。
- [ ] 2.2 设计并实现 `capability-breakdown 能力拆解` 的 writer prompt，要求输出与现有 planning 文档约束一致，并适配 preview/sandbox 路径策略。
- [ ] 2.3 设计并实现第二阶段 reviewer prompt，使其可以对 `capability-map 能力地图槽位` 结果返回结构化 `accepted 已接受 / changes-requested 需要修改` 判断。
- [ ] 2.4 校验第二阶段的逻辑产物路径、解析后的物理路径与当前模式一致：preview 默认指向 `tests/sandbox/`，`--write-docs` 指向真实 `apps/web-docs/`。

## 3. 运行状态与工作台同步

- [ ] 3.1 扩展 `GoalToDocsRunRecord 目标到文档执行记录` 更新流程，使第一阶段 accepted 后可以推进到第二阶段，并记录第二阶段的 `artifactPaths 产物路径`、`reviewerStatus 审查状态`、`reviewSummary 审查摘要`。
- [ ] 3.2 扩展 `WorkbenchState 工作台状态` 同步逻辑，使 `status show` 能反映当前执行阶段已进入或完成 `capability-breakdown 能力拆解`。
- [ ] 3.3 扩展 `review latest` 的来源，使其返回最近一次阶段审查结果，而不是隐式固定为第一阶段结果。
- [ ] 3.4 保持当前 `logicalArtifactPath 逻辑产物路径` 与 `resolvedArtifactAbsolutePath 解析后的绝对产物路径` 字段命名一致，并确保两阶段输出都复用这一约定。

## 4. CLI 与安全路径策略

- [ ] 4.1 保持 `goal new` 默认 preview 行为不变，但使其能够预览两阶段结果，并分别输出第二阶段的逻辑路径与解析路径。
- [ ] 4.2 保持 `--write-docs` 为唯一真实写入开关，并确保第二阶段真实写入同样经过 `apps/web-docs/` 路径 guard。
- [ ] 4.3 保持 `tests/sandbox/` 作为默认测试输出目录，不把两阶段 preview 产物写入真实 `apps/web-docs/`。
- [ ] 4.4 更新 CLI usage 或相关提示文本，明确默认 preview 的测试目标目录以及 `--write-docs` 的含义。

## 5. 验证与文档对齐

- [ ] 5.1 执行 `bun run types:check`，确认两阶段闭环改动后的 TypeScript 类型检查通过。
- [ ] 5.2 执行 `bun run src/index.ts goal new "<goal>"`，验证默认 preview 模式下第二阶段路径解析到 `tests/sandbox/`，且不会写入真实文档目录。
- [ ] 5.3 执行 `bun run src/index.ts status show` 与 `bun run src/index.ts review latest`，确认两阶段状态与最新审查结果能够被观察。
- [ ] 5.4 如需要验证真实写入，再执行 `bun run src/index.ts goal new --write-docs "<goal>"`，确认第二阶段写入仍然受真实 docs 路径 guard 保护。
- [ ] 5.5 对照并在实现说明中引用以下文档，确保行为与规划协议一致：`development-plan-framework.md`、`goal-to-docs.md`、`output-target-slots.md`、`agent-role-config.md`。
