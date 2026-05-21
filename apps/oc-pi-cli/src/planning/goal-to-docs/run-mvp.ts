import { mkdir, readFile, writeFile } from 'node:fs/promises'
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
  resolveRuntimeStage,
  resolveTestSandboxPath,
  resolveWorkspacePath,
  RUNTIME_STAGE_ENV,
} from '@/runtime/paths.js'
import type { ReviewFinding, ReviewResult } from '@/shared/types/review.js'
import type { RuntimeStatus, SlotId } from '@/shared/types/core.js'
import type {
  GoalToDocsStageContract,
  ResolvedStageTarget,
} from '@/planning/goal-to-docs/types.js'
import {
  applyGoalToDocsProgressToWorkbench,
  applyReviewToWorkbench,
  handleGoalNew,
  syncGoalToDocsRunToWorkbench,
} from '@/workbench/controller/index.js'
import {
  addTimelineItem,
  setWorkbenchExecutionBoundary,
  setWorkbenchInspectorExecutionStatus,
  setWorkbenchRuntimeStatus,
} from '@/workbench/state.js'
import type { WorkbenchState } from '@/workbench/types.js'

export interface RunGoalToDocsMvpInput {
  goal: string
  cliRoot: string
  artifactMode?: ArtifactMode
  confirmRealWrite?: (request: RealWriteConfirmationRequest) => Promise<boolean>
  initialWorkbenchState?: WorkbenchState
  skipInitialGoalTimeline?: boolean
  onWorkbenchStateChange?: (state: WorkbenchState) => void
}

export interface RunGoalToDocsMvpResult {
  workbenchState: WorkbenchState
  run: ReturnType<typeof executeGoalToDocsStage>['run']
  latestReview: ReviewResult
  stages: GoalStageExecutionResult[]
  wroteArtifact: boolean
  blockedByRealWriteGuard: boolean
}

export type ArtifactMode = 'preview' | 'sandbox-write' | 'write'

export type RealDocsConflictLevel = 'none' | 'warning' | 'blocking'

export interface RealWriteConfirmationRequest {
  stageId: GoalToDocsStageContract['stageId']
  primaryOutputSlot: SlotId
  logicalArtifactPath: string
  resolvedArtifactAbsolutePath: string
  resolvedTargets: ResolvedStageTarget[]
  conflictLevel: RealDocsConflictLevel
  summary: string
  findings: string[]
  sourceSummary: string
  candidateSummary: string
  canForceWrite: boolean
}

interface RealWriteGuardResult {
  conflictLevel: RealDocsConflictLevel
  summary: string
  findings: ReviewFinding[]
  action: 'direct-write' | 'confirmed-write' | 'blocked'
}

interface ArtifactExecutionDetail {
  slotId: SlotId
  logicalArtifactPath: string
  resolvedArtifactAbsolutePath: string
  artifactText: string
  review: ReviewResult
  wroteArtifact: boolean
  realWriteGuard?: RealWriteGuardResult
}

interface GoalStageExecutionResult {
  stageId: GoalToDocsStageContract['stageId']
  primaryOutputSlot: SlotId
  additionalOutputSlots: SlotId[]
  logicalArtifactPath: string
  resolvedArtifactAbsolutePath: string
  resolvedTargets: ResolvedStageTarget[]
  artifactText: string
  review: ReviewResult
  wroteArtifact: boolean
  realWriteGuard?: RealWriteGuardResult
  artifactDetails: ArtifactExecutionDetail[]
}

export async function runGoalToDocsMvp(
  input: RunGoalToDocsMvpInput,
): Promise<RunGoalToDocsMvpResult> {
  const loginBridge = new PiOAuthLoginBridge()
  const agentBridge = new PiModelAgentBridge()
  const credentialStore = new FileOAuthCredentialStore()
  const apiKeyCache = new Map<string, string>()
  const artifactMode = resolveEffectiveArtifactMode(input.artifactMode ?? 'preview')
  const shouldWriteArtifacts = artifactMode !== 'preview'
  const initialState = input.initialWorkbenchState ?? createDefaultWorkbenchState(input.cliRoot)
  const preparedState = setWorkbenchExecutionBoundary(initialState, artifactMode)
  const goalResult = input.skipInitialGoalTimeline
    ? {
        state: setWorkbenchRuntimeStatus(preparedState, 'running'),
      }
    : handleGoalNew({
        state: preparedState,
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
    confirmRealWrite: input.confirmRealWrite,
    onProgress: (event) => {
      goalResult.state = applyProgressToWorkbenchState(goalResult.state, event, input.onWorkbenchStateChange)
    },
  })

  if (!canContinueAfterStage(firstStageResult.stageResult)) {
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
      wroteArtifact: firstStageResult.stageResult.wroteArtifact,
      blockedByRealWriteGuard: isRealWriteBlocked(firstStageResult.stageResult),
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
      wroteArtifact: firstStageResult.stageResult.wroteArtifact,
      blockedByRealWriteGuard: isRealWriteBlocked(firstStageResult.stageResult),
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
    confirmRealWrite: input.confirmRealWrite,
    onProgress: (event) => {
      goalResult.state = applyProgressToWorkbenchState(goalResult.state, event, input.onWorkbenchStateChange)
    },
  })

  if (!canContinueAfterStage(secondStageResult.stageResult)) {
    const pausedState = finalizeWorkbenchState({
      state: goalResult.state,
      run: secondStageResult.run,
      review: secondStageResult.review,
      timelineSummary: buildTimelineSummary(secondStageResult, artifactMode),
    })

    return {
      workbenchState: pausedState,
      run: secondStageResult.run,
      latestReview: secondStageResult.review,
      stages: [firstStageResult.stageResult, secondStageResult.stageResult],
      wroteArtifact:
        firstStageResult.stageResult.wroteArtifact || secondStageResult.stageResult.wroteArtifact,
      blockedByRealWriteGuard:
        isRealWriteBlocked(firstStageResult.stageResult) ||
        isRealWriteBlocked(secondStageResult.stageResult),
    }
  }

  const thirdStage = DEFAULT_GOAL_TO_DOCS_STAGES[2]

  if (!thirdStage) {
    throw new Error('Missing default third-stage goal-to-docs configuration')
  }

  const thirdStageWriterRole = DEFAULT_ROLE_CONFIGS.find(
    (role) => role.roleId === thirdStage.writerRoleId,
  )
  const thirdStageReviewerRole = DEFAULT_ROLE_CONFIGS.find(
    (role) => role.roleId === thirdStage.reviewerRoleId,
  )

  if (!thirdStageWriterRole || !thirdStageReviewerRole) {
    throw new Error('Missing third-stage writer or reviewer role configuration')
  }

  let thirdStageInput: GoalStageExecutionResult

  try {
    thirdStageInput = resolveStageInputArtifact({
      upstreamStageResult: secondStageResult.stageResult,
      expectedSlotId: 'capability-map',
    })
  } catch (error) {
    const blockedRun = markStageBlocked({
      run: secondStageResult.run,
      stage: thirdStage,
      issue: error instanceof Error ? error.message : String(error),
    })
    const blockedState = finalizeWorkbenchState({
      state: goalResult.state,
      run: blockedRun,
      review: secondStageResult.review,
      timelineSummary: `Blocked ${thirdStage.stageId}: ${error instanceof Error ? error.message : String(error)}`,
    })

    return {
      workbenchState: blockedState,
      run: blockedRun,
      latestReview: secondStageResult.review,
      stages: [firstStageResult.stageResult, secondStageResult.stageResult],
      wroteArtifact:
        firstStageResult.stageResult.wroteArtifact || secondStageResult.stageResult.wroteArtifact,
      blockedByRealWriteGuard:
        isRealWriteBlocked(firstStageResult.stageResult) ||
        isRealWriteBlocked(secondStageResult.stageResult),
    }
  }

  const thirdStageWriterModel = resolveProviderModelForRole(thirdStageWriterRole)
  const thirdStageResult = await executeStage({
    run: secondStageResult.run,
    stage: thirdStage,
    goal: input.goal,
    prompt: buildFeaturePlanningPrompt({
      goal: input.goal,
      capabilityMapArtifact: thirdStageInput.artifactText,
    }),
    cliRoot: input.cliRoot,
    provider: thirdStageWriterModel.provider,
    modelId: thirdStageWriterModel.resolvedModelId,
    apiKey: await resolveProviderApiKey({
      provider: thirdStageWriterRole.provider,
      credentialStore,
      loginBridge,
      apiKeyCache,
    }),
    shouldWriteArtifacts,
    artifactMode,
    agentBridge,
    reviewerRole: thirdStageReviewerRole,
    reviewerApiKey: await resolveProviderApiKey({
      provider: thirdStageReviewerRole.provider,
      credentialStore,
      loginBridge,
      apiKeyCache,
    }),
    confirmRealWrite: input.confirmRealWrite,
    onProgress: (event) => {
      goalResult.state = applyProgressToWorkbenchState(goalResult.state, event, input.onWorkbenchStateChange)
    },
    additionalArtifacts: [
      {
        slotId: 'mvp-scope',
        buildPrompt: ({ primaryArtifactText }) => primaryArtifactText,
        reusePrimaryArtifact: true,
      },
    ],
  })

  if (!canContinueAfterStage(thirdStageResult.stageResult)) {
    const pausedState = finalizeWorkbenchState({
      state: goalResult.state,
      run: thirdStageResult.run,
      review: thirdStageResult.review,
      timelineSummary: buildTimelineSummary(thirdStageResult, artifactMode),
    })

    return {
      workbenchState: pausedState,
      run: thirdStageResult.run,
      latestReview: thirdStageResult.review,
      stages: [
        firstStageResult.stageResult,
        secondStageResult.stageResult,
        thirdStageResult.stageResult,
      ],
      wroteArtifact:
        firstStageResult.stageResult.wroteArtifact ||
        secondStageResult.stageResult.wroteArtifact ||
        thirdStageResult.stageResult.wroteArtifact,
      blockedByRealWriteGuard:
        isRealWriteBlocked(firstStageResult.stageResult) ||
        isRealWriteBlocked(secondStageResult.stageResult) ||
        isRealWriteBlocked(thirdStageResult.stageResult),
    }
  }

  const fourthStage = DEFAULT_GOAL_TO_DOCS_STAGES[3]

  if (!fourthStage) {
    throw new Error('Missing default fourth-stage goal-to-docs configuration')
  }

  const fourthStageWriterRole = DEFAULT_ROLE_CONFIGS.find(
    (role) => role.roleId === fourthStage.writerRoleId,
  )
  const fourthStageReviewerRole = DEFAULT_ROLE_CONFIGS.find(
    (role) => role.roleId === fourthStage.reviewerRoleId,
  )

  if (!fourthStageWriterRole || !fourthStageReviewerRole) {
    throw new Error('Missing fourth-stage writer or reviewer role configuration')
  }

  const productGoalInput = resolveStageInputArtifact({
    upstreamStageResult: firstStageResult.stageResult,
    expectedSlotId: 'product-goal',
  })
  const capabilityMapInput = resolveStageInputArtifact({
    upstreamStageResult: secondStageResult.stageResult,
    expectedSlotId: 'capability-map',
  })
  const featurePlanInput = resolveStageInputArtifact({
    upstreamStageResult: thirdStageResult.stageResult,
    expectedSlotId: 'feature-plan',
  })
  const mvpScopeInput = resolveArtifactDetail({
    stageResult: thirdStageResult.stageResult,
    slotId: 'mvp-scope',
  })
  const fourthStageWriterModel = resolveProviderModelForRole(fourthStageWriterRole)
  const fourthStageReviewerApiKey = await resolveProviderApiKey({
    provider: fourthStageReviewerRole.provider,
    credentialStore,
    loginBridge,
    apiKeyCache,
  })
  const fourthStageResult = await executeStage({
    run: thirdStageResult.run,
    stage: fourthStage,
    goal: input.goal,
    prompt: buildHandoffSummaryPrompt({
      goal: input.goal,
      productGoalArtifact: productGoalInput.artifactText,
      capabilityMapArtifact: capabilityMapInput.artifactText,
      featurePlanArtifact: featurePlanInput.artifactText,
      mvpScopeArtifact: mvpScopeInput.artifactText,
    }),
    cliRoot: input.cliRoot,
    provider: fourthStageWriterModel.provider,
    modelId: fourthStageWriterModel.resolvedModelId,
    apiKey: await resolveProviderApiKey({
      provider: fourthStageWriterRole.provider,
      credentialStore,
      loginBridge,
      apiKeyCache,
    }),
    shouldWriteArtifacts,
    artifactMode,
    agentBridge,
    reviewerRole: fourthStageReviewerRole,
    reviewerApiKey: fourthStageReviewerApiKey,
    confirmRealWrite: input.confirmRealWrite,
    onProgress: (event) => {
      goalResult.state = applyProgressToWorkbenchState(goalResult.state, event, input.onWorkbenchStateChange)
    },
    additionalArtifacts: [
      {
        slotId: 'handoff-next-up',
        buildPrompt: ({ primaryArtifactText }) => buildHandoffNextUpPrompt({
          goal: input.goal,
          handoffSummaryArtifact: primaryArtifactText,
          productGoalArtifact: productGoalInput.artifactText,
          capabilityMapArtifact: capabilityMapInput.artifactText,
          featurePlanArtifact: featurePlanInput.artifactText,
          mvpScopeArtifact: mvpScopeInput.artifactText,
        }),
      },
    ],
  })

  const stages = [
    firstStageResult.stageResult,
    secondStageResult.stageResult,
    thirdStageResult.stageResult,
    fourthStageResult.stageResult,
  ]

  const finalState = finalizeWorkbenchState({
    state: goalResult.state,
    run: fourthStageResult.run,
    review: fourthStageResult.review,
    timelineSummary: buildTimelineSummary(fourthStageResult, artifactMode),
  })

  return {
    workbenchState: finalState,
    run: fourthStageResult.run,
    latestReview: fourthStageResult.review,
    stages,
    wroteArtifact: stages.some((stage) => stage.wroteArtifact),
    blockedByRealWriteGuard: stages.some(isRealWriteBlocked),
  }
}

function resolveEffectiveArtifactMode(artifactMode: ArtifactMode): ArtifactMode {
  if (artifactMode !== 'write') {
    return artifactMode
  }

  return resolveRuntimeStage() === 'production' ? 'write' : 'sandbox-write'
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
  confirmRealWrite?: (request: RealWriteConfirmationRequest) => Promise<boolean>
  onProgress?: (event: GoalToDocsProgressEvent) => void
  additionalArtifacts?: Array<{
    slotId: SlotId
    buildPrompt: (input: { primaryArtifactText: string }) => string
    reusePrimaryArtifact?: boolean
  }>
}

interface ExecuteStageOutput {
  run: ReturnType<typeof executeGoalToDocsStage>['run']
  review: ReviewResult
  stageResult: GoalStageExecutionResult
}

interface ArtifactValidationResult {
  isValid: boolean
  summary?: string
  findings: ReviewFinding[]
}

interface ExecuteArtifactInput {
  stage: GoalToDocsStageContract
  slotId: SlotId
  goal: string
  prompt: string
  cliRoot: string
  provider: string
  modelId: string
  apiKey: string
  artifactMode: ArtifactMode
  shouldWriteArtifacts: boolean
  reviewerRole: typeof DEFAULT_ROLE_CONFIGS[number]
  reviewerApiKey: string
  agentBridge: PiModelAgentBridge
  confirmRealWrite?: (request: RealWriteConfirmationRequest) => Promise<boolean>
  onProgress?: (event: GoalToDocsProgressEvent) => void
}

interface GoalToDocsProgressEvent {
  summary: string
  currentAction: string
  latestAction?: string
  liveDraftTitle?: string
  liveDraftText?: string
}

async function executeStage(input: ExecuteStageInput): Promise<ExecuteStageOutput> {
  input.onProgress?.({
    summary: `正在思考 ${describeStageLabel(input.stage.stageId)}。`,
    currentAction: `thinking ${input.stage.stageId}`,
    latestAction: `preparing ${input.stage.stageId}`,
  })

  const primaryArtifact = await executeArtifact({
    stage: input.stage,
    slotId: input.stage.primaryOutputSlot,
    goal: input.goal,
    prompt: input.prompt,
    cliRoot: input.cliRoot,
    provider: input.provider,
    modelId: input.modelId,
    apiKey: input.apiKey,
    artifactMode: input.artifactMode,
    shouldWriteArtifacts: input.shouldWriteArtifacts,
    reviewerRole: input.reviewerRole,
    reviewerApiKey: input.reviewerApiKey,
    agentBridge: input.agentBridge,
    confirmRealWrite: input.confirmRealWrite,
    onProgress: input.onProgress,
  })

  const additionalArtifacts: ArtifactExecutionDetail[] = []

  if (primaryArtifact.review.status === 'accepted' && !isRealWriteBlockedArtifact(primaryArtifact)) {
    for (const additionalArtifact of input.additionalArtifacts ?? []) {
      if (additionalArtifact.reusePrimaryArtifact) {
        additionalArtifacts.push({
          ...primaryArtifact,
          slotId: additionalArtifact.slotId,
        })
        continue
      }

      additionalArtifacts.push(
        await executeArtifact({
          stage: input.stage,
          slotId: additionalArtifact.slotId,
          goal: input.goal,
          prompt: additionalArtifact.buildPrompt({
            primaryArtifactText: primaryArtifact.artifactText,
          }),
          cliRoot: input.cliRoot,
          provider: input.provider,
          modelId: input.modelId,
          apiKey: input.apiKey,
          artifactMode: input.artifactMode,
          shouldWriteArtifacts: input.shouldWriteArtifacts,
          reviewerRole: input.reviewerRole,
          reviewerApiKey: input.reviewerApiKey,
          agentBridge: input.agentBridge,
          confirmRealWrite: input.confirmRealWrite,
          onProgress: input.onProgress,
        }),
      )
    }
  }

  const aggregateReview = primaryArtifact.review.status === 'accepted'
    ? additionalArtifacts.find((artifact) => artifact.review.status !== 'accepted')?.review ?? primaryArtifact.review
    : primaryArtifact.review

  const executed = executeGoalToDocsStage({
    run: input.run,
    stage: input.stage,
    slotDefinitions: DEFAULT_SLOT_DEFINITIONS,
    roles: DEFAULT_ROLE_CONFIGS,
    artifactSummary: aggregateReview.summary,
    findings: [
      ...primaryArtifact.review.findings,
      ...additionalArtifacts.flatMap((artifact) => artifact.review.findings),
    ],
    reviewStatus: aggregateReview.status,
  })

  let finalRun = executed.run

  if ([primaryArtifact, ...additionalArtifacts].some(isRealWriteBlockedArtifact)) {
    finalRun = markStageBlocked({
      run: executed.run,
      stage: input.stage,
      issue: [primaryArtifact, ...additionalArtifacts]
        .filter(isRealWriteBlockedArtifact)
        .map((artifact) => artifact.realWriteGuard?.summary)
        .filter(Boolean)
        .join(' / '),
    })
  }

  const wroteArtifact = [primaryArtifact, ...additionalArtifacts].some((artifact) => artifact.wroteArtifact)
  const stageRealWriteGuard = resolveStageRealWriteGuard([primaryArtifact, ...additionalArtifacts])
  const resolvedTargetMap = new Map(executed.resolvedTargets.map((target) => [target.slotId, target]))
  const primaryResolvedTarget = resolvedTargetMap.get(input.stage.primaryOutputSlot)

  return {
    run: finalRun,
    review: {
      ...executed.review,
      status: aggregateReview.status,
      summary: aggregateReview.summary,
      findings: [
        ...primaryArtifact.review.findings,
        ...additionalArtifacts.flatMap((artifact) => artifact.review.findings),
      ],
    },
    stageResult: {
      stageId: input.stage.stageId,
      primaryOutputSlot: input.stage.primaryOutputSlot,
      additionalOutputSlots: input.stage.additionalOutputSlots ?? [],
      logicalArtifactPath: primaryResolvedTarget?.path ?? primaryArtifact.logicalArtifactPath,
      resolvedArtifactAbsolutePath: primaryArtifact.resolvedArtifactAbsolutePath,
      resolvedTargets: executed.resolvedTargets,
      artifactText: primaryArtifact.artifactText,
      review: {
        ...executed.review,
        status: aggregateReview.status,
        summary: aggregateReview.summary,
        findings: [
          ...primaryArtifact.review.findings,
          ...additionalArtifacts.flatMap((artifact) => artifact.review.findings),
        ],
      },
      wroteArtifact,
      realWriteGuard: stageRealWriteGuard,
      artifactDetails: [primaryArtifact, ...additionalArtifacts],
    },
  }
}

async function executeArtifact(input: ExecuteArtifactInput): Promise<ArtifactExecutionDetail> {
  const logicalArtifactPath = resolveLogicalArtifactPath(input.slotId)
  const resolvedArtifactAbsolutePath = resolveArtifactAbsolutePath({
    logicalArtifactPath,
    artifactMode: input.artifactMode,
  })
  const currentSourceText = input.artifactMode === 'write'
    ? await readCurrentSourceText(resolvedArtifactAbsolutePath)
    : null
  input.onProgress?.({
    summary: `正在编写 ${describeSlotLabel(input.slotId)}。`,
    currentAction: `writing ${input.slotId}`,
    latestAction: `writing ${input.slotId}`,
  })
  const artifactResponse = await input.agentBridge.prompt({
    cwd: input.cliRoot,
    provider: input.provider,
    modelId: input.modelId,
    prompt: buildWriterPromptForArtifactMode({
      prompt: input.prompt,
      artifactMode: input.artifactMode,
      logicalArtifactPath,
      currentSourceText,
    }),
    apiKey: input.apiKey,
  })
  const normalizedArtifactText = normalizeArtifactDocument({
    logicalArtifactPath,
    content: artifactResponse.text,
  })
  input.onProgress?.({
    summary: `已生成 ${describeSlotLabel(input.slotId)} 草稿，正在审查。`,
    currentAction: `reviewing ${input.slotId}`,
    latestAction: `drafted ${input.slotId}`,
    liveDraftTitle: describeSlotLabel(input.slotId),
    liveDraftText: normalizedArtifactText,
  })
  const validation = validateArtifactDocument({
    logicalArtifactPath,
    content: normalizedArtifactText,
    artifactSlotId: input.slotId,
    reviewerRoleId: input.reviewerRole.roleId,
  })
  let wroteArtifact = false

  if (input.shouldWriteArtifacts && input.artifactMode === 'sandbox-write') {
    await writeArtifact(resolvedArtifactAbsolutePath, normalizedArtifactText)
    wroteArtifact = true
  }

  const review = validation.isValid
    ? await reviewGoalArtifact({
        cliRoot: input.cliRoot,
        goal: input.goal,
        artifactMarkdown: normalizedArtifactText,
        apiKey: input.reviewerApiKey,
        provider: input.reviewerRole.provider,
        modelId: resolveProviderModelForRole(input.reviewerRole).resolvedModelId,
        agentBridge: input.agentBridge,
        artifactSlotId: input.slotId,
        reviewerRoleId: input.reviewerRole.roleId,
        reviewPrompt: buildArtifactReviewPrompt({
          goal: input.goal,
          stage: input.stage,
          artifactMarkdown: normalizedArtifactText,
          artifactSlotId: input.slotId,
        }),
      })
    : createValidationFailedReview({
        artifactSlotId: input.slotId,
        reviewerRoleId: input.reviewerRole.roleId,
        validation,
      })

  let realWriteGuard: RealWriteGuardResult | undefined

  if (input.artifactMode === 'write' && review.status === 'accepted') {
    const guard = await assessRealDocsWriteGuard({
      cliRoot: input.cliRoot,
      stage: input.stage,
      goal: input.goal,
      logicalArtifactPath,
      resolvedArtifactAbsolutePath,
      resolvedTargets: [{ slotId: input.slotId, path: logicalArtifactPath }],
      currentSourceText: currentSourceText ?? '',
      candidateText: normalizedArtifactText,
      candidateSummary: review.summary,
      reviewerApiKey: input.reviewerApiKey,
      reviewerRole: input.reviewerRole,
      agentBridge: input.agentBridge,
    })

    if (guard.conflictLevel === 'none') {
      await writeArtifact(resolvedArtifactAbsolutePath, normalizedArtifactText)
      wroteArtifact = true
      realWriteGuard = {
        ...guard,
        action: 'direct-write',
      }
    } else {
      const approved = await input.confirmRealWrite?.({
        stageId: input.stage.stageId,
        primaryOutputSlot: input.slotId,
        logicalArtifactPath,
        resolvedArtifactAbsolutePath,
        resolvedTargets: [{ slotId: input.slotId, path: logicalArtifactPath }],
        conflictLevel: guard.conflictLevel,
        summary: guard.summary,
        findings: guard.findings.map((finding) => finding.message),
        sourceSummary: summarizeDocumentForDisplay(currentSourceText ?? ''),
        candidateSummary: review.summary,
        canForceWrite: guard.conflictLevel === 'blocking',
      }) ?? false

      if (approved) {
        await writeArtifact(resolvedArtifactAbsolutePath, normalizedArtifactText)
        wroteArtifact = true
        realWriteGuard = {
          ...guard,
          action: 'confirmed-write',
        }
      } else {
        realWriteGuard = {
          ...guard,
          action: 'blocked',
        }
      }
    }
  }

  return {
    slotId: input.slotId,
    logicalArtifactPath,
    resolvedArtifactAbsolutePath,
    artifactText: normalizedArtifactText,
    review,
    wroteArtifact,
    realWriteGuard,
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

function resolveArtifactDetail(input: {
  stageResult: GoalStageExecutionResult
  slotId: SlotId
}): ArtifactExecutionDetail {
  const artifact = input.stageResult.artifactDetails.find((detail) => detail.slotId === input.slotId)

  if (!artifact) {
    throw new Error(`Missing artifact detail for slot ${input.slotId} in stage ${input.stageResult.stageId}`)
  }

  return artifact
}

function isRealWriteBlockedArtifact(artifact: ArtifactExecutionDetail): boolean {
  return artifact.realWriteGuard?.action === 'blocked'
}

async function assessRealDocsWriteGuard(input: {
  cliRoot: string
  stage: GoalToDocsStageContract
  goal: string
  logicalArtifactPath: string
  resolvedArtifactAbsolutePath: string
  resolvedTargets: ResolvedStageTarget[]
  currentSourceText: string
  candidateText: string
  candidateSummary: string
  reviewerApiKey: string
  reviewerRole: typeof DEFAULT_ROLE_CONFIGS[number]
  agentBridge: PiModelAgentBridge
}): Promise<Omit<RealWriteGuardResult, 'action'>> {
  const staticGuard = evaluateStaticRealDocsConflict({
    logicalArtifactPath: input.logicalArtifactPath,
    currentSourceText: input.currentSourceText,
    candidateText: input.candidateText,
  })

  if (staticGuard.conflictLevel === 'blocking') {
    return staticGuard
  }

  const response = await input.agentBridge.prompt({
    cwd: input.cliRoot,
    provider: input.reviewerRole.provider,
    modelId: resolveProviderModelForRole(input.reviewerRole).resolvedModelId,
    apiKey: input.reviewerApiKey,
    prompt: buildRealDocsWriteGuardPrompt({
      goal: input.goal,
      logicalArtifactPath: input.logicalArtifactPath,
      currentSourceText: input.currentSourceText,
      candidateText: input.candidateText,
      candidateSummary: input.candidateSummary,
      resolvedTargets: input.resolvedTargets,
    }),
  })

  const modelGuard = parseRealDocsWriteGuardResponse(response.text)

  return compareGuardSeverity(staticGuard, modelGuard) >= 0
    ? staticGuard
    : modelGuard
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

function createValidationFailedReview(input: {
  artifactSlotId: SlotId
  reviewerRoleId: ReviewResult['reviewerRoleId']
  validation: ArtifactValidationResult
}): ReviewResult {
  return {
    artifactSlotId: input.artifactSlotId,
    reviewerRoleId: input.reviewerRoleId,
    status: 'changes-requested',
    summary: input.validation.summary ?? '文档结构不符合固定模板要求',
    findings: input.validation.findings,
  }
}

function buildWriterPromptForArtifactMode(input: {
  prompt: string
  artifactMode: ArtifactMode
  logicalArtifactPath: string
  currentSourceText: string | null
}): string {
  if (input.artifactMode !== 'write') {
    return input.prompt
  }

  return [
    input.prompt,
    '',
    '你当前处于真实 docs 更新模式。',
    '- 必须基于当前真源页面更新，而不是把页面整体改写成另一个产品。',
    '- 必须保留页面类型、主要章节结构与 apps/oc-pi-cli 当前产品边界。',
    '- 仅补充或更新与当前阶段目标直接相关的信息。',
    `- 当前真实目标路径: ${input.logicalArtifactPath}`,
    '',
    '当前真源文档：',
    '```md',
    input.currentSourceText?.trim() || '当前页面为空，可按固定模板生成首版内容。',
    '```',
  ].join('\n')
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

function buildArtifactReviewPrompt(input: {
  goal: string
  stage: GoalToDocsStageContract
  artifactMarkdown: string
  artifactSlotId: SlotId
}): string {
  if (input.stage.stageId === 'goal-framing') {
    return buildReviewPrompt(input.goal, input.artifactMarkdown)
  }

  if (input.artifactSlotId === 'feature-plan') {
    return [
      '你是 doc-reviewer 文档审查者。',
      '请审查下面的 MVP Features MVP 功能清单草案。',
      '必须重点检查：front matter 是否只包含固定的 title 与 description，H1 是否正确，是否同时包含 Feature List 功能清单、MVP Scope MVP 范围、Prioritization Rule 优先级规则、Open Questions 待定问题。',
      '重要说明：该文档按当前协议本来就需要同时承载 feature-plan 功能规划槽位 与 mvp-scope MVP 范围槽位；只要 Feature List 与 MVP Scope 两个分区都清晰存在，就不能因为“双槽位共用一个文档”本身而判为问题。',
      '如果文档已经满足固定结构，即使条目内容较短或偏简洁，也应判为 accepted，不要因为还可以继续扩写就要求修改。',
      '如果文档在结构上合格，但写成了总结、复盘、泛化建议清单或模板外说明，应返回 changes-requested。',
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

  if (input.artifactSlotId === 'handoff-summary') {
    return [
      '你是 doc-reviewer 文档审查者。',
      '请审查下面的 Handoff Summary 交接摘要草案。',
      '必须重点检查：front matter 是否只包含固定的 title 与 description，H1 是否正确，是否同时包含 Summary 当前交接摘要、Confirmed Outputs 已确认产物、Recommended Next Actions 建议下一步动作、Open Questions 待确认问题。',
      '如果文档已经满足固定结构，即使条目内容较短或偏简洁，也应判为 accepted，不要因为还可以继续扩写就要求修改。',
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

  if (input.artifactSlotId === 'handoff-next-up') {
    return [
      '你是 doc-reviewer 文档审查者。',
      '请审查下面的 Handoff Next Up 下一步指引草案。',
      '必须重点检查：front matter 是否只包含固定的 title 与 description，H1 是否正确，是否同时包含 Current Focus 当前焦点、Immediate Actions 立即动作、Watch Items 观察项。',
      '如果文档已经满足固定结构，即使条目内容较短或偏简洁，也应判为 accepted，不要因为还可以继续扩写就要求修改。',
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

  return [
    '你是 goal-reviewer 目标审查者。',
    '请审查下面的 Capability Breakdown 能力拆解草案。',
    '必须重点检查：front matter 是否只包含 title 与 description，H1 是否正确，是否完整保留固定的五个二级标题，正文是否仍然是一级能力总览而不是其他文档类型。',
    '如果文档已经满足固定结构，即使条目内容较短或偏简洁，也应判为 accepted，不要因为还可以继续扩写就要求修改。',
    '如果文档在结构上合格，但写成了总结、前言、分析说明、问答或其他非能力地图文风，应返回 changes-requested。',
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

  if (input.logicalArtifactPath === 'apps/web-docs/content/docs/planning/mvp-features.md') {
    return normalizeDocumentFrontMatter({
      content: input.content,
      title: 'MVP Features MVP 功能清单',
      description: 'apps/oc-pi-cli 当前第一批核心功能与其作用边界定义',
      heading: '# MVP Features MVP 功能清单',
    })
  }

  if (input.logicalArtifactPath === 'apps/web-docs/content/docs/tasks/handoff-summary.md') {
    return normalizeDocumentFrontMatter({
      content: input.content,
      title: 'Handoff Summary 交接摘要',
      description: '汇总 apps/oc-pi-cli 当前规划闭环的确认结论与下一步交接信息',
      heading: '# Handoff Summary 交接摘要',
    })
  }

  if (input.logicalArtifactPath === 'apps/web-docs/content/docs/tasks/handoff-next-up.md') {
    return normalizeDocumentFrontMatter({
      content: input.content,
      title: 'Handoff Next Up 下一步指引',
      description: '基于 apps/oc-pi-cli 当前交接摘要提炼的动态下一步动作',
      heading: '# Handoff Next Up 下一步指引',
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

function validateArtifactDocument(input: {
  logicalArtifactPath: string
  content: string
  artifactSlotId: SlotId
  reviewerRoleId: ReviewResult['reviewerRoleId']
}): ArtifactValidationResult {
  switch (input.logicalArtifactPath) {
    case 'apps/web-docs/content/docs/capabilities/overview.mdx':
      return validateCapabilitiesOverviewDocument(input.content)
    case 'apps/web-docs/content/docs/planning/mvp-features.md':
      return validateMvpFeaturesDocument(input.content)
    case 'apps/web-docs/content/docs/tasks/handoff-summary.md':
      return validateHandoffSummaryDocument(input.content)
    case 'apps/web-docs/content/docs/tasks/handoff-next-up.md':
      return validateHandoffNextUpDocument(input.content)
    default:
      return {
        isValid: true,
        findings: [],
      }
  }
}

function validateCapabilitiesOverviewDocument(content: string): ArtifactValidationResult {
  const findings: ReviewFinding[] = []
  const requiredLines = [
    'title: Capabilities Overview 能力总览',
    'description: apps/oc-pi-cli 的一级能力地图与能力边界概览',
    '# Capabilities Overview 能力总览',
    '## Capability Map 能力地图',
    '## Rule 规则',
    '## Capability to MVP Mapping 能力到 MVP 映射',
    '## Capability Dependency Sketch 能力依赖草图',
    '## External Baseline 外部能力基线',
  ]

  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/m)
  const frontMatterBody = frontMatterMatch?.[1] ?? ''
  const frontMatterLines = frontMatterBody
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const allowedFrontMatterLines = new Set([
    'title: Capabilities Overview 能力总览',
    'description: apps/oc-pi-cli 的一级能力地图与能力边界概览',
  ])

  if (!content.startsWith('---\n')) {
    findings.push({
      message: 'capabilities overview 必须从 front matter 起始，不能在模板前输出说明、前言或其他额外文本。',
      severity: 'medium',
    })
  }

  if (frontMatterLines.length !== 2 || frontMatterLines.some((line) => !allowedFrontMatterLines.has(line))) {
    findings.push({
      message: 'capabilities overview front matter 必须且只能包含 title 与 description 两个固定字段。',
      severity: 'medium',
    })
  }

  for (const requiredLine of requiredLines) {
    if (!content.includes(requiredLine)) {
      findings.push({
        message: `缺少固定结构内容: ${requiredLine}`,
        severity: 'medium',
      })
    }
  }

  return findings.length === 0
    ? {
        isValid: true,
        findings: [],
      }
    : {
        isValid: false,
        summary: '能力总览文档未通过固定模板结构校验',
        findings,
      }
}

function validateMvpFeaturesDocument(content: string): ArtifactValidationResult {
  const findings: ReviewFinding[] = []
  const requiredLines = [
    'title: MVP Features MVP 功能清单',
    'description: apps/oc-pi-cli 当前第一批核心功能与其作用边界定义',
    '# MVP Features MVP 功能清单',
    '## Feature List 功能清单',
    '## MVP Scope MVP 范围',
    '## Prioritization Rule 优先级规则',
    '## Open Questions 待定问题',
  ]

  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/m)
  const frontMatterBody = frontMatterMatch?.[1] ?? ''
  const frontMatterLines = frontMatterBody
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const allowedFrontMatterLines = new Set([
    'title: MVP Features MVP 功能清单',
    'description: apps/oc-pi-cli 当前第一批核心功能与其作用边界定义',
  ])

  if (!content.startsWith('---\n')) {
    findings.push({
      message: 'mvp features 必须从 front matter 起始，不能在模板前输出说明、前言或其他额外文本。',
      severity: 'medium',
    })
  }

  if (frontMatterLines.length !== 2 || frontMatterLines.some((line) => !allowedFrontMatterLines.has(line))) {
    findings.push({
      message: 'mvp features front matter 必须且只能包含 title 与 description 两个固定字段。',
      severity: 'medium',
    })
  }

  for (const requiredLine of requiredLines) {
    if (!content.includes(requiredLine)) {
      findings.push({
        message: `缺少固定结构内容: ${requiredLine}`,
        severity: 'medium',
      })
    }
  }

  return findings.length === 0
    ? {
        isValid: true,
        findings: [],
      }
    : {
        isValid: false,
        summary: 'MVP 功能清单文档未通过固定模板结构校验',
        findings,
      }
}

function validateHandoffSummaryDocument(content: string): ArtifactValidationResult {
  const findings: ReviewFinding[] = []
  const requiredLines = [
    'title: Handoff Summary 交接摘要',
    'description: 汇总 apps/oc-pi-cli 当前规划闭环的确认结论与下一步交接信息',
    '# Handoff Summary 交接摘要',
    '## Summary 当前交接摘要',
    '## Confirmed Outputs 已确认产物',
    '## Recommended Next Actions 建议下一步动作',
    '## Open Questions 待确认问题',
  ]

  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/m)
  const frontMatterBody = frontMatterMatch?.[1] ?? ''
  const frontMatterLines = frontMatterBody
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const allowedFrontMatterLines = new Set([
    'title: Handoff Summary 交接摘要',
    'description: 汇总 apps/oc-pi-cli 当前规划闭环的确认结论与下一步交接信息',
  ])

  if (!content.startsWith('---\n')) {
    findings.push({
      message: 'handoff summary 必须从 front matter 起始，不能在模板前输出说明、前言或其他额外文本。',
      severity: 'medium',
    })
  }

  if (frontMatterLines.length !== 2 || frontMatterLines.some((line) => !allowedFrontMatterLines.has(line))) {
    findings.push({
      message: 'handoff summary front matter 必须且只能包含 title 与 description 两个固定字段。',
      severity: 'medium',
    })
  }

  for (const requiredLine of requiredLines) {
    if (!content.includes(requiredLine)) {
      findings.push({
        message: `缺少固定结构内容: ${requiredLine}`,
        severity: 'medium',
      })
    }
  }

  return findings.length === 0
    ? {
        isValid: true,
        findings: [],
      }
    : {
        isValid: false,
        summary: '交接摘要文档未通过固定模板结构校验',
        findings,
      }
}

function validateHandoffNextUpDocument(content: string): ArtifactValidationResult {
  const findings: ReviewFinding[] = []
  const requiredLines = [
    'title: Handoff Next Up 下一步指引',
    'description: 基于 apps/oc-pi-cli 当前交接摘要提炼的动态下一步动作',
    '# Handoff Next Up 下一步指引',
    '## Current Focus 当前焦点',
    '## Immediate Actions 立即动作',
    '## Watch Items 观察项',
  ]

  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/m)
  const frontMatterBody = frontMatterMatch?.[1] ?? ''
  const frontMatterLines = frontMatterBody
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const allowedFrontMatterLines = new Set([
    'title: Handoff Next Up 下一步指引',
    'description: 基于 apps/oc-pi-cli 当前交接摘要提炼的动态下一步动作',
  ])

  if (!content.startsWith('---\n')) {
    findings.push({
      message: 'handoff next up 必须从 front matter 起始，不能在模板前输出说明、前言或其他额外文本。',
      severity: 'medium',
    })
  }

  if (frontMatterLines.length !== 2 || frontMatterLines.some((line) => !allowedFrontMatterLines.has(line))) {
    findings.push({
      message: 'handoff next up front matter 必须且只能包含 title 与 description 两个固定字段。',
      severity: 'medium',
    })
  }

  for (const requiredLine of requiredLines) {
    if (!content.includes(requiredLine)) {
      findings.push({
        message: `缺少固定结构内容: ${requiredLine}`,
        severity: 'medium',
      })
    }
  }

  return findings.length === 0
    ? {
        isValid: true,
        findings: [],
      }
    : {
        isValid: false,
        summary: '下一步指引文档未通过固定模板结构校验',
        findings,
      }
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
    '失败条件：如果你输出模板外的说明、总结、前言、解释或编号段落，结果会被直接拒绝。',
    '你必须从第一行 --- 开始输出，且只能输出最终文档本身。',
    '你必须严格填充下面这个固定模板，不允许改 front matter 字段名，不允许改 H1，不允许改二级标题名称，不允许输出其他文档结构：',
    '```md',
    '---',
    'title: Capabilities Overview 能力总览',
    'description: apps/oc-pi-cli 的一级能力地图与能力边界概览',
    '---',
    '',
    '# Capabilities Overview 能力总览',
    '',
    '一句中文说明本页用途。',
    '',
    '## Capability Map 能力地图',
    '',
    '- 列出 5-8 个一级能力模块，使用 `English + 中文语义` 命名。',
    '- 能力模块必须贴近当前产品语义，例如 Conversation Orchestration 对话编排、Loop Engine 循环引擎、Template Engine 模板引擎、Docs Generation 文档生成、Code Generation 代码生成、MCP Integration MCP 集成、Skills Integration Skills 集成、Context Management 上下文管理。',
    '- 不要发散成硬件扫描器、设备探测器、部署平台之类的新产品方向。',
    '',
    '## Rule 规则',
    '',
    '- 给出 2-4 条规则，说明一级能力模块只描述产品一级能力，不描述单条任务。',
    '',
    '## Capability to MVP Mapping 能力到 MVP 映射',
    '',
    '| Capability 能力模块 | Supports MVP Features 支持的 MVP 功能 |',
    '|---|---|',
    '| Conversation Orchestration 对话编排 | `goal-to-docs`、`interactive-workbench` |',
    '',
    '## Capability Dependency Sketch 能力依赖草图',
    '',
    'Capability Dependency Sketch 能力依赖草图用于说明当前能力模块之间的主干依赖关系。',
    '',
    '```text',
    'Conversation Orchestration 对话编排',
    '  -> Context Management 上下文管理',
    '  -> Docs Generation 文档生成',
    '```',
    '',
    '## External Baseline 外部能力基线',
    '',
    '- 给出 1-3 条外部基线或已有能力复用入口。',
    '```',
    '补充规则：',
    '- 文档目标路径是 apps/web-docs/content/docs/capabilities/overview.mdx。',
    '- 首次出现的英文术语必须带中文解释。',
    '- 如果章节标题是技术术语，章节第一句话必须用中文解释。',
    '- 不要留下只有英文没有中文解释的术语。',
    '- 产物必须仍然是能力总览页，而不是 capability domains / boundaries / risks 风格的另一种文档。',
    '',
    `原始用户目标: ${input.goal}`,
    '',
    '已接受的 Product Goal Draft 产品目标草案：',
    input.productGoalArtifact,
  ].join('\n')
}

function buildFeaturePlanningPrompt(input: {
  goal: string
  capabilityMapArtifact: string
}): string {
  return [
    '你正在为 apps/oc-pi-cli 生成 MVP Features MVP 功能清单文档。',
    '输出必须是 Markdown，并直接给出完整文档内容。',
    '失败条件：如果你输出模板外的说明、总结、建议清单、问答或额外前言，结果会被直接拒绝。',
    '你必须从第一行 --- 开始输出，且只能输出最终文档本身。',
    '你必须严格填充下面这个固定模板，不允许改 front matter 字段名，不允许改 H1，不允许改二级标题名称，不允许输出其他文档结构：',
    '```md',
    '---',
    'title: MVP Features MVP 功能清单',
    'description: apps/oc-pi-cli 当前第一批核心功能与其作用边界定义',
    '---',
    '',
    '# MVP Features MVP 功能清单',
    '',
    '一句中文说明本页用途。',
    '',
    '## Feature List 功能清单',
    '',
    '- 列出 4-8 个 feature 功能单元，使用 `kebab-case 英文标识 + 中文语义` 或 `English + 中文语义` 一致风格。',
    '- 这些 feature 必须来自 capability map 的一级能力，不要跳出当前产品边界。',
    '',
    '## MVP Scope MVP 范围',
    '',
    '- 列出当前阶段必须进入 MVP 的功能项。',
    '- 明确哪些能力暂不进入当前范围。',
    '',
    '## Prioritization Rule 优先级规则',
    '',
    '- 给出 3-5 条优先级规则，说明为什么这些 feature 应先做。',
    '',
    '## Open Questions 待定问题',
    '',
    '- 给出 2-5 个待定问题或后续需要确认的事项。',
    '```',
    '补充规则：',
    '- 文档目标路径是 apps/web-docs/content/docs/planning/mvp-features.md。',
    '- 该文档需要同时承载 feature-plan 功能规划槽位 与 mvp-scope MVP 范围槽位。',
    '- Feature List 功能清单 负责表达 feature-plan 功能规划槽位语义。',
    '- MVP Scope MVP 范围 负责表达 mvp-scope MVP 范围槽位语义。',
    '- 这两个槽位共享同一个物理文档是当前协议要求，不是冲突。',
    '- 首次出现的英文术语必须带中文解释。',
    '- 如果章节标题是技术术语，章节第一句话必须用中文解释。',
    '- 不要留下只有英文没有中文解释的术语。',
    '',
    `原始用户目标: ${input.goal}`,
    '',
    '已接受的 Capability Map 能力地图草案：',
    input.capabilityMapArtifact,
  ].join('\n')
}

function buildHandoffSummaryPrompt(input: {
  goal: string
  productGoalArtifact: string
  capabilityMapArtifact: string
  featurePlanArtifact: string
  mvpScopeArtifact: string
}): string {
  return [
    '你正在为 apps/oc-pi-cli 生成 Handoff Summary 交接摘要文档。',
    '输出必须是 Markdown，并直接给出完整文档内容。',
    '失败条件：如果你输出模板外的说明、前言、分析过程或额外建议，结果会被直接拒绝。',
    '你必须从第一行 --- 开始输出，且只能输出最终文档本身。',
    '内容风格要求：每个分区使用简洁项目符号，不要写长篇分析，不要写编号执行计划，不要在条目下继续嵌套多层说明。',
    '你必须严格填充下面这个固定模板，不允许改 front matter 字段名，不允许改 H1，不允许改二级标题名称，不允许输出其他文档结构：',
    '```md',
    '---',
    'title: Handoff Summary 交接摘要',
    'description: 汇总 apps/oc-pi-cli 当前规划闭环的确认结论与下一步交接信息',
    '---',
    '',
    '# Handoff Summary 交接摘要',
    '',
    '一句中文说明本页用途。',
    '',
    '## Summary 当前交接摘要',
    '',
    '- 用 2-4 条总结当前闭环已经确认的方向。',
    '',
    '## Confirmed Outputs 已确认产物',
    '',
    '- 分别说明 product-goal、capability-map、feature-plan、mvp-scope 的确认结果。',
    '',
    '## Recommended Next Actions 建议下一步动作',
    '',
    '- 给出 3-5 条下一步建议，按优先级排序。',
    '',
    '## Open Questions 待确认问题',
    '',
    '- 给出 2-5 个仍待确认的问题。',
    '```',
    '补充规则：',
    '- 文档目标路径是 apps/web-docs/content/docs/tasks/handoff-summary.md。',
    '- 内容必须只做收束、确认与交接，不得重新定义新的产品方向。',
    '- 首次出现的英文术语必须带中文解释。',
    '- 如果章节标题是技术术语，章节第一句话必须用中文解释。',
    '- 不要留下只有英文没有中文解释的术语。',
    '',
    `原始用户目标: ${input.goal}`,
    '',
    '已接受的 Product Goal 产品目标：',
    input.productGoalArtifact,
    '',
    '已接受的 Capability Map 能力地图：',
    input.capabilityMapArtifact,
    '',
    '已接受的 Feature Plan 功能规划：',
    input.featurePlanArtifact,
    '',
    '已接受的 MVP Scope MVP 范围：',
    input.mvpScopeArtifact,
  ].join('\n')
}

function buildHandoffNextUpPrompt(input: {
  goal: string
  handoffSummaryArtifact: string
  productGoalArtifact: string
  capabilityMapArtifact: string
  featurePlanArtifact: string
  mvpScopeArtifact: string
}): string {
  return [
    '你正在为 apps/oc-pi-cli 生成 Handoff Next Up 下一步指引文档。',
    '输出必须是 Markdown，并直接给出完整文档内容。',
    '失败条件：如果你输出模板外的说明、前言、分析过程或额外建议，结果会被直接拒绝。',
    '你必须从第一行 --- 开始输出，且只能输出最终文档本身。',
    '内容风格要求：只保留简洁的当前焦点、立即动作和观察项，不要把本页写成完整交接摘要或路线图。',
    '你必须严格填充下面这个固定模板，不允许改 front matter 字段名，不允许改 H1，不允许改二级标题名称，不允许输出其他文档结构：',
    '```md',
    '---',
    'title: Handoff Next Up 下一步指引',
    'description: 基于 apps/oc-pi-cli 当前交接摘要提炼的动态下一步动作',
    '---',
    '',
    '# Handoff Next Up 下一步指引',
    '',
    '一句中文说明本页用途。',
    '',
    '## Current Focus 当前焦点',
    '',
    '- 用 2-4 条说明当前最应聚焦的方向。',
    '',
    '## Immediate Actions 立即动作',
    '',
    '- 给出 3-5 条可立刻执行的动作。',
    '',
    '## Watch Items 观察项',
    '',
    '- 给出 2-4 条执行时需要持续观察的风险或依赖。',
    '```',
    '补充规则：',
    '- 文档目标路径是 apps/web-docs/content/docs/tasks/handoff-next-up.md。',
    '- 内容必须表现为动态下一步动作，而不是完整交接摘要或新的路线图。',
    '- 首次出现的英文术语必须带中文解释。',
    '- 如果章节标题是技术术语，章节第一句话必须用中文解释。',
    '- 不要留下只有英文没有中文解释的术语。',
    '',
    `原始用户目标: ${input.goal}`,
    '',
    '已接受的 Handoff Summary 交接摘要：',
    input.handoffSummaryArtifact,
    '',
    '上游参考：Product Goal 产品目标',
    input.productGoalArtifact,
    '',
    '上游参考：Capability Map 能力地图',
    input.capabilityMapArtifact,
    '',
    '上游参考：Feature Plan 功能规划',
    input.featurePlanArtifact,
    '',
    '上游参考：MVP Scope MVP 范围',
    input.mvpScopeArtifact,
  ].join('\n')
}

function buildRealDocsWriteGuardPrompt(input: {
  goal: string
  logicalArtifactPath: string
  currentSourceText: string
  candidateText: string
  candidateSummary: string
  resolvedTargets: ResolvedStageTarget[]
}): string {
  return [
    '你是 real-docs-guard 真实文档写入守卫。',
    '请比较当前真源文档、当前用户 goal 与候选文档，判断是否可以安全覆盖真实 docs。',
    '判断标准：',
    '- none: 候选文档仍是同一页面类型、同一产品边界、与当前 goal 无明显冲突。',
    '- warning: 候选文档大体相关，但对原文重点、边界或当前 goal 的表达存在可疑漂移，需要人工确认。',
    '- blocking: 候选文档明显偏离当前产品边界、页面职责，或已经像是另一个产品方向，默认必须阻止覆盖。',
    '- product/vision.md 必须继续围绕 apps/oc-pi-cli、goal-to-docs、review-loop、interactive-workbench、agent-role-config 等主线。',
    '- capabilities/overview.mdx 必须继续是一级能力地图页面，而不是另一个产品介绍。',
    '- planning/mvp-features.md 必须继续同时承载 feature-plan 功能规划 与 mvp-scope MVP 范围 两个槽位语义。',
    '- tasks/handoff-summary.md 必须继续是阶段性交接摘要页，包含 Summary、Confirmed Outputs、Recommended Next Actions、Open Questions。',
    '- tasks/handoff-next-up.md 必须继续是动态下一步动作页，包含 Current Focus、Immediate Actions、Watch Items。',
    '只允许输出以下纯文本格式：',
    'CONFLICT: none 或 CONFLICT: warning 或 CONFLICT: blocking',
    'SUMMARY: 一句中文摘要',
    '如果存在问题，可额外输出一到三行 FINDING: <问题描述>',
    '如果无问题，不要输出 FINDING。',
    '',
    `目标路径: ${input.logicalArtifactPath}`,
    `解析槽位: ${input.resolvedTargets.map((target) => `${target.slotId} -> ${target.path}`).join(', ')}`,
    `当前用户 goal: ${input.goal}`,
    `候选文档摘要: ${input.candidateSummary}`,
    '',
    '当前真源文档：',
    '```md',
    input.currentSourceText,
    '```',
    '',
    '候选文档：',
    '```md',
    input.candidateText,
    '```',
  ].join('\n')
}

function buildTimelineSummary(
  stageResult: ExecuteStageOutput,
  artifactMode: ArtifactMode,
): string {
  const timelineArtifact = stageResult.stageResult.artifactDetails.find(
    (artifact) => artifact.realWriteGuard?.action === 'blocked' || artifact.realWriteGuard?.action === 'confirmed-write',
  )

  if (timelineArtifact?.realWriteGuard?.action === 'blocked') {
    return `Blocked real write for ${timelineArtifact.slotId} at ${timelineArtifact.logicalArtifactPath}: ${timelineArtifact.realWriteGuard.summary}`
  }

  if (timelineArtifact?.realWriteGuard?.action === 'confirmed-write') {
    return `Wrote ${timelineArtifact.slotId} to ${timelineArtifact.logicalArtifactPath} after confirmation`
  }

  if (artifactMode === 'write') {
    return `Wrote ${stageResult.review.artifactSlotId} to ${stageResult.stageResult.logicalArtifactPath}`
  }

  if (artifactMode === 'sandbox-write') {
    return `Wrote sandbox ${stageResult.review.artifactSlotId} to ${stageResult.stageResult.logicalArtifactPath}`
  }

  return `Previewed ${stageResult.review.artifactSlotId} at ${stageResult.stageResult.logicalArtifactPath}`
}

function applyProgressToWorkbenchState(
  state: WorkbenchState,
  event: GoalToDocsProgressEvent,
  onWorkbenchStateChange?: (state: WorkbenchState) => void,
): WorkbenchState {
  const nextState = applyGoalToDocsProgressToWorkbench(state, event)

  onWorkbenchStateChange?.(nextState)

  return nextState
}

function describeStageLabel(stageId: GoalToDocsStageContract['stageId']): string {
  switch (stageId) {
    case 'goal-framing':
      return '产品愿景'
    case 'capability-breakdown':
      return '产品能力大纲'
    case 'feature-planning':
      return '功能规划'
    case 'handoff-summary':
      return '交接摘要'
    default:
      return stageId
  }
}

function describeSlotLabel(slotId: SlotId): string {
  switch (slotId) {
    case 'product-goal':
      return '产品愿景文档'
    case 'capability-map':
      return '产品能力大纲文档'
    case 'feature-plan':
      return '功能规划文档'
    case 'mvp-scope':
      return 'MVP 范围文档'
    case 'handoff-summary':
      return '交接摘要文档'
    case 'handoff-next-up':
      return '下一步指引文档'
    default:
      return slotId
  }
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

async function readCurrentSourceText(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return ''
    }

    throw error
  }
}

function canContinueAfterStage(stageResult: GoalStageExecutionResult): boolean {
  return stageResult.review.status === 'accepted' && !isRealWriteBlocked(stageResult)
}

function isRealWriteBlocked(stageResult: GoalStageExecutionResult): boolean {
  return stageResult.artifactDetails.some(isRealWriteBlockedArtifact)
}

function resolveStageRealWriteGuard(
  artifacts: ArtifactExecutionDetail[],
): RealWriteGuardResult | undefined {
  const blockedGuard = artifacts.find((artifact) => artifact.realWriteGuard?.action === 'blocked')?.realWriteGuard

  if (blockedGuard) {
    return blockedGuard
  }

  return artifacts.find((artifact) => artifact.realWriteGuard?.action === 'confirmed-write')?.realWriteGuard
    ?? artifacts.find((artifact) => artifact.realWriteGuard?.action === 'direct-write')?.realWriteGuard
}

function summarizeDocumentForDisplay(content: string): string {
  const summaryLines = stripLeadingFrontMatter(content)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('## '))
    .slice(0, 3)

  return summaryLines.join(' / ').slice(0, 240) || '当前真源页面为空'
}

function countMatchedAnchorGroups(content: string, groups: readonly string[][]): number {
  return groups.filter((group) => group.some((anchor) => content.includes(anchor))).length
}

function countRetainedAnchorGroups(
  sourceContent: string,
  candidateContent: string,
  groups: readonly string[][],
): number {
  return groups.filter((group) => {
    const presentInSource = group.some((anchor) => sourceContent.includes(anchor))
    const presentInCandidate = group.some((anchor) => candidateContent.includes(anchor))

    return presentInSource && presentInCandidate
  }).length
}

function addUniqueFinding(
  findings: ReviewFinding[],
  message: string,
  severity: ReviewFinding['severity'],
): void {
  if (findings.some((finding) => finding.message === message)) {
    return
  }

  findings.push({
    message,
    severity,
  })
}

function evaluateStaticRealDocsConflict(input: {
  logicalArtifactPath: string
  currentSourceText: string
  candidateText: string
}): Omit<RealWriteGuardResult, 'action'> {
  const candidate = input.candidateText.toLowerCase()
  const source = input.currentSourceText.toLowerCase()
  const findings: ReviewFinding[] = []
  let productSignalStrength: 'strong' | 'weak' = 'strong'
  const strongDriftGroups = [
    ['firmware', '固件'],
    ['flash', '烧录'],
    ['target device', '目标设备'],
    ['readback', '读回校验'],
    ['checksum', '校验算法'],
  ] satisfies string[][]
  const softDriftGroups = [
    ['hardware', '硬件'],
    ['device', '设备'],
    ['rollback', '回滚'],
  ] satisfies string[][]
  const strongDriftCount = countMatchedAnchorGroups(candidate, strongDriftGroups)
  const softDriftCount = countMatchedAnchorGroups(candidate, softDriftGroups)

  if (input.logicalArtifactPath === 'apps/web-docs/content/docs/product/vision.md') {
    const subjectGroups = [
      ['apps/oc-pi-cli'],
      ['ai harness', '人工智能编排框架'],
    ] satisfies string[][]
    const productDirectionGroups = [
      ['goal-to-docs', '目标到文档'],
      ['review-loop', '审查循环'],
      ['interactive-workbench', '交互工作台'],
      ['agent-role-config', '角色化代理配置'],
      ['artifact-routing', '产物路由'],
      ['project bootstrap', '项目初始化'],
      ['mcp', 'mcp 调用', 'mcp 集成'],
      ['skills', 'skills 调用', 'skills 集成'],
    ] satisfies string[][]
    const subjectCount = countMatchedAnchorGroups(candidate, subjectGroups)
    const productDirectionCount = countMatchedAnchorGroups(candidate, productDirectionGroups)
    const retainedDirectionCount = countRetainedAnchorGroups(source, candidate, productDirectionGroups)

    if (subjectCount === 0 || productDirectionCount <= 2 || retainedDirectionCount <= 1) {
      productSignalStrength = 'weak'
    }

    if (subjectCount === 0) {
      addUniqueFinding(
        findings,
        '候选 Product Vision 产品愿景 未继续明确围绕 apps/oc-pi-cli 当前产品展开。',
        'high',
      )
    }

    if (productDirectionCount <= 1 && strongDriftCount >= 2) {
      addUniqueFinding(
        findings,
        '候选 Product Vision 产品愿景 缺少当前产品主线锚点，却出现了明显偏向其他产品方向的术语。',
        'high',
      )
    }

    if (retainedDirectionCount === 0 && productDirectionCount <= 2 && strongDriftCount >= 1) {
      addUniqueFinding(
        findings,
        '候选 Product Vision 产品愿景 与当前真源页面几乎没有共享的主线能力锚点，且出现了越界漂移信号。',
        'high',
      )
    }

    if (retainedDirectionCount <= 1 && productDirectionCount <= 2 && (strongDriftCount >= 1 || softDriftCount >= 2)) {
      addUniqueFinding(
        findings,
        '候选 Product Vision 产品愿景 只保留了很少的现有产品主线锚点，建议人工确认是否仍属于同一产品方向。',
        'medium',
      )
    }
  }

  if (input.logicalArtifactPath === 'apps/web-docs/content/docs/capabilities/overview.mdx') {
    const capabilityGroups = [
      ['conversation orchestration', '对话编排'],
      ['loop engine', '循环引擎'],
      ['template engine', '模板引擎'],
      ['docs generation', '文档生成'],
      ['code generation', '代码生成'],
      ['mcp integration', 'mcp 集成'],
      ['skills integration', 'skills 集成'],
      ['context management', '上下文管理'],
    ] satisfies string[][]
    const capabilityCount = countMatchedAnchorGroups(candidate, capabilityGroups)
    const retainedCapabilityCount = countRetainedAnchorGroups(source, candidate, capabilityGroups)

    if (capabilityCount < 5 || retainedCapabilityCount < 4) {
      productSignalStrength = 'weak'
    }

    if (capabilityCount < 3) {
      addUniqueFinding(
        findings,
        '候选 Capabilities Overview 能力总览 没有继续保持一级能力地图的核心能力锚点。',
        'high',
      )
    }

    if (capabilityCount <= 2 && strongDriftCount >= 2) {
      addUniqueFinding(
        findings,
        '候选 Capabilities Overview 能力总览 的能力锚点明显不足，却出现了偏向其他产品方向的信号。',
        'high',
      )
    }

    if (capabilityCount < 5 || retainedCapabilityCount < 4) {
      addUniqueFinding(
        findings,
        '候选 Capabilities Overview 能力总览 保留的一级能力模块偏少，建议人工确认是否仍是同一张能力地图。',
        'medium',
      )
    }
  }

  if (input.logicalArtifactPath === 'apps/web-docs/content/docs/planning/mvp-features.md') {
    const productFeatureGroups = [
      ['goal-to-docs', '目标到文档'],
      ['review-loop', '审查循环'],
      ['interactive-workbench', '交互工作台'],
      ['agent-role-config', '角色化代理配置'],
      ['artifact-routing', '产物路由'],
      ['project bootstrap', '项目初始化'],
      ['conversation orchestration', '对话编排'],
      ['context management', '上下文管理'],
      ['docs generation', '文档生成'],
      ['template engine', '模板引擎'],
      ['skills integration', 'skills 集成'],
      ['mcp integration', 'mcp 集成'],
    ] satisfies string[][]
    const sharedSlotGroups = [
      ['feature list', '功能清单'],
      ['mvp scope', 'mvp 范围'],
      ['prioritization rule', '优先级规则'],
      ['open questions', '待定问题'],
    ] satisfies string[][]
    const productFeatureCount = countMatchedAnchorGroups(candidate, productFeatureGroups)
    const sharedSlotCount = countMatchedAnchorGroups(candidate, sharedSlotGroups)

    if (productFeatureCount < 5 || sharedSlotCount < 3) {
      productSignalStrength = 'weak'
    }

    if (productFeatureCount <= 2 && strongDriftCount >= 2) {
      addUniqueFinding(
        findings,
        '候选 MVP Features MVP 功能清单 几乎没有保留当前产品功能主线，却明显转向了其他产品方向。',
        'high',
      )
    }

    if (sharedSlotCount < 3) {
      addUniqueFinding(
        findings,
        '候选 MVP Features MVP 功能清单 对共享文档职责的表达偏弱，建议人工确认是否仍同时承载 feature-plan 与 mvp-scope。',
        'medium',
      )
    }

    if (productFeatureCount < 4 && (strongDriftCount >= 1 || softDriftCount >= 2)) {
      addUniqueFinding(
        findings,
        '候选 MVP Features MVP 功能清单 当前产品功能锚点偏少，且出现了可疑的越界漂移信号。',
        'medium',
      )
    }
  }

  if (input.logicalArtifactPath === 'apps/web-docs/content/docs/tasks/handoff-summary.md') {
    const summaryGroups = [
      ['handoff summary', '交接摘要'],
      ['summary', '当前交接摘要'],
      ['confirmed outputs', '已确认产物'],
      ['recommended next actions', '建议下一步动作'],
      ['open questions', '待确认问题'],
    ] satisfies string[][]
    const summaryCount = countMatchedAnchorGroups(candidate, summaryGroups)
    const retainedSummaryCount = countRetainedAnchorGroups(source, candidate, summaryGroups)

    if (summaryCount < 4 || retainedSummaryCount < 2) {
      productSignalStrength = 'weak'
      addUniqueFinding(
        findings,
        '候选 Handoff Summary 交接摘要 没有继续保持固定摘要结构与交接职责锚点。',
        summaryCount < 3 ? 'high' : 'medium',
      )
    }
  }

  if (input.logicalArtifactPath === 'apps/web-docs/content/docs/tasks/handoff-next-up.md') {
    const nextUpGroups = [
      ['handoff next up', '下一步指引'],
      ['current focus', '当前焦点'],
      ['immediate actions', '立即动作'],
      ['watch items', '观察项'],
    ] satisfies string[][]
    const nextUpCount = countMatchedAnchorGroups(candidate, nextUpGroups)
    const retainedNextUpCount = countRetainedAnchorGroups(source, candidate, nextUpGroups)

    if (nextUpCount < 3 || retainedNextUpCount < 1) {
      productSignalStrength = 'weak'
      addUniqueFinding(
        findings,
        '候选 Handoff Next Up 下一步指引 没有继续保持动态下一步动作的固定结构与页面职责。',
        nextUpCount < 2 ? 'high' : 'medium',
      )
    }
  }

  if (source.includes('apps/oc-pi-cli') && !candidate.includes('apps/oc-pi-cli')) {
    addUniqueFinding(
      findings,
      '候选文档丢失了当前真源中明确存在的 apps/oc-pi-cli 产品主体。',
      input.logicalArtifactPath === 'apps/web-docs/content/docs/product/vision.md' ? 'high' : 'medium',
    )
  }

  if (strongDriftCount >= 3 && productSignalStrength === 'weak') {
    addUniqueFinding(
      findings,
      '候选文档包含多处硬件写入或设备校验方向术语，疑似偏离当前产品边界。',
      'high',
    )
  } else if (strongDriftCount >= 2 || (strongDriftCount >= 1 && softDriftCount >= 2)) {
    addUniqueFinding(
      findings,
      '候选文档出现了多处与硬件写入或设备校验相关的漂移信号，建议人工确认。',
      'medium',
    )
  }

  if (findings.some((finding) => finding.severity === 'high')) {
    return {
      conflictLevel: 'blocking',
      summary: '静态语义边界校验判定候选文档已明显偏离当前真实 docs 页面职责。',
      findings,
    }
  }

  if (findings.length > 0) {
    return {
      conflictLevel: 'warning',
      summary: '静态语义边界校验发现候选文档存在可疑漂移，需要人工确认。',
      findings,
    }
  }

  return {
    conflictLevel: 'none',
    summary: '静态语义边界校验未发现明显冲突。',
    findings: [],
  }
}

function parseRealDocsWriteGuardResponse(text: string): Omit<RealWriteGuardResult, 'action'> {
  const conflictMatch = text.match(/^CONFLICT:\s*(none|warning|blocking)$/m)
  const summaryMatch = text.match(/^SUMMARY:\s*(.+)$/m)
  const findings = text
    .split('\n')
    .filter((line) => line.startsWith('FINDING:'))
    .map((line): ReviewFinding => ({
      message: line.replace(/^FINDING:\s*/, '').trim(),
      severity: 'medium',
    }))

  if (!conflictMatch || !summaryMatch) {
    return {
      conflictLevel: 'blocking',
      summary: '真实 docs 语义冲突检测结果无法解析，已默认阻止覆盖。',
      findings: [
        {
          message: 'real-docs-guard 输出不符合预期格式，无法安全判断是否可以覆盖真实 docs。',
          severity: 'high',
        },
      ],
    }
  }

  return {
    conflictLevel: conflictMatch[1] as RealDocsConflictLevel,
    summary: summaryMatch[1]?.trim() ?? '真实 docs 语义冲突检测未返回摘要，已按保守策略处理。',
    findings,
  }
}

function compareGuardSeverity(
  left: Omit<RealWriteGuardResult, 'action'>,
  right: Omit<RealWriteGuardResult, 'action'>,
): number {
  return conflictSeverity(left.conflictLevel) - conflictSeverity(right.conflictLevel)
}

function conflictSeverity(level: RealDocsConflictLevel): number {
  switch (level) {
    case 'blocking':
      return 2
    case 'warning':
      return 1
    case 'none':
    default:
      return 0
  }
}
