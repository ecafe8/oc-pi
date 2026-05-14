import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import {
  createGoalToDocsRunSkeleton,
  executeGoalToDocsStage,
} from '@/planning/goal-to-docs/run.js'
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
  writeArtifacts?: boolean
}

export interface RunGoalToDocsMvpResult {
  workbenchState: WorkbenchState
  run: ReturnType<typeof executeGoalToDocsStage>['run']
  review: ReviewResult
  logicalArtifactPath: string
  resolvedArtifactAbsolutePath: string
  wroteArtifact: boolean
}

export async function runGoalToDocsMvp(
  input: RunGoalToDocsMvpInput,
): Promise<RunGoalToDocsMvpResult> {
  const loginBridge = new PiOAuthLoginBridge()
  const agentBridge = new PiModelAgentBridge()
  const credentialStore = new FileOAuthCredentialStore()
  const shouldWriteArtifacts = input.writeArtifacts ?? false
  const initialState = createDefaultWorkbenchState(input.cliRoot)
  const goalResult = handleGoalNew({
    state: initialState,
    goal: input.goal,
  })
  const stage = DEFAULT_GOAL_TO_DOCS_STAGES[0]

  if (!stage) {
    throw new Error('Missing default goal-to-docs stage configuration')
  }

  const writerRole = DEFAULT_ROLE_CONFIGS.find(
    (role) => role.roleId === stage.writerRoleId,
  )
  const reviewerRole = DEFAULT_ROLE_CONFIGS.find(
    (role) => role.roleId === stage.reviewerRoleId,
  )

  if (!writerRole || !reviewerRole) {
    throw new Error('Missing default writer or reviewer role configuration')
  }

  const credentials = await credentialStore.read(writerRole.provider)

  if (!credentials) {
    throw new Error(
      `No stored OAuth credentials found for ${writerRole.provider}. Run: bun run src/index.ts auth login ${writerRole.provider}`,
    )
  }

  const apiKeyResult = await loginBridge.getApiKey({
    provider: writerRole.provider,
    credentials: { [writerRole.provider]: credentials },
  })

  if (!apiKeyResult) {
    throw new Error(`Unable to resolve API key for ${writerRole.provider}`)
  }

  await credentialStore.write(writerRole.provider, apiKeyResult.newCredentials)

  const writerModel = resolveProviderModelForRole(writerRole)
  const artifactMarkdown = await agentBridge.prompt({
    cwd: input.cliRoot,
    provider: writerModel.provider,
    modelId: writerModel.resolvedModelId,
    prompt: buildGoalFramingPrompt(input.goal),
    apiKey: apiKeyResult.apiKey,
  })

  const run = createGoalToDocsRunSkeleton({
    runId: `run-${Date.now()}`,
    currentStageId: stage.stageId,
    stages: DEFAULT_GOAL_TO_DOCS_STAGES,
  })
  const artifactPath = DEFAULT_SLOT_DEFINITIONS.find(
    (slot) => slot.slotId === stage.primaryOutputSlot,
  )?.defaultPath

  if (!artifactPath) {
    throw new Error(`Missing default slot path for ${stage.primaryOutputSlot}`)
  }

  const artifactAbsolutePath = shouldWriteArtifacts
    ? assertWithinWorkspaceDocs(resolveWorkspacePath(artifactPath))
    : assertWithinTestSandbox(resolvePreviewArtifactPath(artifactPath))

  if (shouldWriteArtifacts) {
    await writeArtifact(artifactAbsolutePath, artifactMarkdown.text)
  }

  const review = await reviewGoalArtifact({
    cliRoot: input.cliRoot,
    goal: input.goal,
    artifactMarkdown: artifactMarkdown.text,
    apiKey: apiKeyResult.apiKey,
    provider: reviewerRole.provider,
    modelId: resolveProviderModelForRole(reviewerRole).resolvedModelId,
    agentBridge,
  })

  const executed = executeGoalToDocsStage({
    run,
    stage,
    slotDefinitions: DEFAULT_SLOT_DEFINITIONS,
    roles: DEFAULT_ROLE_CONFIGS,
    artifactSummary: review.summary,
    findings: review.findings,
    reviewStatus: review.status,
  })

  const synced = syncGoalToDocsRunToWorkbench(goalResult.state, executed.run)
  const reviewedState = applyReviewToWorkbench(synced.state, {
    latestStatus: executed.review.status,
    latestSummary: executed.review.summary,
    latestFindings: executed.review.findings,
  })
  const finalState = addTimelineItem(
    setWorkbenchInspectorExecutionStatus(
      setWorkbenchRuntimeStatus(reviewedState, 'success'),
      'success',
    ),
    {
      type: shouldWriteArtifacts ? 'write-result' : 'system-summary',
      summary: shouldWriteArtifacts
        ? `Wrote ${stage.primaryOutputSlot} to ${artifactPath}`
        : `Previewed ${stage.primaryOutputSlot} at ${artifactPath}`,
      createdAt: new Date().toISOString(),
    },
  )

  return {
    workbenchState: finalState,
    run: executed.run,
    review: executed.review,
    logicalArtifactPath: artifactPath,
    resolvedArtifactAbsolutePath: artifactAbsolutePath,
    wroteArtifact: shouldWriteArtifacts,
  }
}

async function writeArtifact(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, ensureTrailingNewline(content), 'utf8')
}

async function reviewGoalArtifact(input: {
  cliRoot: string
  goal: string
  artifactMarkdown: string
  apiKey: string
  provider: string
  modelId: string
  agentBridge: PiModelAgentBridge
}): Promise<ReviewResult> {
  const reviewResponse = await input.agentBridge.prompt({
    cwd: input.cliRoot,
    provider: input.provider,
    modelId: input.modelId,
    apiKey: input.apiKey,
    prompt: buildReviewPrompt(input.goal, input.artifactMarkdown),
  })

  return parseReviewResponse(reviewResponse.text)
}

function parseReviewResponse(text: string): ReviewResult {
  const statusMatch = text.match(/^STATUS:\s*(accepted|changes-requested)$/m)
  const summaryMatch = text.match(/^SUMMARY:\s*(.+)$/m)
  const findings = text
    .split('\n')
    .filter((line) => line.startsWith('FINDING:'))
    .map((line): ReviewFinding => ({
      message: line.replace(/^FINDING:\s*/, '').trim(),
      severity: 'medium',
    }))

  return {
    artifactSlotId: 'product-goal',
    reviewerRoleId: 'goal-reviewer',
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
    '- 首次出现的英文术语必须带中文解释。',
    '- 如果章节标题是技术术语，章节第一句话必须用中文解释。',
    '- 不要留下只有英文没有中文解释的术语。',
    '- 内容要围绕当前用户目标，保持简洁、具体、可执行。',
    '- 保留 frontmatter，title 使用 Product Vision 产品愿景。',
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

function ensureTrailingNewline(value: string): string {
  return value.endsWith('\n') ? value : `${value}\n`
}

function resolvePreviewArtifactPath(artifactPath: string): string {
  const previewRelativePath = artifactPath.startsWith('apps/')
    ? artifactPath.slice('apps/'.length)
    : artifactPath

  return resolveTestSandboxPath(previewRelativePath)
}
