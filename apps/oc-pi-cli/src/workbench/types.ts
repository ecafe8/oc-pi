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
  actorLabel?: string;
  isStreaming?: boolean;
}

export interface WorkbenchSessionState {
  workspacePath: string;
  sessionId?: string;
  sessionName?: string;
  sessionFile?: string;
  parentSessionId?: string;
  mode: WorkMode;
  currentStageId: StageId;
  currentStageStatus: StageStatus;
  activeRoleId: RoleId;
  activeOutputTarget: SlotId;
  currentGoal?: string;
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
  pendingGoal?: string;
  requestedArtifactMode: 'preview' | 'write';
  pendingAssistantMessage?: string;
  thinkingText?: string;
  thinkingCollapsed: boolean;
  liveDraftTitle?: string;
  liveDraftText?: string;
  liveDraftCollapsed: boolean;
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
