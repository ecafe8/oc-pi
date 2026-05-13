import type { ReviewStatus, RoleId, SlotId } from "@/shared/types/core.js";

export interface ReviewFinding {
  message: string;
  severity?: "low" | "medium" | "high";
}

export interface ReviewResult {
  artifactSlotId: SlotId;
  reviewerRoleId: RoleId;
  status: ReviewStatus;
  summary: string;
  findings: ReviewFinding[];
}
