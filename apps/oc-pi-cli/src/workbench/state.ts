import type { GoalToDocsRunRecord } from "@/planning/goal-to-docs/types.js";
import type { ArtifactMode } from "@/planning/goal-to-docs/run-mvp.js";
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
    requestedArtifactMode: 'preview',
    thinkingCollapsed: true,
    liveDraftCollapsed: false,
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

export function setWorkbenchGoal(state: WorkbenchState, goal: string): WorkbenchState {
  return {
    ...state,
    session: {
      ...state.session,
      currentGoal: goal,
    },
    execution: {
      ...state.execution,
      pendingGoal: goal,
    },
  }
}

export function setWorkbenchPlanDraft(
  state: WorkbenchState,
  input: {
    summary: string
    steps: WorkbenchPlanStep[]
    requestedArtifactMode: WorkbenchState['execution']['requestedArtifactMode']
  },
): WorkbenchState {
  return {
    ...state,
    plan: {
      steps: input.steps,
    },
    execution: {
      ...state.execution,
      currentAction: 'plan ready for refinement',
      latestAction: input.summary,
      requestedArtifactMode: input.requestedArtifactMode,
      pendingAssistantMessage: undefined,
      thinkingText: undefined,
      thinkingCollapsed: state.execution.thinkingCollapsed,
      liveDraftTitle: undefined,
      liveDraftText: undefined,
      liveDraftCollapsed: state.execution.liveDraftCollapsed,
    },
  }
}

export function clearWorkbenchPendingExecution(state: WorkbenchState): WorkbenchState {
  return {
    ...state,
    execution: {
      ...state.execution,
      pendingGoal: undefined,
      currentAction: 'waiting for input',
      requestedArtifactMode: 'preview',
      pendingAssistantMessage: undefined,
      thinkingText: undefined,
      thinkingCollapsed: state.execution.thinkingCollapsed,
      liveDraftTitle: undefined,
      liveDraftText: undefined,
      liveDraftCollapsed: state.execution.liveDraftCollapsed,
    },
  }
}

export function startWorkbenchAssistantReply(
  state: WorkbenchState,
): WorkbenchState {
  return addTimelineItem(
    {
      ...setWorkbenchRuntimeStatus(state, 'thinking'),
      execution: {
        ...state.execution,
        currentAction: 'waiting for ai reply',
        latestAction: '',
        pendingAssistantMessage: '',
        thinkingText: '',
        thinkingCollapsed: state.execution.thinkingCollapsed,
        liveDraftTitle: undefined,
        liveDraftText: undefined,
        liveDraftCollapsed: state.execution.liveDraftCollapsed,
      },
    },
    {
      type: 'system-summary',
      summary: '',
      createdAt: new Date().toISOString(),
      messageType: 'assistant-stream',
      isStreaming: true,
    },
  )
}

export function finishWorkbenchAssistantReply(
  state: WorkbenchState,
  reply: string,
): WorkbenchState {
  const items = [...state.timeline.items]
  const streamingIndex = items.findLastIndex(
    (item) => item.messageType === 'assistant-stream' && item.isStreaming,
  )

  if (streamingIndex >= 0) {
    const streamingItem = items[streamingIndex]

    if (streamingItem) {
      items[streamingIndex] = {
        ...streamingItem,
        summary: reply,
        isStreaming: false,
      }
    }
  } else {
    items.push({
      type: 'system-summary',
      summary: reply,
      createdAt: new Date().toISOString(),
      messageType: 'assistant-stream',
      isStreaming: false,
    })
  }

  return {
    ...setWorkbenchRuntimeStatus(state, 'idle'),
    timeline: {
      items,
    },
    execution: {
      ...state.execution,
      currentAction: 'waiting for input',
      latestAction: reply,
      pendingAssistantMessage: undefined,
      thinkingText: undefined,
      thinkingCollapsed: state.execution.thinkingCollapsed,
      liveDraftTitle: state.execution.liveDraftTitle,
      liveDraftText: state.execution.liveDraftText,
      liveDraftCollapsed: state.execution.liveDraftCollapsed,
    },
  }
}

export function updateWorkbenchAssistantReplyDelta(
  state: WorkbenchState,
  delta: string,
): WorkbenchState {
  const items = [...state.timeline.items]
  const streamingIndex = items.findLastIndex(
    (item) => item.messageType === 'assistant-stream' && item.isStreaming,
  )

  if (streamingIndex >= 0) {
    const streamingItem = items[streamingIndex]

    if (streamingItem) {
      items[streamingIndex] = {
        ...streamingItem,
        summary: `${streamingItem.summary}${delta}`,
        isStreaming: true,
      }
    }
  }

  return {
    ...state,
    timeline: {
      items,
    },
    execution: {
      ...state.execution,
      latestAction: `${state.execution.latestAction}${delta}`,
      pendingAssistantMessage: `${state.execution.pendingAssistantMessage ?? ''}${delta}`,
    },
  }
}

export function updateWorkbenchAssistantThinkingDelta(
  state: WorkbenchState,
  delta: string,
): WorkbenchState {
  return {
    ...state,
    execution: {
      ...state.execution,
      thinkingText: `${state.execution.thinkingText ?? ''}${delta}`,
    },
  }
}

export function toggleWorkbenchThinkingCollapsed(state: WorkbenchState): WorkbenchState {
  return {
    ...state,
    execution: {
      ...state.execution,
      thinkingCollapsed: !state.execution.thinkingCollapsed,
    },
  }
}

export function setWorkbenchExecutionProgress(state: WorkbenchState, input: {
  currentAction: string
  latestAction?: string
  liveDraftTitle?: string
  liveDraftText?: string
  runtimeStatus?: RuntimeStatus
}): WorkbenchState {
  const nextState = input.runtimeStatus
    ? setWorkbenchRuntimeStatus(state, input.runtimeStatus)
    : state

  return {
    ...nextState,
    execution: {
      ...nextState.execution,
      currentAction: input.currentAction,
      latestAction: input.latestAction ?? nextState.execution.latestAction,
      liveDraftTitle: input.liveDraftTitle ?? nextState.execution.liveDraftTitle,
      liveDraftText: input.liveDraftText ?? nextState.execution.liveDraftText,
      liveDraftCollapsed: nextState.execution.liveDraftCollapsed,
    },
  }
}

export function appendWorkbenchSystemStatus(state: WorkbenchState, summary: string): WorkbenchState {
  return addTimelineItem(state, {
    type: 'system-summary',
    summary,
    createdAt: new Date().toISOString(),
    messageType: 'system-status',
  })
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

export function setWorkbenchExecutionBoundary(
  state: WorkbenchState,
  artifactMode: ArtifactMode,
): WorkbenchState {
  const executionBoundary = artifactMode === 'write'
    ? 'workspace-docs'
    : artifactMode === 'sandbox-write'
      ? 'sandbox'
      : 'preview'

  return {
    ...state,
    execution: {
      ...state.execution,
      executionBoundary,
      requestedArtifactMode: artifactMode === 'preview' ? 'preview' : 'write',
    },
  }
}
