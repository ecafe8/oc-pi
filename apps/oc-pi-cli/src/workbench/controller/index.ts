import type { GoalToDocsRunRecord } from '@/planning/goal-to-docs/types.js'
import { addTimelineItem, setWorkbenchReviewState, setWorkbenchRuntimeStatus, syncWorkbenchSessionFromGoalToDocsRun } from '@/workbench/state.js'
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

export function handleGoalNew(
  input: GoalNewControllerInput,
): GoalNewControllerResult {
  const command = runGoalNewCommand({ goal: input.goal })
  const state = addTimelineItem(
    setWorkbenchRuntimeStatus(input.state, 'running'),
    {
      type: 'user-input',
      summary: input.goal,
      createdAt: new Date().toISOString(),
    },
  )

  return {
    state,
    command,
  }
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
