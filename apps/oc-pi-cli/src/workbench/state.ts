import type { GoalToDocsRunRecord } from "@/planning/goal-to-docs/types.js";
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
import type {
  WorkbenchContextState,
  WorkbenchExecutionState,
  TimelineItem,
  WorkbenchInspectorState,
  WorkbenchPlanStep,
  WorkbenchPlanState,
  WorkbenchReviewState,
  WorkbenchSessionState,
  WorkbenchState,
  WorkbenchStatusBarState,
} from "@/workbench/types.js";

export interface CreateWorkbenchStateInput {
  workspacePath: string;
  mode: WorkMode;
  currentStageId: StageId;
  currentStageStatus: StageStatus;
  activeRoleId: RoleId;
  activeOutputTarget: SlotId;
}

export function createWorkbenchSessionState(input: CreateWorkbenchStateInput): WorkbenchSessionState {
  return {
    workspacePath: input.workspacePath,
    mode: input.mode,
    currentStageId: input.currentStageId,
    currentStageStatus: input.currentStageStatus,
    activeRoleId: input.activeRoleId,
    activeOutputTarget: input.activeOutputTarget,
  };
}

export function createWorkbenchInspectorState(): WorkbenchInspectorState {
  return {
    resolvedSlotId: "product-goal",
    resolvedPath: "",
    additionalResolvedSlotIds: [],
    resolvedTargets: [],
    lastExecutionStatus: "idle",
    blockingIssues: [],
  };
}

export function createWorkbenchReviewState(): WorkbenchReviewState {
  return {
    latestFindings: [],
  };
}

export function createWorkbenchContextState(): WorkbenchContextState {
  return {
    currentTokens: 0,
    maxTokens: 0,
    usagePercent: 0,
    modelId: 'github-copilot/gpt-5-mini',
    appVersion: '0.0.0',
  }
}

export function createWorkbenchPlanState(): WorkbenchPlanState {
  return {
    steps: [],
  }
}

export function createWorkbenchExecutionState(): WorkbenchExecutionState {
  return {
    currentAction: 'waiting for input',
    latestAction: 'workbench created',
    touchedFiles: [],
    executionBoundary: 'preview',
  }
}

export function createWorkbenchStatusBarState(): WorkbenchStatusBarState {
  return {
    runtimeStatus: "idle",
    updatedAt: new Date(0).toISOString(),
  };
}

export function createWorkbenchState(input: CreateWorkbenchStateInput): WorkbenchState {
  return {
    session: createWorkbenchSessionState(input),
    timeline: {
      items: [],
    },
    context: createWorkbenchContextState(),
    inspector: createWorkbenchInspectorState(),
    plan: createWorkbenchPlanState(),
    execution: createWorkbenchExecutionState(),
    review: createWorkbenchReviewState(),
    statusBar: createWorkbenchStatusBarState(),
  };
}

export function addTimelineItem(state: WorkbenchState, item: TimelineItem): WorkbenchState {
  return {
    ...state,
    timeline: {
      items: [...state.timeline.items, item],
    },
  };
}

export function setWorkbenchRuntimeStatus(state: WorkbenchState, runtimeStatus: RuntimeStatus): WorkbenchState {
  return {
    ...state,
    inspector: {
      ...state.inspector,
      lastExecutionStatus: runtimeStatus,
    },
    statusBar: {
      ...state.statusBar,
      runtimeStatus,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function setWorkbenchInspectorExecutionStatus(
  state: WorkbenchState,
  runtimeStatus: RuntimeStatus,
): WorkbenchState {
  return {
    ...state,
    inspector: {
      ...state.inspector,
      lastExecutionStatus: runtimeStatus,
    },
  }
}

export function setWorkbenchReviewState(
  state: WorkbenchState,
  input: {
    latestStatus?: ReviewStatus;
    latestSummary?: string;
    latestFindings?: ReviewFinding[];
  },
): WorkbenchState {
  return {
    ...state,
    review: {
      latestStatus: input.latestStatus,
      latestSummary: input.latestSummary,
      latestFindings: input.latestFindings ?? state.review.latestFindings,
    },
  };
}

export function syncWorkbenchSessionFromGoalToDocsRun(state: WorkbenchState, run: GoalToDocsRunRecord): WorkbenchState {
  const currentStage = run.stages.find((stage) => stage.stageId === run.currentStageId);

  const touchedFiles = currentStage?.resolvedTargets.map((target) => target.path) ?? []

  const planSteps: WorkbenchPlanStep[] = run.stages.map((stage) => {
    let status: WorkbenchPlanStep['status'] = 'pending'

    if (stage.status === 'accepted') {
      status = 'done'
    } else if (stage.stageId === run.currentStageId && stage.status === 'running') {
      status = 'running'
    } else if (stage.status === 'blocked') {
      status = 'blocked'
    }

    return {
      label: stage.stageId,
      status,
      summary: stage.reviewSummary,
    }
  })

  return {
    ...state,
    session: {
      ...state.session,
      currentStageId: run.currentStageId,
      currentStageStatus: currentStage?.status ?? state.session.currentStageStatus,
      activeOutputTarget: currentStage?.primaryOutputSlot ?? state.session.activeOutputTarget,
    },
    inspector: {
      ...state.inspector,
      resolvedSlotId: currentStage?.primaryOutputSlot ?? state.inspector.resolvedSlotId,
      resolvedPath: currentStage?.artifactPaths[0] ?? state.inspector.resolvedPath,
      additionalResolvedSlotIds:
        currentStage?.additionalOutputSlots ?? state.inspector.additionalResolvedSlotIds,
      resolvedTargets: currentStage?.resolvedTargets ?? state.inspector.resolvedTargets,
      blockingIssues: currentStage?.blockingIssues ?? state.inspector.blockingIssues,
    },
    plan: {
      steps: planSteps,
    },
    execution: {
      ...state.execution,
      currentAction: currentStage
        ? `current stage: ${currentStage.stageId}`
        : state.execution.currentAction,
      latestAction: currentStage?.reviewSummary ?? state.execution.latestAction,
      touchedFiles,
    },
  };
}
