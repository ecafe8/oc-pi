import type { GoalToDocsRunRecord } from '@/planning/goal-to-docs/types.js'
import type { WorkbenchState } from '@/workbench/types.js'

export interface PresentedWorkbenchState {
  topBar: {
    modelId: string
    currentTokens: number
    maxTokens: number
    usagePercent: number
    contextSummary: string
    appVersion: string
    mode: string
    runtimeStatus: string
    updatedAt: string
  }
  chatPane: {
    itemCount: number
    latestSummary?: string
    messages: Array<{
      type: string
      summary: string
      createdAt: string
      isStreaming: boolean
    }>
  }
  rightPane: {
    projectInfo: {
      workspacePath: string
      goalSummary?: string
      currentStageId: string
      currentStageStatus: string
      activeRoleId: string
      activeOutputTarget: string
      executionBoundary: string
    }
    plan: {
      steps: Array<{
        label: string
        status: string
        summary?: string
      }>
      totalSteps: number
      completedSteps: number
    }
    execution: {
      currentAction: string
      latestAction: string
      touchedFiles: string[]
      lastExecutionStatus: string
      resolvedSlotId: string
      resolvedPath: string
      additionalResolvedSlotIds: string[]
      resolvedTargets: Array<{
        slotId: string
        path: string
      }>
      blockingIssues: string[]
      latestReviewStatus?: string
      latestReviewSummary?: string
      reviewFindingCount: number
    }
  }
}

export function presentWorkbenchState(
  state: WorkbenchState,
): PresentedWorkbenchState {
  const latestTimelineItem = state.timeline.items[state.timeline.items.length - 1]
  const latestGoalItem = [...state.timeline.items]
    .reverse()
    .find((item) => item.type === 'user-input')

  const completedSteps = state.plan.steps.filter((step) => step.status === 'done').length

  return {
    topBar: {
      modelId: state.context.modelId,
      currentTokens: state.context.currentTokens,
      maxTokens: state.context.maxTokens,
      usagePercent: state.context.usagePercent,
      contextSummary: `${state.context.currentTokens} / ${state.context.maxTokens} (${state.context.usagePercent}%)`,
      appVersion: state.context.appVersion,
      mode: state.session.mode,
      runtimeStatus: state.statusBar.runtimeStatus,
      updatedAt: state.statusBar.updatedAt,
    },
    chatPane: {
      itemCount: state.timeline.items.length,
      latestSummary: latestTimelineItem?.summary,
      messages: state.timeline.items.map((item) => ({
        type: item.messageType ?? item.type,
        summary: item.summary,
        createdAt: item.createdAt,
        isStreaming: item.isStreaming ?? false,
      })),
    },
    rightPane: {
      projectInfo: {
        workspacePath: state.session.workspacePath,
        goalSummary: latestGoalItem?.summary,
        currentStageId: state.session.currentStageId,
        currentStageStatus: state.session.currentStageStatus,
        activeRoleId: state.session.activeRoleId,
        activeOutputTarget: state.session.activeOutputTarget,
        executionBoundary: state.execution.executionBoundary,
      },
      plan: {
        steps: state.plan.steps,
        totalSteps: state.plan.steps.length,
        completedSteps,
      },
      execution: {
        currentAction: state.execution.currentAction,
        latestAction: state.execution.latestAction,
        touchedFiles: state.execution.touchedFiles,
        lastExecutionStatus: state.inspector.lastExecutionStatus,
        resolvedSlotId: state.inspector.resolvedSlotId,
        resolvedPath: state.inspector.resolvedPath,
        additionalResolvedSlotIds: state.inspector.additionalResolvedSlotIds,
        resolvedTargets: state.inspector.resolvedTargets,
        blockingIssues: state.inspector.blockingIssues,
        latestReviewStatus: state.review.latestStatus,
        latestReviewSummary: state.review.latestSummary,
        reviewFindingCount: state.review.latestFindings.length,
      },
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
