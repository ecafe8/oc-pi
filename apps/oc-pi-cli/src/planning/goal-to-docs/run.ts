import { resolveSlotTarget } from '@/routing/resolve-slot-target.js'
import { runReviewLoop } from '@/review/run-review-loop.js'
import type { GoalToDocsRunRecord, GoalToDocsStageContract } from '@/planning/goal-to-docs/types.js'
import {
  createGoalToDocsRunRecord,
  setGoalToDocsCurrentStage,
  updateGoalToDocsStageStatus,
} from '@/planning/goal-to-docs/state.js'
import type { RoleConfig, SlotDefinition } from '@/shared/types/artifacts.js'
import type { ReviewFinding, ReviewResult } from '@/shared/types/review.js'
import type { SlotId, StageId } from '@/shared/types/core.js'

export interface ExecuteGoalToDocsStageInput {
  run: GoalToDocsRunRecord
  stage: GoalToDocsStageContract
  slotDefinitions: SlotDefinition[]
  roles: RoleConfig[]
  artifactSummary: string
  findings?: ReviewFinding[]
}

export interface ExecuteGoalToDocsStageResult {
  run: GoalToDocsRunRecord
  review: ReviewResult
  resolvedTargets: Array<{
    slotId: SlotId
    path: string
  }>
}

export interface CreateGoalToDocsRunSkeletonInput {
  runId: string
  currentStageId: StageId
  stages: GoalToDocsStageContract[]
}

export function createGoalToDocsRunSkeleton(
  input: CreateGoalToDocsRunSkeletonInput,
): GoalToDocsRunRecord {
  return createGoalToDocsRunRecord({
    runId: input.runId,
    currentStageId: input.currentStageId,
    stages: input.stages,
  })
}

export function executeGoalToDocsStage(
  input: ExecuteGoalToDocsStageInput,
): ExecuteGoalToDocsStageResult {
  const stageRun = setGoalToDocsCurrentStage(input.run, input.stage.stageId)
  const runningRun = updateGoalToDocsStageStatus(
    stageRun,
    input.stage.stageId,
    'running',
  )

  const resolvedTargets = [
    resolveSlotTarget({
      slotDefinitions: input.slotDefinitions,
      slotId: input.stage.primaryOutputSlot,
    }),
    ...(input.stage.additionalOutputSlots ?? []).map((slotId) =>
      resolveSlotTarget({
        slotDefinitions: input.slotDefinitions,
        slotId,
      }),
    ),
  ]

  const inReviewRun = {
    ...updateGoalToDocsStageStatus(runningRun, input.stage.stageId, 'in-review'),
    stages: runningRun.stages.map((stageRecord) =>
      stageRecord.stageId === input.stage.stageId
        ? {
            ...stageRecord,
            artifactPaths: resolvedTargets.map((target) => target.path),
          }
        : stageRecord,
    ),
  }

  const reviewerRole = input.roles.find(
    (role) => role.roleId === input.stage.reviewerRoleId,
  )

  const review = runReviewLoop({
    artifactSlotId: input.stage.primaryOutputSlot,
    writerRoleId: input.stage.writerRoleId,
    reviewerRoleId: input.stage.reviewerRoleId,
    reviewerRole,
    artifactSummary: input.artifactSummary,
    findings: input.findings,
  })

  const finalStatus = review.status === 'accepted' ? 'accepted' : 'revising'

  const finalRun = {
    ...updateGoalToDocsStageStatus(inReviewRun, input.stage.stageId, finalStatus),
    stages: inReviewRun.stages.map((stageRecord) =>
      stageRecord.stageId === input.stage.stageId
        ? {
            ...stageRecord,
            reviewerStatus: review.status,
            reviewSummary: review.summary,
          }
        : stageRecord,
    ),
  }

  return {
    run: finalRun,
    review,
    resolvedTargets: resolvedTargets.map((target) => ({
      slotId: target.slotId,
      path: target.path,
    })),
  }
}
