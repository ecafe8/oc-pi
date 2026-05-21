import type { GoalToDocsRunRecord } from '@/planning/goal-to-docs/types.js'
import type { WorkbenchState } from '@/workbench/types.js'

export interface PresentedWorkbenchState {
  topBar: {
    sessionId?: string
    sessionName?: string
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
      sessionId?: string
      sessionName?: string
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
      liveDraftTitle?: string
      liveDraftText?: string
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
      sessionId: state.session.sessionId,
      sessionName: state.session.sessionName,
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
        sessionId: state.session.sessionId,
        sessionName: state.session.sessionName,
        workspacePath: state.session.workspacePath,
        goalSummary: state.session.currentGoal ?? latestGoalItem?.summary,
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
        liveDraftTitle: state.execution.liveDraftTitle,
        liveDraftText: state.execution.liveDraftText,
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
