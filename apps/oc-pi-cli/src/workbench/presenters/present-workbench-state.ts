import type { GoalToDocsRunRecord } from '@/planning/goal-to-docs/types.js'
import type { WorkbenchState } from '@/workbench/types.js'

export interface PresentedWorkbenchState {
  header: {
    workspacePath: string
    mode: string
    currentStageId: string
    currentStageStatus: string
    activeRoleId: string
    activeOutputTarget: string
  }
  inspector: {
    resolvedSlotId: string
    resolvedPath: string
    additionalResolvedSlotIds: string[]
    resolvedTargets: Array<{
      slotId: string
      path: string
    }>
    lastExecutionStatus: string
    blockingIssues: string[]
  }
  review: {
    latestStatus?: string
    latestSummary?: string
    findingCount: number
  }
  timeline: {
    itemCount: number
    latestSummary?: string
  }
}

export function presentWorkbenchState(
  state: WorkbenchState,
): PresentedWorkbenchState {
  const latestTimelineItem = state.timeline.items[state.timeline.items.length - 1]

  return {
    header: {
      workspacePath: state.session.workspacePath,
      mode: state.session.mode,
      currentStageId: state.session.currentStageId,
      currentStageStatus: state.session.currentStageStatus,
      activeRoleId: state.session.activeRoleId,
      activeOutputTarget: state.session.activeOutputTarget,
    },
    inspector: {
      resolvedSlotId: state.inspector.resolvedSlotId,
      resolvedPath: state.inspector.resolvedPath,
      additionalResolvedSlotIds: state.inspector.additionalResolvedSlotIds,
      resolvedTargets: state.inspector.resolvedTargets,
      lastExecutionStatus: state.inspector.lastExecutionStatus,
      blockingIssues: state.inspector.blockingIssues,
    },
    review: {
      latestStatus: state.review.latestStatus,
      latestSummary: state.review.latestSummary,
      findingCount: state.review.latestFindings.length,
    },
    timeline: {
      itemCount: state.timeline.items.length,
      latestSummary: latestTimelineItem?.summary,
    },
  }
}

export function presentGoalToDocsRunSummary(
  run: GoalToDocsRunRecord,
): {
  currentStageId: string
  currentStageStatus?: string
  stageCount: number
} {
  const currentStage = run.stages.find((stage) => stage.stageId === run.currentStageId)

  return {
    currentStageId: run.currentStageId,
    currentStageStatus: currentStage?.status,
    stageCount: run.stages.length,
  }
}
