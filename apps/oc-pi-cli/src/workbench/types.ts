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
  messageType?: 'user' | 'assistant-plan' | 'assistant-stream' | 'system-status' | 'result';
  isStreaming?: boolean;
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
  additionalResolvedSlotIds: SlotId[];
  resolvedTargets: Array<{
    slotId: SlotId;
    path: string;
  }>;
  lastExecutionStatus: RuntimeStatus;
  blockingIssues: string[];
}

export interface WorkbenchReviewState {
  latestStatus?: ReviewStatus;
  latestSummary?: string;
  latestFindings: ReviewFinding[];
}

export interface WorkbenchContextState {
  currentTokens: number;
  maxTokens: number;
  usagePercent: number;
  modelId: string;
  appVersion: string;
}

export interface WorkbenchPlanStep {
  label: string;
  status: 'pending' | 'running' | 'done' | 'blocked';
  summary?: string;
}

export interface WorkbenchPlanState {
  steps: WorkbenchPlanStep[];
}

export interface WorkbenchExecutionState {
  currentAction: string;
  latestAction: string;
  touchedFiles: string[];
  executionBoundary: 'preview' | 'sandbox' | 'workspace-docs';
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
  context: WorkbenchContextState;
  inspector: WorkbenchInspectorState;
  plan: WorkbenchPlanState;
  execution: WorkbenchExecutionState;
  review: WorkbenchReviewState;
  statusBar: WorkbenchStatusBarState;
}
