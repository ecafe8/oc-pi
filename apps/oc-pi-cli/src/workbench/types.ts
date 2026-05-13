import type {
  ReviewStatus,
  RoleId,
  RuntimeStatus,
  SlotId,
  StageId,
  StageStatus,
  WorkMode,
} from "@/shared/types/core.js";
import type { ReviewFinding } from "@/shared/types/review.js";

export interface TimelineItem {
  type: "user-input" | "system-summary" | "write-result" | "review-result";
  summary: string;
  createdAt: string;
}

export interface WorkbenchSessionState {
  workspacePath: string;
  mode: WorkMode;
  currentStageId: StageId;
  currentStageStatus: StageStatus;
  activeRoleId: RoleId;
  activeOutputTarget: SlotId;
}

export interface WorkbenchInspectorState {
  resolvedSlotId: SlotId;
  resolvedPath: string;
  lastExecutionStatus: RuntimeStatus;
  blockingIssues: string[];
}

export interface WorkbenchReviewState {
  latestStatus?: ReviewStatus;
  latestSummary?: string;
  latestFindings: ReviewFinding[];
}

export interface WorkbenchStatusBarState {
  runtimeStatus: RuntimeStatus;
  updatedAt: string;
}

export interface WorkbenchState {
  session: WorkbenchSessionState;
  timeline: {
    items: TimelineItem[];
  };
  inspector: WorkbenchInspectorState;
  review: WorkbenchReviewState;
  statusBar: WorkbenchStatusBarState;
}
