import type { GoalToDocsRunRecord } from '@/planning/goal-to-docs/types.js'
import type { WorkbenchState } from '@/workbench/types.js'
import { presentGoalToDocsRunSummary, presentWorkbenchState } from '@/workbench/presenters/present-workbench-state.js'

export interface GoalNewCommandInput {
  goal: string
}

export interface GoalNewCommandResult {
  command: 'goal.new'
  acceptedGoal: string
}

export interface StatusShowCommandResult {
  command: 'status.show'
  state: ReturnType<typeof presentWorkbenchState>
}

export interface ReviewLatestCommandResult {
  command: 'review.latest'
  latestStatus?: string
  latestSummary?: string
  findingCount: number
}

export interface GoalRunSummaryCommandResult {
  command: 'goal.run.summary'
  summary: ReturnType<typeof presentGoalToDocsRunSummary>
}

export function runGoalNewCommand(
  input: GoalNewCommandInput,
): GoalNewCommandResult {
  return {
    command: 'goal.new',
    acceptedGoal: input.goal,
  }
}

export function runStatusShowCommand(
  state: WorkbenchState,
): StatusShowCommandResult {
  return {
    command: 'status.show',
    state: presentWorkbenchState(state),
  }
}

export function runReviewLatestCommand(
  state: WorkbenchState,
): ReviewLatestCommandResult {
  return {
    command: 'review.latest',
    latestStatus: state.review.latestStatus,
    latestSummary: state.review.latestSummary,
    findingCount: state.review.latestFindings.length,
  }
}

export function runGoalRunSummaryCommand(
  run: GoalToDocsRunRecord,
): GoalRunSummaryCommandResult {
  return {
    command: 'goal.run.summary',
    summary: presentGoalToDocsRunSummary(run),
  }
}
