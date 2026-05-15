export type WorkMode = 'planning' | 'implementation'

export type RoleId =
  | 'goal-planner'
  | 'goal-reviewer'
  | 'doc-writer'
  | 'doc-reviewer'
  | 'code-writer'
  | 'code-reviewer'

export type SlotId =
  | 'product-goal'
  | 'capability-map'
  | 'feature-plan'
  | 'mvp-scope'
  | 'handoff-summary'
  | 'handoff-next-up'
  | 'next-summary'
  | 'review-notes'
  | 'implementation-code'
  | 'progress-status'

export type SlotKind = 'docs' | 'code' | 'review' | 'status'

export type StageId =
  | 'goal-framing'
  | 'capability-breakdown'
  | 'feature-planning'
  | 'handoff-summary'

export type StageStatus =
  | 'pending'
  | 'running'
  | 'in-review'
  | 'revising'
  | 'accepted'
  | 'blocked'

export type ReviewStatus = 'accepted' | 'changes-requested'

export type RuntimeStatus = 'idle' | 'running' | 'success' | 'failed'

export type WriteMode = 'overwrite' | 'append' | 'merge'

export type CommandId =
  | 'goal.new'
  | 'role.use'
  | 'slot.show'
  | 'review.latest'
  | 'status.show'
  | 'help.show'
