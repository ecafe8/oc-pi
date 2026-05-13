import type { ReviewResult } from '@/shared/types/review.js'
import type { RoleConfig } from '@/shared/types/artifacts.js'
import type { ReviewFinding } from '@/shared/types/review.js'
import type { ReviewStatus, RoleId, SlotId } from '@/shared/types/core.js'

export interface RunReviewLoopInput {
  artifactSlotId: SlotId
  writerRoleId: RoleId
  reviewerRoleId: RoleId
  reviewerRole?: RoleConfig
  artifactSummary: string
  findings?: ReviewFinding[]
  status?: ReviewStatus
}

export function runReviewLoop(input: RunReviewLoopInput): ReviewResult {
  const findings = input.findings ?? []
  const resolvedStatus = input.status ?? (findings.length > 0 ? 'changes-requested' : 'accepted')

  return {
    artifactSlotId: input.artifactSlotId,
    reviewerRoleId: input.reviewerRole?.roleId ?? input.reviewerRoleId,
    status: resolvedStatus,
    summary: input.artifactSummary,
    findings,
  }
}
