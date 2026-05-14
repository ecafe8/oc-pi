import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import {
  createGoalToDocsRunSkeleton,
  executeGoalToDocsStage,
} from '@/planning/goal-to-docs/run.js'
import { setGoalToDocsCurrentStage, updateGoalToDocsStageStatus } from '@/planning/goal-to-docs/state.js'
import { resolveProviderModelForRole } from '@/provider-adapters/model-mapping.js'
import {
  FileOAuthCredentialStore,
  PiModelAgentBridge,
  PiOAuthLoginBridge,
} from '@/provider-adapters/index.js'
import {
  DEFAULT_GOAL_TO_DOCS_STAGES,
  DEFAULT_ROLE_CONFIGS,
  DEFAULT_SLOT_DEFINITIONS,
  createDefaultWorkbenchState,
} from '@/runtime/default-config.js'
import {
  assertWithinTestSandbox,
  assertWithinWorkspaceDocs,
  resolveTestSandboxPath,
  resolveWorkspacePath,
} from '@/runtime/paths.js'
import type { ReviewFinding, ReviewResult } from '@/shared/types/review.js'
import type { RuntimeStatus, SlotId } from '@/shared/types/core.js'
import type { GoalToDocsStageContract } from '@/planning/goal-to-docs/types.js'
import {
  applyReviewToWorkbench,
  handleGoalNew,
  syncGoalToDocsRunToWorkbench,
} from '@/workbench/controller/index.js'
import {
  addTimelineItem,
  setWorkbenchInspectorExecutionStatus,
  setWorkbenchRuntimeStatus,
} from '@/workbench/state.js'
import type { WorkbenchState } from '@/workbench/types.js'

export interface RunGoalToDocsMvpInput {
  goal: string
  cliRoot: string
  artifactMode?: ArtifactMode
}

export interface RunGoalToDocsMvpResult {
  workbenchState: WorkbenchState
  run: ReturnType<typeof executeGoalToDocsStage>['run']
  latestReview: ReviewResult
  stages: GoalStageExecutionResult[]
  wroteArtifact: boolean
}

export type ArtifactMode = 'preview' | 'sandbox-write' | 'write'

interface GoalStageExecutionResult {
  stageId: GoalToDocsStageContract['stageId']
  logicalArtifactPath: string
  resolvedArtifactAbsolutePath: string
  artifactText: string
  review: ReviewResult
}

export async function runGoalToDocsMvp(
  input: RunGoalToDocsMvpInput,
): Promise<RunGoalToDocsMvpResult> {
  const loginBridge = new PiOAuthLoginBridge()
  const agentBridge = new PiModelAgentBridge()
  const credentialStore = new FileOAuthCredentialStore()
  const apiKeyCache = new Map<string, string>()
  const artifactMode = input.artifactMode ?? 'preview'
  const shouldWriteArtifacts = artifactMode !== 'preview'
  const initialState = createDefaultWorkbenchState(input.cliRoot)
  const goalResult = handleGoalNew({
    state: initialState,
    goal: input.goal,
  })
  const firstStage = DEFAULT_GOAL_TO_DOCS_STAGES[0]
  const secondStage = DEFAULT_GOAL_TO_DOCS_STAGES[1]

  if (!firstStage || !secondStage) {
    throw new Error('Missing default two-stage goal-to-docs configuration')
  }

  const writerRole = DEFAULT_ROLE_CONFIGS.find(
    (role) => role.roleId === firstStage.writerRoleId,
  )
  const reviewerRole = DEFAULT_ROLE_CONFIGS.find(
    (role) => role.roleId === firstStage.reviewerRoleId,
  )

  if (!writerRole || !reviewerRole) {
    throw new Error('Missing default writer or reviewer role configuration')
  }

  const firstStageWriterApiKey = await resolveProviderApiKey({
    provider: writerRole.provider,
    credentialStore,
    loginBridge,
    apiKeyCache,
  })

  const writerModel = resolveProviderModelForRole(writerRole)
  const run = createGoalToDocsRunSkeleton({
    runId: `run-${Date.now()}`,
    currentStageId: firstStage.stageId,
    stages: DEFAULT_GOAL_TO_DOCS_STAGES,
  })
  const firstStageResult = await executeStage({
    run,
    stage: firstStage,
    goal: input.goal,
    prompt: buildGoalFramingPrompt(input.goal),
    cliRoot: input.cliRoot,
    provider: writerModel.provider,
    modelId: writerModel.resolvedModelId,
    apiKey: firstStageWriterApiKey,
    shouldWriteArtifacts,
    artifactMode,
    agentBridge,
    reviewerRole,
    reviewerApiKey: await resolveProviderApiKey({
      provider: reviewerRole.provider,
      credentialStore,
      loginBridge,
      apiKeyCache,
    }),
  })

  if (firstStageResult.review.status !== 'accepted') {
    const pausedState = finalizeWorkbenchState({
      state: goalResult.state,
      run: firstStageResult.run,
      review: firstStageResult.review,
      timelineSummary: buildTimelineSummary(firstStageResult, artifactMode),
    })

    return {
      workbenchState: pausedState,
      run: firstStageResult.run,
      latestReview: firstStageResult.review,
      stages: [firstStageResult.stageResult],
      wroteArtifact: shouldWriteArtifacts,
    }
  }

  const secondStageWriterRole = DEFAULT_ROLE_CONFIGS.find(
    (role) => role.roleId === secondStage.writerRoleId,
  )
  const secondStageReviewerRole = DEFAULT_ROLE_CONFIGS.find(
    (role) => role.roleId === secondStage.reviewerRoleId,
  )

  if (!secondStageWriterRole || !secondStageReviewerRole) {
    throw new Error('Missing second-stage writer or reviewer role configuration')
  }

  const secondStageWriterModel = resolveProviderModelForRole(secondStageWriterRole)
  let secondStageInput: GoalStageExecutionResult

  try {
    secondStageInput = resolveStageInputArtifact({
      upstreamStageResult: firstStageResult.stageResult,
      expectedSlotId: 'product-goal',
    })
  } catch (error) {
    const blockedRun = markStageBlocked({
      run: firstStageResult.run,
      stage: secondStage,
      issue: error instanceof Error ? error.message : String(error),
    })
    const blockedState = finalizeWorkbenchState({
      state: goalResult.state,
      run: blockedRun,
      review: firstStageResult.review,
      timelineSummary: `Blocked ${secondStage.stageId}: ${error instanceof Error ? error.message : String(error)}`,
    })

    return {
      workbenchState: blockedState,
      run: blockedRun,
      latestReview: firstStageResult.review,
      stages: [firstStageResult.stageResult],
      wroteArtifact: shouldWriteArtifacts,
    }
  }

  const secondStageResult = await executeStage({
    run: firstStageResult.run,
    stage: secondStage,
    goal: input.goal,
    prompt: buildCapabilityBreakdownPrompt({
      goal: input.goal,
      productGoalArtifact: secondStageInput.artifactText,
    }),
    cliRoot: input.cliRoot,
    provider: secondStageWriterModel.provider,
    modelId: secondStageWriterModel.resolvedModelId,
    apiKey: await resolveProviderApiKey({
      provider: secondStageWriterRole.provider,
      credentialStore,
      loginBridge,
      apiKeyCache,
    }),
    shouldWriteArtifacts,
    artifactMode,
    agentBridge,
    reviewerRole: secondStageReviewerRole,
    reviewerApiKey: await resolveProviderApiKey({
      provider: secondStageReviewerRole.provider,
      credentialStore,
      loginBridge,
      apiKeyCache,
    }),
  })

  const finalState = finalizeWorkbenchState({
    state: goalResult.state,
    run: secondStageResult.run,
    review: secondStageResult.review,
    timelineSummary: buildTimelineSummary(secondStageResult, artifactMode),
  })

  return {
    workbenchState: finalState,
    run: secondStageResult.run,
    latestReview: secondStageResult.review,
    stages: [firstStageResult.stageResult, secondStageResult.stageResult],
    wroteArtifact: shouldWriteArtifacts,
  }
}

interface ExecuteStageInput {
  run: ReturnType<typeof createGoalToDocsRunSkeleton>
  stage: GoalToDocsStageContract
  goal: string
  prompt: string
  cliRoot: string
  provider: string
  modelId: string
  apiKey: string
  shouldWriteArtifacts: boolean
  artifactMode: ArtifactMode
  agentBridge: PiModelAgentBridge
  reviewerRole: typeof DEFAULT_ROLE_CONFIGS[number]
  reviewerApiKey: string
}

interface ExecuteStageOutput {
  run: ReturnType<typeof executeGoalToDocsStage>['run']
  review: ReviewResult
  stageResult: GoalStageExecutionResult
}

async function executeStage(input: ExecuteStageInput): Promise<ExecuteStageOutput> {
  const artifactResponse = await input.agentBridge.prompt({
    cwd: input.cliRoot,
    provider: input.provider,
    modelId: input.modelId,
    prompt: input.prompt,
    apiKey: input.apiKey,
  })
  const logicalArtifactPath = resolveLogicalArtifactPath(input.stage.primaryOutputSlot)
  const resolvedArtifactAbsolutePath = resolveArtifactAbsolutePath({
    logicalArtifactPath,
    artifactMode: input.artifactMode,
  })
  const normalizedArtifactText = normalizeArtifactDocument({
    logicalArtifactPath,
    content: artifactResponse.text,
  })

  if (input.shouldWriteArtifacts) {
    await writeArtifact(resolvedArtifactAbsolutePath, normalizedArtifactText)
  }

  const review = await reviewGoalArtifact({
    cliRoot: input.cliRoot,
    goal: input.goal,
    artifactMarkdown: normalizedArtifactText,
    apiKey: input.reviewerApiKey,
    provider: input.reviewerRole.provider,
    modelId: resolveProviderModelForRole(input.reviewerRole).resolvedModelId,
    agentBridge: input.agentBridge,
    artifactSlotId: input.stage.primaryOutputSlot,
    reviewerRoleId: input.stage.reviewerRoleId,
    reviewPrompt: buildStageReviewPrompt({
      goal: input.goal,
      stage: input.stage,
      artifactMarkdown: normalizedArtifactText,
    }),
  })

  const executed = executeGoalToDocsStage({
    run: input.run,
    stage: input.stage,
    slotDefinitions: DEFAULT_SLOT_DEFINITIONS,
    roles: DEFAULT_ROLE_CONFIGS,
    artifactSummary: review.summary,
    findings: review.findings,
    reviewStatus: review.status,
  })

  return {
    run: executed.run,
    review: executed.review,
    stageResult: {
      stageId: input.stage.stageId,
      logicalArtifactPath,
      resolvedArtifactAbsolutePath,
      artifactText: normalizedArtifactText,
      review: executed.review,
    },
  }
}

async function writeArtifact(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, ensureTrailingNewline(content), 'utf8')
}

async function reviewGoalArtifact(input: {
  artifactSlotId: SlotId
  reviewerRoleId: ReviewResult['reviewerRoleId']
  cliRoot: string
  goal: string
  artifactMarkdown: string
  apiKey: string
  provider: string
  modelId: string
  agentBridge: PiModelAgentBridge
  reviewPrompt: string
}): Promise<ReviewResult> {
  const reviewResponse = await input.agentBridge.prompt({
    cwd: input.cliRoot,
    provider: input.provider,
    modelId: input.modelId,
    apiKey: input.apiKey,
    prompt: input.reviewPrompt,
  })

  return parseReviewResponse({
    text: reviewResponse.text,
    artifactSlotId: input.artifactSlotId,
    reviewerRoleId: input.reviewerRoleId,
  })
}

function parseReviewResponse(input: {
  text: string
  artifactSlotId: SlotId
  reviewerRoleId: ReviewResult['reviewerRoleId']
}): ReviewResult {
  const statusMatch = input.text.match(/^STATUS:\s*(accepted|changes-requested)$/m)
  const summaryMatch = input.text.match(/^SUMMARY:\s*(.+)$/m)
  const findings = input.text
    .split('\n')
    .filter((line) => line.startsWith('FINDING:'))
    .map((line): ReviewFinding => ({
      message: line.replace(/^FINDING:\s*/, '').trim(),
      severity: 'medium',
    }))

  return {
    artifactSlotId: input.artifactSlotId,
    reviewerRoleId: input.reviewerRoleId,
    status: statusMatch?.[1] === 'changes-requested' ? 'changes-requested' : 'accepted',
    summary: summaryMatch?.[1]?.trim() ?? 'Product goal draft reviewed',
    findings,
  }
}

function buildGoalFramingPrompt(goal: string): string {
  return [
    '你正在为 apps/oc-pi-cli 生成 Product Vision 产品愿景文档。',
    '输出必须是 Markdown，并直接给出完整文档内容。',
    '必须遵守这些规则：',
    '- 文档路径目标是 apps/web-docs/content/docs/product/vision.md。',
    '- 必须保留 YAML front matter，且只包含 title 与 description 两个字段。',
    '- 首次出现的英文术语必须带中文解释。',
    '- 如果章节标题是技术术语，章节第一句话必须用中文解释。',
    '- 不要留下只有英文没有中文解释的术语。',
    '- 内容要围绕当前用户目标，保持简洁、具体、可执行。',
    '- front matter 中 title 必须是 Product Vision 产品愿景。',
    '- front matter 中 description 必须是 说明 apps/oc-pi-cli 要解决什么问题、服务什么场景、形成什么产品能力。',
    '- 正文一级标题必须是 # Product Vision 产品愿景。',
    '- 至少包含 Vision 愿景、Product Positioning 产品定位、Current Product Goal 当前产品目标、MVP Scope 第一阶段最小范围。',
    '',
    `用户目标: ${goal}`,
  ].join('\n')
}

function buildReviewPrompt(goal: string, artifactMarkdown: string): string {
  return [
    '你是 goal-reviewer 目标审查者。',
    '请审查下面的 Product Vision 产品愿景草案。',
    '只允许输出以下纯文本格式：',
    'STATUS: accepted 或 STATUS: changes-requested',
    'SUMMARY: 一句中文摘要',
    '如果需要修改，可额外输出一到三行 FINDING: <问题描述>',
    '如果文档已经可接受，不要输出 FINDING。',
    '',
    `原始用户目标: ${goal}`,
    '',
    '待审查文档:',
    artifactMarkdown,
  ].join('\n')
}

function buildStageReviewPrompt(input: {
  goal: string
  stage: GoalToDocsStageContract
  artifactMarkdown: string
}): string {
  if (input.stage.stageId === 'goal-framing') {
    return buildReviewPrompt(input.goal, input.artifactMarkdown)
  }

  return [
    '你是 goal-reviewer 目标审查者。',
    '请审查下面的 Capability Breakdown 能力拆解草案。',
    '只允许输出以下纯文本格式：',
    'STATUS: accepted 或 STATUS: changes-requested',
    'SUMMARY: 一句中文摘要',
    '如果需要修改，可额外输出一到三行 FINDING: <问题描述>',
    '如果文档已经可接受，不要输出 FINDING。',
    '',
    `原始用户目标: ${input.goal}`,
    '',
    '待审查文档:',
    input.artifactMarkdown,
  ].join('\n')
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith('\n') ? value : `${value}\n`
}

function normalizeArtifactDocument(input: {
  logicalArtifactPath: string
  content: string
}): string {
  if (input.logicalArtifactPath === 'apps/web-docs/content/docs/product/vision.md') {
    return normalizeDocumentFrontMatter({
      content: input.content,
      title: 'Product Vision 产品愿景',
      description: '说明 apps/oc-pi-cli 要解决什么问题、服务什么场景、形成什么产品能力',
      heading: '# Product Vision 产品愿景',
    })
  }

  if (input.logicalArtifactPath === 'apps/web-docs/content/docs/capabilities/overview.mdx') {
    return normalizeDocumentFrontMatter({
      content: input.content,
      title: 'Capabilities Overview 能力总览',
      description: 'apps/oc-pi-cli 的一级能力地图与能力边界概览',
      heading: '# Capabilities Overview 能力总览',
    })
  }

  return ensureTrailingNewline(input.content)
}

function normalizeDocumentFrontMatter(input: {
  content: string
  title: string
  description: string
  heading: string
}): string {
  const withoutFrontMatter = stripLeadingFrontMatter(input.content).trimStart()
  const withoutHeading = withoutFrontMatter.startsWith(`${input.heading}\n`)
    ? withoutFrontMatter.slice(input.heading.length).trimStart()
    : withoutFrontMatter

  return ensureTrailingNewline([
    '---',
    `title: ${input.title}`,
    `description: ${input.description}`,
    '---',
    '',
    input.heading,
    '',
    withoutHeading,
  ].join('\n'))
}

function stripLeadingFrontMatter(content: string): string {
  if (!content.startsWith('---\n')) {
    return content
  }

  const endIndex = content.indexOf('\n---\n', 4)

  if (endIndex === -1) {
    return content
  }

  return content.slice(endIndex + '\n---\n'.length)
}

function resolvePreviewArtifactPath(artifactPath: string): string {
  const previewRelativePath = artifactPath.startsWith('apps/')
    ? artifactPath.slice('apps/'.length)
    : artifactPath

  return resolveTestSandboxPath(previewRelativePath)
}

function resolveLogicalArtifactPath(slotId: SlotId): string {
  const artifactPath = DEFAULT_SLOT_DEFINITIONS.find(
    (slot) => slot.slotId === slotId,
  )?.defaultPath

  if (!artifactPath) {
    throw new Error(`Missing default slot path for ${slotId}`)
  }

  return artifactPath
}

function resolveArtifactAbsolutePath(input: {
  logicalArtifactPath: string
  artifactMode: ArtifactMode
}): string {
  if (input.artifactMode === 'write') {
    return assertWithinWorkspaceDocs(resolveWorkspacePath(input.logicalArtifactPath))
  }

  return assertWithinTestSandbox(resolvePreviewArtifactPath(input.logicalArtifactPath))
}

function resolveStageInputArtifact(input: {
  upstreamStageResult: GoalStageExecutionResult
  expectedSlotId: SlotId
}): GoalStageExecutionResult {
  if (input.upstreamStageResult.review.artifactSlotId !== input.expectedSlotId) {
    throw new Error(
      `Expected upstream artifact slot ${input.expectedSlotId}, got ${input.upstreamStageResult.review.artifactSlotId}`,
    )
  }

  if (!input.upstreamStageResult.artifactText.trim()) {
    throw new Error(
      `Missing upstream artifact text for ${input.upstreamStageResult.stageId}`,
    )
  }

  return input.upstreamStageResult
}

function buildCapabilityBreakdownPrompt(input: {
  goal: string
  productGoalArtifact: string
}): string {
  return [
    '你正在为 apps/oc-pi-cli 生成 Capability Breakdown 能力拆解文档。',
    '输出必须是 Markdown，并直接给出完整文档内容。',
    '必须遵守这些规则：',
    '- 文档路径目标是 apps/web-docs/content/docs/capabilities/overview.mdx。',
    '- 必须保留 YAML front matter，且只包含 title 与 description 两个字段。',
    '- front matter 中 title 必须是 Capabilities Overview 能力总览。',
    '- front matter 中 description 必须是 apps/oc-pi-cli 的一级能力地图与能力边界概览。',
    '- 首次出现的英文术语必须带中文解释。',
    '- 如果章节标题是技术术语，章节第一句话必须用中文解释。',
    '- 不要留下只有英文没有中文解释的术语。',
    '- 正文一级标题必须是 # Capabilities Overview 能力总览。',
    '- 内容要从产品目标草案中拆出一级能力模块、边界、关键约束和主要风险。',
    '- 至少包含 Capability Domains 能力域、Capability Boundaries 能力边界、Open Risks 待定风险。',
    '',
    `原始用户目标: ${input.goal}`,
    '',
    '已接受的 Product Goal Draft 产品目标草案：',
    input.productGoalArtifact,
  ].join('\n')
}

function buildTimelineSummary(
  stageResult: ExecuteStageOutput,
  artifactMode: ArtifactMode,
): string {
  if (artifactMode === 'write') {
    return `Wrote ${stageResult.review.artifactSlotId} to ${stageResult.stageResult.logicalArtifactPath}`
  }

  if (artifactMode === 'sandbox-write') {
    return `Wrote sandbox ${stageResult.review.artifactSlotId} to ${stageResult.stageResult.logicalArtifactPath}`
  }

  return `Previewed ${stageResult.review.artifactSlotId} at ${stageResult.stageResult.logicalArtifactPath}`
}

function finalizeWorkbenchState(input: {
  state: WorkbenchState
  run: ReturnType<typeof executeGoalToDocsStage>['run']
  review: ReviewResult
  timelineSummary: string
}): WorkbenchState {
  const runtimeStatus = resolveRuntimeStatus(input.run)
  const synced = syncGoalToDocsRunToWorkbench(input.state, input.run)
  const reviewedState = applyReviewToWorkbench(synced.state, {
    latestStatus: input.review.status,
    latestSummary: input.review.summary,
    latestFindings: input.review.findings,
  })

  return addTimelineItem(
    setWorkbenchInspectorExecutionStatus(
      setWorkbenchRuntimeStatus(reviewedState, runtimeStatus),
      runtimeStatus,
    ),
    {
      type: input.timelineSummary.startsWith('Wrote') ? 'write-result' : 'system-summary',
      summary: input.timelineSummary,
      createdAt: new Date().toISOString(),
    },
  )
}

function markStageBlocked(input: {
  run: ReturnType<typeof createGoalToDocsRunSkeleton>
  stage: GoalToDocsStageContract
  issue: string
}): ReturnType<typeof executeGoalToDocsStage>['run'] {
  const currentStageRun = setGoalToDocsCurrentStage(input.run, input.stage.stageId)
  const blockedRun = updateGoalToDocsStageStatus(
    currentStageRun,
    input.stage.stageId,
    'blocked',
  )

  return {
    ...blockedRun,
    stages: blockedRun.stages.map((stageRecord) =>
      stageRecord.stageId === input.stage.stageId
        ? {
            ...stageRecord,
            blockingIssues: [...stageRecord.blockingIssues, input.issue],
          }
        : stageRecord,
    ),
  }
}

async function resolveProviderApiKey(input: {
  provider: string
  credentialStore: FileOAuthCredentialStore
  loginBridge: PiOAuthLoginBridge
  apiKeyCache: Map<string, string>
}): Promise<string> {
  const cachedApiKey = input.apiKeyCache.get(input.provider)

  if (cachedApiKey) {
    return cachedApiKey
  }

  const credentials = await input.credentialStore.read(input.provider)

  if (!credentials) {
    throw new Error(
      `No stored OAuth credentials found for ${input.provider}. Run: bun run src/index.ts auth login ${input.provider}`,
    )
  }

  const apiKeyResult = await input.loginBridge.getApiKey({
    provider: input.provider,
    credentials: { [input.provider]: credentials },
  })

  if (!apiKeyResult) {
    throw new Error(`Unable to resolve API key for ${input.provider}`)
  }

  await input.credentialStore.write(input.provider, apiKeyResult.newCredentials)
  input.apiKeyCache.set(input.provider, apiKeyResult.apiKey)

  return apiKeyResult.apiKey
}

function resolveRuntimeStatus(
  run: ReturnType<typeof executeGoalToDocsStage>['run'],
): RuntimeStatus {
  const currentStage = run.stages.find((stage) => stage.stageId === run.currentStageId)

  switch (currentStage?.status) {
    case 'accepted':
      return 'success'
    case 'blocked':
    case 'revising':
      return 'failed'
    case 'running':
    case 'in-review':
    case 'pending':
    default:
      return 'running'
  }
}
