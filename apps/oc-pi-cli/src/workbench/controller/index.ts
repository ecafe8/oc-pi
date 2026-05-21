import type { GoalToDocsRunRecord } from '@/planning/goal-to-docs/types.js'
import {
  addTimelineItem,
  appendWorkbenchSystemStatus,
  finishWorkbenchAssistantReply,
  clearWorkbenchPendingExecution,
  setWorkbenchGoal,
  setWorkbenchExecutionProgress,
  setWorkbenchPlanDraft,
  setWorkbenchReviewState,
  startWorkbenchAssistantReply,
  setWorkbenchRuntimeStatus,
  syncWorkbenchSessionFromGoalToDocsRun,
  updateWorkbenchAssistantReplyDelta,
  updateWorkbenchAssistantThinkingDelta,
} from '@/workbench/state.js'
import type { WorkbenchState } from '@/workbench/types.js'
import {
  runGoalNewCommand,
  runGoalRunSummaryCommand,
  runReviewLatestCommand,
  runStatusShowCommand,
} from '@/workbench/commands/index.js'

export interface GoalNewControllerInput {
  state: WorkbenchState
  goal: string
}

export interface GoalNewControllerResult {
  state: WorkbenchState
  command: ReturnType<typeof runGoalNewCommand>
}

export interface StatusShowControllerResult {
  command: ReturnType<typeof runStatusShowCommand>
}

export interface ReviewLatestControllerResult {
  command: ReturnType<typeof runReviewLatestCommand>
}

export interface SyncGoalRunControllerResult {
  state: WorkbenchState
  command: ReturnType<typeof runGoalRunSummaryCommand>
}

export interface ApplyGoalPlanControllerInput {
  state: WorkbenchState
  goal: string
  summary: string
  steps: string[]
  shouldWrite: boolean
}

export interface ConfirmExecuteControllerResult {
  state: WorkbenchState
  goal?: string
  shouldWrite: boolean
  canExecute: boolean
}

export interface ChatMessageControllerInput {
  state: WorkbenchState
  message: string
}

export function handleGoalNew(
  input: GoalNewControllerInput,
): GoalNewControllerResult {
  const command = runGoalNewCommand({ goal: input.goal })
  const state = addTimelineItem(
    setWorkbenchGoal(
      setWorkbenchRuntimeStatus(input.state, 'thinking'),
      input.goal,
    ),
    {
      type: 'user-input',
      summary: input.goal,
      createdAt: new Date().toISOString(),
      messageType: 'user',
    },
  )

  return {
    state,
    command,
  }
}

export function handleChatMessage(
  input: ChatMessageControllerInput,
): WorkbenchState {
  return addTimelineItem(
    setWorkbenchGoal(
      setWorkbenchRuntimeStatus(input.state, 'thinking'),
      input.message,
    ),
    {
      type: 'user-input',
      summary: input.message,
      createdAt: new Date().toISOString(),
      messageType: 'user',
    },
  )
}

export function applyChatReply(
  state: WorkbenchState,
  reply: string,
): WorkbenchState {
  return finishWorkbenchAssistantReply(state, reply)
}

export function markAssistantReplyPending(
  state: WorkbenchState,
): WorkbenchState {
  return startWorkbenchAssistantReply(state)
}

export function appendAssistantReplyDelta(
  state: WorkbenchState,
  delta: string,
): WorkbenchState {
  return updateWorkbenchAssistantReplyDelta(state, delta)
}

export function appendAssistantThinkingDelta(
  state: WorkbenchState,
  delta: string,
): WorkbenchState {
  return updateWorkbenchAssistantThinkingDelta(state, delta)
}

export function applyGoalPlanToWorkbench(
  input: ApplyGoalPlanControllerInput,
): WorkbenchState {
  const nextState = setWorkbenchPlanDraft(input.state, {
    summary: input.summary,
    steps: input.steps.map((label) => ({
      label,
      status: 'pending',
    })),
    requestedArtifactMode: input.shouldWrite ? 'write' : 'preview',
  })

  return addTimelineItem(
    addTimelineItem(
      setWorkbenchRuntimeStatus(nextState, 'waiting-user'),
      {
        type: 'system-summary',
        summary: input.summary,
        createdAt: new Date().toISOString(),
        messageType: 'assistant-plan',
      },
    ),
    {
      type: 'system-summary',
      summary: input.shouldWrite
        ? 'waiting-user: AI 建议执行写入，等待你确认。'
        : 'waiting-user: AI 建议先执行预览，等待你确认。',
      createdAt: new Date().toISOString(),
      messageType: 'system-status',
    },
  )
}

export function handleConfirmExecute(state: WorkbenchState): ConfirmExecuteControllerResult {
  if (!state.execution.pendingGoal) {
    return {
      state: addTimelineItem(state, {
        type: 'system-summary',
        summary: 'No pending goal to execute. 请先输入目标并等待 AI 方案。',
        createdAt: new Date().toISOString(),
        messageType: 'system-status',
      }),
      shouldWrite: false,
      canExecute: false,
    }
  }

  return {
    state: addTimelineItem(
      setWorkbenchRuntimeStatus(state, 'running'),
      {
        type: 'system-summary',
        summary: state.execution.requestedArtifactMode === 'write'
          ? 'Execution started. AI 已确认需要写入，开始执行。'
          : 'Execution started. AI 已确认先执行预览。',
        createdAt: new Date().toISOString(),
        messageType: 'system-status',
      },
    ),
    goal: state.execution.pendingGoal,
    shouldWrite: state.execution.requestedArtifactMode === 'write',
    canExecute: true,
  }
}

export function handleCancelRun(state: WorkbenchState): WorkbenchState {
  return addTimelineItem(
    setWorkbenchRuntimeStatus(clearWorkbenchPendingExecution(state), 'idle'),
    {
      type: 'system-summary',
      summary: 'Cancelled pending execution plan.',
      createdAt: new Date().toISOString(),
      messageType: 'system-status',
    },
  )
}

export function handleStatusShow(
  state: WorkbenchState,
): StatusShowControllerResult {
  return {
    command: runStatusShowCommand(state),
  }
}

export function handleReviewLatest(
  state: WorkbenchState,
): ReviewLatestControllerResult {
  return {
    command: runReviewLatestCommand(state),
  }
}

export function syncGoalToDocsRunToWorkbench(
  state: WorkbenchState,
  run: GoalToDocsRunRecord,
): SyncGoalRunControllerResult {
  const syncedState = syncWorkbenchSessionFromGoalToDocsRun(state, run)
  const command = runGoalRunSummaryCommand(run)

  return {
    state: addTimelineItem(syncedState, {
      type: 'system-summary',
      summary: `Current stage: ${command.summary.currentStageId}`,
      createdAt: new Date().toISOString(),
    }),
    command,
  }
}

export function applyReviewToWorkbench(
  state: WorkbenchState,
  input: {
    latestStatus?: WorkbenchState['review']['latestStatus']
    latestSummary?: string
    latestFindings?: WorkbenchState['review']['latestFindings']
  },
): WorkbenchState {
  return setWorkbenchReviewState(state, input)
}

export function applyGoalToDocsProgressToWorkbench(
  state: WorkbenchState,
  input: {
    summary: string
    currentAction: string
    latestAction?: string
    liveDraftTitle?: string
    liveDraftText?: string
  },
): WorkbenchState {
  return appendWorkbenchSystemStatus(
    setWorkbenchExecutionProgress(state, {
      currentAction: input.currentAction,
      latestAction: input.latestAction,
      liveDraftTitle: input.liveDraftTitle,
      liveDraftText: input.liveDraftText,
      runtimeStatus: 'running',
    }),
    input.summary,
  )
}
