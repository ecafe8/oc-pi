import type { ResolvedSlotTarget } from '@/shared/types/artifacts.js'
import type { ReviewStatus, RoleId, SlotId, StageId, StageStatus } from '@/shared/types/core.js'

export interface GoalToDocsStageContract {
  stageId: StageId
  name: string
  inputArtifacts: string[]
  primaryOutputSlot: SlotId
  additionalOutputSlots?: SlotId[]
  writerRoleId: RoleId
  reviewerRoleId: RoleId
  reviewRequired: boolean
  completionRule: 'accepted'
}

export interface GoalToDocsStageRecord {
  stageId: StageId
  status: StageStatus
  primaryOutputSlot: SlotId
  additionalOutputSlots?: SlotId[]
  artifactPaths: string[]
  resolvedTargets: ResolvedStageTarget[]
  reviewerStatus?: ReviewStatus
  reviewSummary?: string
  blockingIssues: string[]
}

export interface GoalToDocsRunRecord {
  runId: string
  currentStageId: StageId
  stages: GoalToDocsStageRecord[]
}

export interface ResolvedStageTarget extends Pick<ResolvedSlotTarget, 'path' | 'slotId'> {}
