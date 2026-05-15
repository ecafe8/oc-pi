import type { GoalToDocsRunRecord, GoalToDocsStageContract, GoalToDocsStageRecord } from '@/planning/goal-to-docs/types.js'
import type { StageId, StageStatus } from '@/shared/types/core.js'

export interface CreateGoalToDocsRunInput {
  runId: string
  currentStageId: StageId
  stages: GoalToDocsStageContract[]
}

export function createGoalToDocsStageRecord(
  stage: GoalToDocsStageContract,
): GoalToDocsStageRecord {
  return {
    stageId: stage.stageId,
    status: 'pending',
    primaryOutputSlot: stage.primaryOutputSlot,
    additionalOutputSlots: stage.additionalOutputSlots ?? [],
    artifactPaths: [],
    resolvedTargets: [],
    blockingIssues: [],
  }
}

export function createGoalToDocsRunRecord(
  input: CreateGoalToDocsRunInput,
): GoalToDocsRunRecord {
  return {
    runId: input.runId,
    currentStageId: input.currentStageId,
    stages: input.stages.map(createGoalToDocsStageRecord),
  }
}

export function updateGoalToDocsStageStatus(
  run: GoalToDocsRunRecord,
  stageId: StageId,
  status: StageStatus,
): GoalToDocsRunRecord {
  return {
    ...run,
    stages: run.stages.map((stage) =>
      stage.stageId === stageId ? { ...stage, status } : stage,
    ),
  }
}

export function setGoalToDocsCurrentStage(
  run: GoalToDocsRunRecord,
  stageId: StageId,
): GoalToDocsRunRecord {
  return {
    ...run,
    currentStageId: stageId,
  }
}
