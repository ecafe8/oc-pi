import { ProcessTerminal, TUI, isKeyRelease, matchesKey } from '@earendil-works/pi-tui'

import {
  FileOAuthCredentialStore,
  PiModelAgentBridge,
  PiOAuthLoginBridge,
  resolveProviderModelForRole,
} from '@/provider-adapters/index.js'
import { type ArtifactMode, runGoalToDocsMvp } from '@/planning/goal-to-docs/run-mvp.js'
import type { GoalToDocsRunRecord } from '@/planning/goal-to-docs/types.js'
import { createDefaultWorkbenchState, DEFAULT_ROLE_CONFIGS } from '@/runtime/default-config.js'
import { getCliRootPath } from '@/runtime/paths.js'
import type { ReviewResult } from '@/shared/types/review.js'
import {
  FileRuntimeSessionStore,
  type RuntimeSessionListItem,
} from '@/runtime/session-store.js'
import {
  appendAssistantReplyDelta,
  appendAssistantThinkingDelta,
  applyReviewToWorkbench,
  applyChatReply,
  applyGoalPlanToWorkbench,
  handleCancelRun,
  handleChatMessage,
  handleConfirmExecute,
  handleGoalNew,
  handleReviewLatest,
  handleStatusShow,
  markAssistantReplyPending,
} from '@/workbench/controller/index.js'
import { setWorkbenchExecutionProgress, setWorkbenchGoal, setWorkbenchRuntimeStatus, toggleWorkbenchThinkingCollapsed } from '@/workbench/state.js'
import { WorkbenchRootView } from '@/workbench/views/index.js'

export interface StartWorkbenchOptions {
  workspacePath: string
}

interface SessionCommandContext {
  sessionStore: FileRuntimeSessionStore
}

export interface ParsedWorkbenchCommand {
  commandName: string
  argumentText?: string
}

interface GoalPlanDraft {
  assistantReply: string
  summary: string
  steps: string[]
  shouldWrite: boolean
  needsUserConfirmation: boolean
  missingInformation: string[]
}

interface PlanningLoopResult {
  plan: GoalPlanDraft
  latestReview?: ReviewResult
}

interface WorkbenchActionResult {
  state: import('@/workbench/types.js').WorkbenchState
  latestRun?: GoalToDocsRunRecord
}

const DEFAULT_PROVIDER = 'github-copilot'
const DEFAULT_MODEL_ID = 'gpt-5-mini'
const PLANNER_ACTOR_LABEL = 'Planner'
const REVIEWER_ACTOR_LABEL = 'Reviewer'
const MAX_PLANNING_REVIEW_ROUNDS = 3
const ENTER_ALTERNATE_SCREEN = '\u001b[?1049h'
const EXIT_ALTERNATE_SCREEN = '\u001b[?1049l'
const ENABLE_MOUSE_REPORTING = '\u001b[?1000h\u001b[?1006h'
const DISABLE_MOUSE_REPORTING = '\u001b[?1000l\u001b[?1006l'

export async function startWorkbench(options: StartWorkbenchOptions): Promise<void> {
  const sessionStore = new FileRuntimeSessionStore(options.workspacePath)
  let session: { workbenchState: import('@/workbench/types.js').WorkbenchState; latestRun?: GoalToDocsRunRecord } | undefined
  let hasActiveSession = false
  let state = createDefaultWorkbenchState(options.workspacePath)
  let isBusy = false
  let hasStopped = false
  let activeChatAbortController: AbortController | undefined
  let escapePressCount = 0
  let lastEscapeAt = 0

  const terminal = new ProcessTerminal()
  const tui = new TUI(terminal)
  const stopWorkbench = (): void => {
    if (hasStopped) {
      return
    }

    hasStopped = true
    rootView.dispose()
    stopWorkbenchTui(tui)
  }
  const rootView = new WorkbenchRootView({
    tui,
    workspacePath: options.workspacePath,
    state,
    getSessionSuggestions: async (query) => filterSessionSuggestions({
      query,
      sessions: await sessionStore.listSessions(),
    }),
    onSubmit: async (value) => {
      const trimmed = value.trim()

      if (trimmed.length === 0 || isBusy) {
        return
      }

      isBusy = true
      rootView.setInputLocked(true)

      try {
        if (trimmed.startsWith('/')) {
          const parsedCommand = parseWorkbenchCommand(trimmed)
          const viewCommand = rootView.handleViewCommand(parsedCommand.commandName)

          if (viewCommand.handled) {
            if (viewCommand.message) {
              state = appendSystemMessage(state, viewCommand.message)
            }
          } else {
          const result = await executeWorkbenchSlashCommand({
            state,
            command: parsedCommand,
            cliRoot: getCliRootPath(),
            latestRun: session?.latestRun,
            sessionStore,
            onStateChange: (nextState) => {
              state = nextState
              rootView.setState(state)
              tui.requestRender(true)
            },
          })
          state = result.state
          if (activatesSession(parsedCommand.commandName)) {
            hasActiveSession = true
          }
          session = {
            workbenchState: state,
            latestRun: result.latestRun ?? session?.latestRun,
          }
          }
        } else {
          if (!hasActiveSession) {
            session = await sessionStore.createSession(createSessionNameFromInput(trimmed))
            state = session.workbenchState
            hasActiveSession = true
            rootView.setState(state)
            tui.requestRender(true)
          }

          activeChatAbortController = new AbortController()
          const result = await handleChatInput({
            state,
            message: trimmed,
            cliRoot: getCliRootPath(),
            signal: activeChatAbortController.signal,
            onStateChange: (nextState) => {
              state = nextState
              rootView.setState(state)
              tui.requestRender(true)
            },
          })
          state = result.state
          activeChatAbortController = undefined
          escapePressCount = 0
          lastEscapeAt = 0
          rootView.setCancelHintRemainingEsc(0)
        }

      rootView.setState(state)
      tui.requestRender(true)

        if (hasActiveSession) {
          await sessionStore.write({
            workbenchState: state,
            latestRun: session?.latestRun,
          })
          session = await sessionStore.read() ?? session
        }
      } finally {
        activeChatAbortController = undefined
        escapePressCount = 0
        lastEscapeAt = 0
        isBusy = false
        rootView.setInputLocked(false)
        rootView.setCancelHintRemainingEsc(0)
      }
    },
  })

  tui.addChild(rootView)
  tui.setFocus(rootView)
  tui.addInputListener((data) => {
    if (matchesKey(data, 'ctrl+c')) {
      stopWorkbench()
      process.exit(0)
    }

    if (matchesKey(data, 'escape') && activeChatAbortController) {
      if (isKeyRelease(data)) {
        return {
          consume: true,
        }
      }

      const now = Date.now()

      if (now - lastEscapeAt > 1500) {
        escapePressCount = 0
      }

      lastEscapeAt = now
      escapePressCount += 1
      rootView.setCancelHintRemainingEsc(Math.max(0, 3 - escapePressCount))

      if (escapePressCount >= 3 && !activeChatAbortController.signal.aborted) {
        activeChatAbortController.abort()
      }

      return {
        consume: true,
      }
    }

    return undefined
  })
  process.once('SIGTERM', stopWorkbench)
  process.once('exit', stopWorkbench)
  process.stdout.write(ENTER_ALTERNATE_SCREEN)
  process.stdout.write(ENABLE_MOUSE_REPORTING)

  try {
    tui.start()
  } catch (error) {
    stopWorkbench()
    throw error
  }
}

function stopWorkbenchTui(tui: TUI): void {
  tui.stop()
  process.stdout.write(DISABLE_MOUSE_REPORTING)
  process.stdout.write(EXIT_ALTERNATE_SCREEN)
}

async function handleGoalPlanning(input: {
  state: import('@/workbench/types.js').WorkbenchState
  goal: string
  cliRoot: string
  signal?: AbortSignal
  onStateChange?: (state: import('@/workbench/types.js').WorkbenchState) => void
}): Promise<WorkbenchActionResult> {
  const signal = input.signal ?? new AbortController().signal

  const next = handleGoalNew({
    state: input.state,
    goal: input.goal,
  })
  let progressiveState = next.state
  input.onStateChange?.(progressiveState)

  let result: PlanningLoopResult

  try {
    result = await runPlanningReviewLoop({
      state: progressiveState,
      goal: input.goal,
      cliRoot: input.cliRoot,
      signal,
      onStateChange: (nextState) => {
        progressiveState = nextState
        input.onStateChange?.(nextState)
      },
    })
  } catch (error) {
    if (isAbortError(error, input.signal)) {
      return {
        state: appendSystemMessage(
          setWorkbenchRuntimeStatus(progressiveState, 'idle'),
          '已中断当前规划。',
        ),
      }
    }

    throw error
  }

  return {
    state: applyGoalPlanToWorkbench({
      state: progressiveState,
      goal: input.goal,
      summary: result.plan.summary,
      steps: result.plan.steps,
      shouldWrite: result.plan.shouldWrite,
    }),
  }
}

async function handleChatInput(input: {
  state: import('@/workbench/types.js').WorkbenchState
  message: string
  cliRoot: string
  signal: AbortSignal
  onStateChange: (state: import('@/workbench/types.js').WorkbenchState) => void
}): Promise<WorkbenchActionResult> {
  if (shouldConfirmDocsExecution(input.message, input.state)) {
    const confirmIntentState = appendUserTimelineMessage(input.state, input.message)
    input.onStateChange(confirmIntentState)

    return handleWorkbenchCommand({
      state: confirmIntentState,
      input: {
        commandName: '/docs-exec-confirm',
      },
      cliRoot: input.cliRoot,
      onStateChange: input.onStateChange,
      sessionContext: {
        sessionStore: new FileRuntimeSessionStore(input.state.session.workspacePath),
      },
    })
  }

  const planningGoal = buildPlanningGoalInput({
    currentGoal: input.state.session.currentGoal,
    inlineIntent: input.message,
  })

  if (!planningGoal) {
    return {
      state: appendSystemMessage(input.state, '未收到可用于规划的目标内容。'),
    }
  }

  const chatState = handleChatMessage({
    state: input.state,
    message: input.message,
  })
  const planningState = setWorkbenchGoal(chatState, planningGoal)
  input.onStateChange(planningState)
  let progressiveState = planningState

  let result: PlanningLoopResult

  try {
    result = await runPlanningReviewLoop({
      state: progressiveState,
      goal: planningGoal,
      cliRoot: input.cliRoot,
      signal: input.signal,
      onStateChange: (nextState) => {
        progressiveState = nextState
        input.onStateChange(nextState)
      },
    })
  } catch (error) {
    if (isAbortError(error, input.signal)) {
      return {
        state: appendSystemMessage(
          setWorkbenchRuntimeStatus(progressiveState, 'idle'),
          '已中断当前规划。',
        ),
      }
    }

    throw error
  }

  return {
    state: applyGoalPlanToWorkbench({
      state: progressiveState,
      goal: planningGoal,
      summary: result.plan.summary,
      steps: result.plan.steps,
      shouldWrite: result.plan.shouldWrite,
    }),
  }
}

async function runPlanningReviewLoop(input: {
  state: import('@/workbench/types.js').WorkbenchState
  goal: string
  cliRoot: string
  signal: AbortSignal
  onStateChange: (state: import('@/workbench/types.js').WorkbenchState) => void
}): Promise<PlanningLoopResult> {
  const plannerRole = DEFAULT_ROLE_CONFIGS.find((role) => role.roleId === 'goal-planner')
  const reviewerRole = DEFAULT_ROLE_CONFIGS.find((role) => role.roleId === 'goal-reviewer')

  if (!plannerRole || !reviewerRole) {
    return { plan: createFallbackPlan(input.goal) }
  }

  const credentialStore = new FileOAuthCredentialStore()
  const loginBridge = new PiOAuthLoginBridge()
  const agentBridge = new PiModelAgentBridge()
  const credentials = await credentialStore.read(DEFAULT_PROVIDER)

  if (!credentials) {
    return { plan: createFallbackPlan(input.goal) }
  }

  const next = await loginBridge.getApiKey({
    provider: DEFAULT_PROVIDER,
    credentials: { [DEFAULT_PROVIDER]: credentials },
  })

  if (!next) {
    return { plan: createFallbackPlan(input.goal) }
  }

  await credentialStore.write(DEFAULT_PROVIDER, next.newCredentials)

  let state = input.state
  let currentPlan: GoalPlanDraft | undefined
  let latestReview: ReviewResult | undefined

  for (let round = 1; round <= MAX_PLANNING_REVIEW_ROUNDS; round += 1) {
    state = setWorkbenchExecutionProgress(state, {
      currentAction: round === 1 ? 'planner drafting initial plan' : `planner revising plan round ${round}`,
      latestAction: `planning round ${round}`,
      runtimeStatus: 'thinking',
    })
    state = markAssistantReplyPending(state, PLANNER_ACTOR_LABEL)
    input.onStateChange(state)

    currentPlan = await createGoalPlan({
      goal: input.goal,
      cliRoot: input.cliRoot,
      signal: input.signal,
      prompt: round === 1
        ? buildGoalPlanPrompt(input.goal)
        : buildGoalPlanRevisionPrompt({
            goal: input.goal,
            previousPlan: currentPlan ?? createFallbackPlan(input.goal),
            review: latestReview ?? createAcceptedPlanningReview(),
            round,
          }),
      agentBridge,
      apiKey: next.apiKey,
      modelId: resolveProviderModelForRole(plannerRole).resolvedModelId,
      onThinkingDelta: (delta) => {
        state = appendAssistantThinkingDelta(state, delta)
        input.onStateChange(state)
      },
      onReplyDelta: (delta) => {
        state = appendAssistantReplyDelta(state, delta, PLANNER_ACTOR_LABEL)
        input.onStateChange(state)
      },
    })

    state = applyChatReply(state, currentPlan.assistantReply, PLANNER_ACTOR_LABEL)
    state = setWorkbenchExecutionProgress(state, {
      currentAction: currentPlan.needsUserConfirmation
        ? 'waiting for user clarification'
        : `reviewer evaluating plan round ${round}`,
      latestAction: currentPlan.summary,
      runtimeStatus: 'idle',
    })
    input.onStateChange(state)

    if (currentPlan.needsUserConfirmation) {
      return {
        plan: currentPlan,
        latestReview,
      }
    }

    state = setWorkbenchExecutionProgress(state, {
      currentAction: `reviewer evaluating plan round ${round}`,
      latestAction: currentPlan.summary,
      runtimeStatus: 'thinking',
    })
    state = markAssistantReplyPending(state, REVIEWER_ACTOR_LABEL)
    input.onStateChange(state)

    const review = await createPlanningReview({
      goal: input.goal,
      plan: currentPlan,
      cliRoot: input.cliRoot,
      signal: input.signal,
      agentBridge,
      apiKey: next.apiKey,
      modelId: resolveProviderModelForRole(reviewerRole).resolvedModelId,
      onThinkingDelta: (delta) => {
        state = appendAssistantThinkingDelta(state, delta)
        input.onStateChange(state)
      },
      onReplyDelta: (delta) => {
        state = appendAssistantReplyDelta(state, delta, REVIEWER_ACTOR_LABEL)
        input.onStateChange(state)
      },
    })

    latestReview = review.result
    state = applyChatReply(state, review.visibleReply, REVIEWER_ACTOR_LABEL)
    state = applyReviewToWorkbench(state, {
      latestStatus: review.result.status,
      latestSummary: review.result.summary,
      latestFindings: review.result.findings,
    })
    input.onStateChange(state)

    if (review.result.status === 'accepted') {
      return {
        plan: currentPlan,
        latestReview,
      }
    }
  }

  return {
    plan: currentPlan ?? createFallbackPlan(input.goal),
    latestReview,
  }
}

export async function executeWorkbenchSlashCommand(input: {
  state: import('@/workbench/types.js').WorkbenchState
  command: ParsedWorkbenchCommand | string
  cliRoot: string
  latestRun?: import('@/planning/goal-to-docs/types.js').GoalToDocsRunRecord
  sessionStore: FileRuntimeSessionStore
  onStateChange?: (state: import('@/workbench/types.js').WorkbenchState) => void
}): Promise<WorkbenchActionResult> {
  const parsedCommand = typeof input.command === 'string'
    ? parseWorkbenchCommand(input.command)
    : input.command

  return handleWorkbenchCommand({
    state: input.state,
    input: parsedCommand,
    cliRoot: input.cliRoot,
    latestRun: input.latestRun,
    onStateChange: input.onStateChange,
    sessionContext: {
      sessionStore: input.sessionStore,
    },
  })
}

async function handleWorkbenchCommand(input: {
  state: import('@/workbench/types.js').WorkbenchState
  input: ParsedWorkbenchCommand
  cliRoot: string
  latestRun?: import('@/planning/goal-to-docs/types.js').GoalToDocsRunRecord
  onStateChange?: (state: import('@/workbench/types.js').WorkbenchState) => void
  sessionContext: SessionCommandContext
}): Promise<WorkbenchActionResult> {
  switch (input.input.commandName) {
    case '/session-new': {
      const nextSession = await input.sessionContext.sessionStore.createSession(
        input.input.argumentText || 'New Workbench Session',
      )

      return {
        state: appendSystemMessage(nextSession.workbenchState, `Switched to new session: ${nextSession.workbenchState.session.sessionId ?? 'unknown'}`),
        latestRun: nextSession.latestRun,
      }
    }

    case '/session-list': {
      const sessions = await input.sessionContext.sessionStore.listSessions()

      return {
        state: appendSystemMessage(input.state, formatSessionListSummary(sessions)),
        latestRun: input.latestRun,
      }
    }

    case '/session-resume': {
      if (!input.input.argumentText?.trim()) {
        return {
          state: appendSystemMessage(input.state, 'Usage: /session-resume <session-id-or-path>. Use /session-list first.'),
          latestRun: input.latestRun,
        }
      }

      const resumed = await input.sessionContext.sessionStore.resumeSession(input.input.argumentText.trim())

      return {
        state: appendSystemMessage(resumed.workbenchState, `Resumed session: ${resumed.workbenchState.session.sessionId ?? 'unknown'}`),
        latestRun: resumed.latestRun,
      }
    }

    case '/session-fork': {
      const forked = await input.sessionContext.sessionStore.forkSession(
        input.input.argumentText?.trim() || input.state.session.sessionId,
        `Fork of ${input.state.session.sessionName ?? input.state.session.sessionId ?? 'session'}`,
      )

      return {
        state: appendSystemMessage(
          forked.workbenchState,
          `Forked session: ${forked.workbenchState.session.sessionId ?? 'unknown'} from ${input.state.session.sessionId ?? 'unknown'}`,
        ),
        latestRun: forked.latestRun,
      }
    }

    case '/docs-exec-confirm': {
      const confirmed = handleConfirmExecute(input.state)

      if (!confirmed.canExecute || !confirmed.goal) {
        return {
          state: confirmed.state,
          latestRun: input.latestRun,
        }
      }

      const artifactMode: ArtifactMode = confirmed.shouldWrite ? 'write' : 'preview'
      let progressiveState = confirmed.state
      const result = await runGoalToDocsMvp({
        goal: confirmed.goal,
        cliRoot: input.cliRoot,
        artifactMode,
        initialWorkbenchState: confirmed.state,
        skipInitialGoalTimeline: true,
        onWorkbenchStateChange: (nextState) => {
          progressiveState = nextState
          input.onStateChange?.(nextState)
        },
      })

      return {
        state: result.workbenchState ?? progressiveState,
        latestRun: result.run,
      }
    }

    case '/docs-exec-cancel':
      return {
        state: handleCancelRun(input.state),
        latestRun: input.latestRun,
      }

    case '/docs-status-show': {
      const result = handleStatusShow(input.state)

      return {
        state: {
          ...input.state,
          timeline: {
            items: [
              ...input.state.timeline.items,
              {
                type: 'system-summary',
                summary: `status: ${result.command.state.topBar.runtimeStatus}, boundary: ${result.command.state.rightPane.projectInfo.executionBoundary}`,
                createdAt: new Date().toISOString(),
                messageType: 'system-status',
              },
            ],
          },
        },
        latestRun: input.latestRun,
      }
    }

    case '/docs-review-latest': {
      const result = handleReviewLatest(input.state)

      return {
        state: {
          ...input.state,
          timeline: {
            items: [
              ...input.state.timeline.items,
              {
                type: 'review-result',
                summary: result.command.latestSummary ?? 'No review available yet.',
                createdAt: new Date().toISOString(),
                messageType: 'result',
              },
            ],
          },
        },
        latestRun: input.latestRun,
      }
    }

    case '/workbench-help-show':
      return {
        state: appendSystemMessage(
          input.state,
          'Commands: 自然语言默认用于 docs 规划、补约束与修正方案； /docs-exec-confirm 确认当前方案并执行； /docs-exec-cancel 取消待执行方案； /session-new [name] 创建并切换新会话； /session-list 列出当前项目会话； /session-resume <session-id-or-path> 恢复指定会话，支持补全最近会话； /session-fork [session-id-or-path] 从会话创建分支，支持补全最近会话； /docs-status-show 查看状态与执行边界； /docs-review-latest 查看最近审查结论； /workbench-help-show 查看命令帮助； /workbench-thinking-toggle 折叠或展开 Thinking 区； /workbench-pane-chat-focus 聚焦聊天区； /workbench-pane-thinking-focus 聚焦 Thinking 区； /workbench-pane-info-focus 聚焦信息区。兼容命令 /docs-goal-new、/docs-plan-run、/docs-plan-retry 仍可用，但不再是推荐主流程。',
        ),
        latestRun: input.latestRun,
      }

    case '/workbench-thinking-toggle':
      return {
        state: appendSystemMessage(
          toggleWorkbenchThinkingCollapsed(input.state),
          input.state.execution.thinkingCollapsed ? 'Thinking panel expanded.' : 'Thinking panel collapsed.',
        ),
        latestRun: input.latestRun,
      }

    case '/docs-goal-new':
      if (input.input.argumentText?.trim()) {
        const next = handleGoalNew({
          state: input.state,
          goal: input.input.argumentText.trim(),
        })

        return {
          state: appendSystemMessage(next.state, '已接收新的 docs goal。当前推荐直接继续用自然语言补充或修正需求；该兼容命令不再是推荐主流程。'),
          latestRun: input.latestRun,
        }
      }

      return {
        state: appendSystemMessage(input.state, '已准备新的 docs goal。当前推荐直接发送自然语言目标，让工作台生成方案。'),
        latestRun: input.latestRun,
      }

    case '/docs-plan-run': {
      const planningGoal = buildPlanningGoalInput({
        currentGoal: input.state.session.currentGoal,
        inlineIntent: input.input.argumentText,
      })

      if (!planningGoal) {
        return {
          state: appendSystemMessage(input.state, 'No current goal. 请先输入目标文本。'),
          latestRun: input.latestRun,
        }
      }

      return handleGoalPlanning({
        state: input.state,
        goal: planningGoal,
        cliRoot: input.cliRoot,
        signal: undefined,
      })
    }

    case '/docs-plan-retry': {
      const planningGoal = buildPlanningGoalInput({
        currentGoal: input.state.session.currentGoal,
        inlineIntent: input.input.argumentText,
      })

      if (!planningGoal) {
        return {
          state: appendSystemMessage(input.state, 'No current goal to retry.'),
          latestRun: input.latestRun,
        }
      }

      const retriedState = appendSystemMessage(input.state, '正在重试当前 docs 方案规划。当前推荐主流程也支持直接用自然语言要求重新规划。')

      return handleGoalPlanning({
        state: retriedState,
        goal: planningGoal,
        cliRoot: input.cliRoot,
        signal: undefined,
      })
    }

    default:
      return {
        state: appendSystemMessage(input.state, `Unknown command: ${input.input.commandName}`),
        latestRun: input.latestRun,
      }
  }
}

export function parseWorkbenchCommand(input: string): ParsedWorkbenchCommand {
  const [commandName, ...argumentParts] = input.trim().split(/\s+/)

  return {
    commandName: commandName ?? input.trim(),
    argumentText: argumentParts.length > 0 ? argumentParts.join(' ') : undefined,
  }
}

async function createGoalPlan(input: {
  goal: string
  cliRoot: string
  signal?: AbortSignal
  onThinkingDelta?: (delta: string) => void
  onReplyDelta?: (delta: string) => void
  prompt?: string
  apiKey?: string
  modelId?: string
  agentBridge?: PiModelAgentBridge
}): Promise<GoalPlanDraft> {
  try {
    const agentBridge = input.agentBridge ?? new PiModelAgentBridge()
    const prompt = input.prompt ?? buildGoalPlanPrompt(input.goal)
    const modelId = input.modelId ?? DEFAULT_MODEL_ID

    let apiKey = input.apiKey

    if (!apiKey) {
      const credentialStore = new FileOAuthCredentialStore()
      const loginBridge = new PiOAuthLoginBridge()
      const credentials = await credentialStore.read(DEFAULT_PROVIDER)

      if (!credentials) {
        return createFallbackPlan(input.goal)
      }

      const next = await loginBridge.getApiKey({
        provider: DEFAULT_PROVIDER,
        credentials: { [DEFAULT_PROVIDER]: credentials },
      })

      if (!next) {
        return createFallbackPlan(input.goal)
      }

      await credentialStore.write(DEFAULT_PROVIDER, next.newCredentials)
      apiKey = next.apiKey
    }

    let responseText = ''
    let visibleReply = ''

    for await (const event of agentBridge.promptStream({
      cwd: input.cliRoot,
      provider: DEFAULT_PROVIDER,
      modelId,
      prompt,
      apiKey,
      signal: input.signal,
    })) {
      if (event.type === 'thinking-delta' && event.text) {
        input.onThinkingDelta?.(event.text)
      }

      if (event.type === 'text-delta' && event.text) {
        responseText += event.text
        const nextVisibleReply = extractAssistantPlanReply(responseText)
        const replyDelta = nextVisibleReply.slice(visibleReply.length)

        if (replyDelta) {
          visibleReply = nextVisibleReply
          input.onReplyDelta?.(replyDelta)
        }
      }
    }

    return parseGoalPlanResponse(responseText, input.goal, visibleReply.trim())
  } catch (error) {
    if (isAbortError(error, input.signal)) {
      throw error
    }

    return createFallbackPlan(input.goal)
  }
}

async function createPlanningReview(input: {
  goal: string
  plan: GoalPlanDraft
  cliRoot: string
  signal?: AbortSignal
  agentBridge: PiModelAgentBridge
  apiKey: string
  modelId: string
  onThinkingDelta?: (delta: string) => void
  onReplyDelta?: (delta: string) => void
}): Promise<{ result: ReviewResult; visibleReply: string }> {
  try {
    let responseText = ''
    let visibleReply = ''

    for await (const event of input.agentBridge.promptStream({
      cwd: input.cliRoot,
      provider: DEFAULT_PROVIDER,
      modelId: input.modelId,
      prompt: buildPlanningReviewPrompt({
        goal: input.goal,
        plan: input.plan,
      }),
      apiKey: input.apiKey,
      signal: input.signal,
    })) {
      if (event.type === 'thinking-delta' && event.text) {
        input.onThinkingDelta?.(event.text)
      }

      if (event.type === 'text-delta' && event.text) {
        responseText += event.text
        const nextVisibleReply = extractTaggedBlock({
          text: responseText,
          tagName: 'review_reply',
        })
        const replyDelta = nextVisibleReply.slice(visibleReply.length)

        if (replyDelta) {
          visibleReply = nextVisibleReply
          input.onReplyDelta?.(replyDelta)
        }
      }
    }

    return {
      result: parsePlanningReviewResponse(responseText),
      visibleReply: visibleReply.trim() || formatPlanningReviewReply(createAcceptedPlanningReview()),
    }
  } catch (error) {
    if (isAbortError(error, input.signal)) {
      throw error
    }

    const fallbackReview = createAcceptedPlanningReview()

    return {
      result: fallbackReview,
      visibleReply: formatPlanningReviewReply(fallbackReview),
    }
  }
}

function isAbortError(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) {
    return true
  }

  return error instanceof Error && error.name === 'AbortError'
}

function buildGoalPlanPrompt(goal: string): string {
  return [
    '你是一个产品规划助手，负责帮助用户把需求整理成可讨论、可修正、可执行的产品方案。',
    '请先判断这个目标是否需要实际写文件。',
    '不要擅自假设产品形态、客户端类型、技术栈、运行平台或交付媒介。',
    '除非用户明确说明，否则不要默认它是 apps/oc-pi-cli、TUI、CLI、Web、iOS、Android、桌面端或某种既定仓库内产品。',
    '如果用户没有提供关键产品边界，例如目标用户、平台形态、多端范围、核心场景，你应先在 assistant_plan 中明确这些仍待确认，而不是私自补全为某种实现形态。',
    '请严格输出两个区块，先输出给用户看的规划回复，再输出 JSON。',
    '输出格式必须是：',
    '<assistant_plan>',
    '这里写给用户看的中文规划回复，包含：目标理解、3-5 条步骤、可继续修改或确认执行的提示。',
    '优先使用 Markdown 语义来表达重点，例如：**待确认**、**建议**、> 风险、- 列表、1. 步骤、`关键术语`。',
    '</assistant_plan>',
    '<plan_json>',
    '{"summary":"string","shouldWrite":true,"steps":["step 1","step 2","step 3"],"needsUserConfirmation":false,"missingInformation":["待确认项 1"]}',
    '</plan_json>',
    '规则:',
    '- summary 必须是一段简短中文执行方案',
    '- shouldWrite 表示执行阶段是否需要落地写入文件；若仅适合预览分析则为 false',
    '- steps 给出 3 到 5 条中文短步骤',
    '- needsUserConfirmation 表示当前规划是否因为缺少必要信息而必须等待用户补充，若为 true，则暂时不要进入 reviewer 审查。',
    '- missingInformation 用中文列出 1 到 5 条待用户确认的信息；若不缺信息则返回空数组。',
    '- assistant_plan 必须是自然中文，不要解释标签规则',
    '- 若产品形态尚未确定，assistant_plan 应先提出待确认项，例如 Web / iOS / Android / 小程序 / 桌面端，而不是直接替用户决定。',
    '- 如果存在待确认问题，优先使用 `**待确认**:` 或 `**需要确认**:` 开头。',
    '- 如果存在明确建议，优先使用 `**建议**:` 或编号列表。',
    '- 如果存在明显风险或假设，优先使用 `> 风险:` 或 `> 假设:` 形式。',
    `goal: ${goal}`,
  ].join('\n')
}

function buildGoalPlanRevisionPrompt(input: {
  goal: string
  previousPlan: GoalPlanDraft
  review: ReviewResult
  round: number
}): string {
  return [
    buildGoalPlanPrompt(input.goal),
    '',
    `你正在处理第 ${input.round} 轮审查后的修订。`,
    '上一版规划回复：',
    input.previousPlan.assistantReply,
    '',
    '上一轮审查结果：',
    formatPlanningReviewRaw(input.review),
    '',
    '请根据审查意见修订规划；若某条意见不合理，可在 assistant_plan 中简要说明保留理由。',
  ].join('\n')
}

function buildPlanningReviewPrompt(input: {
  goal: string
  plan: GoalPlanDraft
}): string {
  return [
    '你是 goal-reviewer 目标审查者。',
    '请审查下面的应用规划方案。',
    '重点检查规划是否擅自假设了用户没有明确给出的产品形态、技术栈、平台或实现边界。',
    '如果规划把一个未明确的需求直接写成 TUI、CLI、Web、iOS 等具体形态，应返回 changes-requested。',
    '请严格输出两个区块：',
    '<review_reply>',
    '这里写给用户看的自然中文审查意见，说明是通过还是需要修改，并给出关键问题。优先使用 Markdown 语义高亮重点，例如 **建议**、> 风险、- 列表。',
    '</review_reply>',
    '<review_result>',
    'STATUS: accepted 或 STATUS: changes-requested',
    'SUMMARY: 一句中文摘要',
    '可选输出 1 到 3 行 FINDING: <问题描述>',
    '</review_result>',
    '',
    `原始用户目标: ${input.goal}`,
    '',
    '待审规划回复：',
    input.plan.assistantReply,
    '',
    '结构化方案摘要：',
    `SUMMARY: ${input.plan.summary}`,
    ...input.plan.steps.map((step, index) => `STEP ${index + 1}: ${step}`),
  ].join('\n')
}

function parseGoalPlanResponse(text: string, goal: string, assistantReply?: string): GoalPlanDraft {
  try {
    const taggedJsonMatch = text.match(/<plan_json>\s*([\s\S]*?)\s*<\/plan_json>/)
    const fallbackJsonMatch = text.match(/\{[\s\S]*\}/)
    const jsonText = taggedJsonMatch?.[1] ?? fallbackJsonMatch?.[0]

    if (!jsonText) {
      return createFallbackPlan(goal)
    }

    const parsed = JSON.parse(jsonText) as {
      summary?: string
      shouldWrite?: boolean
      steps?: string[]
      needsUserConfirmation?: boolean
      missingInformation?: string[]
    }

    if (!parsed.summary || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      return createFallbackPlan(goal)
    }

    return {
      assistantReply: assistantReply || formatGoalPlanAssistantReply({
        summary: parsed.summary,
        shouldWrite: parsed.shouldWrite ?? true,
        steps: parsed.steps.slice(0, 5),
        needsUserConfirmation: parsed.needsUserConfirmation ?? false,
        missingInformation: normalizeMissingInformation(parsed.missingInformation),
      }),
      summary: parsed.summary,
      shouldWrite: parsed.shouldWrite ?? true,
      steps: parsed.steps.slice(0, 5),
      needsUserConfirmation: parsed.needsUserConfirmation ?? false,
      missingInformation: normalizeMissingInformation(parsed.missingInformation),
    }
  } catch {
    return createFallbackPlan(goal)
  }
}

function parsePlanningReviewResponse(text: string): ReviewResult {
  const reviewResultText = extractTaggedBlock({
    text,
    tagName: 'review_result',
  })

  const statusMatch = reviewResultText.match(/^STATUS:\s*(accepted|changes-requested)$/m)
  const summaryMatch = reviewResultText.match(/^SUMMARY:\s*(.+)$/m)
  const findings = reviewResultText
    .split('\n')
    .filter((line) => line.startsWith('FINDING:'))
    .map((line) => ({
      message: line.replace(/^FINDING:\s*/, '').trim(),
      severity: 'medium' as const,
    }))

  return {
    artifactSlotId: 'product-goal',
    reviewerRoleId: 'goal-reviewer',
    status: statusMatch?.[1] === 'changes-requested' ? 'changes-requested' : 'accepted',
    summary: summaryMatch?.[1]?.trim() ?? '规划审查通过',
    findings,
  }
}

function createFallbackPlan(goal: string): GoalPlanDraft {
  const shouldWrite = /生成|写入|更新|落地|文档|docs|文件/.test(goal)
  const summary = shouldWrite
    ? '我建议先确认产品边界与交付形态，再整理分阶段方案，并在你确认后落到文档。'
    : '我建议先澄清目标范围、用户场景与交付形态，再继续细化方案。'
  const steps = [
    '确认目标用户、核心场景与产品边界',
    '确认产品形态与平台范围',
    '根据对话继续补充或调整方案',
    shouldWrite ? '确认后整理并输出文档结果' : '继续补充信息后再决定是否落文档',
  ]

  return {
    assistantReply: formatGoalPlanAssistantReply({
      summary,
      shouldWrite,
      steps,
      needsUserConfirmation: true,
      missingInformation: [
        '目标用户是谁',
        '产品形态与平台范围是什么',
      ],
    }),
    summary,
    shouldWrite,
    steps,
    needsUserConfirmation: true,
    missingInformation: [
      '目标用户是谁',
      '产品形态与平台范围是什么',
    ],
  }
}

function createAcceptedPlanningReview(): ReviewResult {
  return {
    artifactSlotId: 'product-goal',
    reviewerRoleId: 'goal-reviewer',
    status: 'accepted',
    summary: '规划结构清晰，可以继续。',
    findings: [],
  }
}

function extractAssistantPlanReply(text: string): string {
  return extractTaggedBlock({
    text,
    tagName: 'assistant_plan',
  })
}

function extractTaggedBlock(input: {
  text: string
  tagName: string
}): string {
  const openTag = `<${input.tagName}>`
  const closeTag = `</${input.tagName}>`
  const startIndex = input.text.indexOf(openTag)

  if (startIndex < 0) {
    return ''
  }

  const contentStart = startIndex + openTag.length
  const endIndex = input.text.indexOf(closeTag, contentStart)
  const content = endIndex >= 0
    ? input.text.slice(contentStart, endIndex)
    : stripIncompleteXmlLikeTail(input.text.slice(contentStart))

  return content.replace(/^\s+/, '')
}

function stripIncompleteXmlLikeTail(text: string): string {
  const lastTagStart = text.lastIndexOf('<')

  if (lastTagStart < 0) {
    return text
  }

  const trailingSegment = text.slice(lastTagStart)

  if (trailingSegment.includes('>')) {
    return text
  }

  return text.slice(0, lastTagStart)
}

function normalizeMissingInformation(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 5)
}

function formatGoalPlanAssistantReply(input: {
  summary: string
  steps: string[]
  shouldWrite: boolean
  needsUserConfirmation: boolean
  missingInformation: string[]
}): string {
  if (input.needsUserConfirmation && input.missingInformation.length > 0) {
    return [
      input.summary,
      '',
      '**待确认**：',
      ...input.missingInformation.map((item, index) => `${index + 1}. ${item}`),
      '',
      '请先补充这些信息，我会基于你的回复继续完善方案。',
    ].join('\n')
  }

  return [
    input.summary,
    '',
    '建议步骤：',
    ...input.steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    input.shouldWrite
      ? '如果你认可这个方案，可以直接说“可以落文档”，或使用 /docs-exec-confirm。'
      : '如果你认可这个方案，可以直接说“开始执行”，或使用 /docs-exec-confirm。',
  ].join('\n')
}

function formatPlanningReviewReply(review: ReviewResult): string {
  const header = review.status === 'accepted'
    ? `审查通过：${review.summary}`
    : `需要修改：${review.summary}`

  if (review.findings.length === 0) {
    return header
  }

  return [
    header,
    '',
    '审查意见：',
    ...review.findings.map((finding, index) => `${index + 1}. ${finding.message}`),
  ].join('\n')
}

function formatPlanningReviewRaw(review: ReviewResult): string {
  return [
    `STATUS: ${review.status}`,
    `SUMMARY: ${review.summary}`,
    ...review.findings.map((finding) => `FINDING: ${finding.message}`),
  ].join('\n')
}

function appendSystemMessage(
  state: import('@/workbench/types.js').WorkbenchState,
  summary: string,
): import('@/workbench/types.js').WorkbenchState {
  return {
    ...state,
    timeline: {
      items: [
        ...state.timeline.items,
        {
          type: 'system-summary',
          summary,
          createdAt: new Date().toISOString(),
          messageType: 'system-status',
        },
      ],
    },
  }
}

function appendUserTimelineMessage(
  state: import('@/workbench/types.js').WorkbenchState,
  message: string,
): import('@/workbench/types.js').WorkbenchState {
  return {
    ...state,
    timeline: {
      items: [
        ...state.timeline.items,
        {
          type: 'user-input',
          summary: message,
          createdAt: new Date().toISOString(),
          messageType: 'user',
        },
      ],
    },
  }
}

function formatSessionListSummary(sessions: RuntimeSessionListItem[]): string {
  if (sessions.length === 0) {
    return 'No sessions available for current workspace.'
  }

  return sessions
    .map((session) => {
      const current = session.isCurrent ? ' [current]' : ''
      const name = session.sessionName ? ` ${session.sessionName}` : ''
      const goal = session.goalSummary ? ` | goal: ${session.goalSummary}` : ''

      return `${session.sessionId}${current}${name} | updated: ${session.updatedAt}${goal}`
    })
    .join(' || ')
}

function buildPlanningGoalInput(input: {
  currentGoal?: string
  inlineIntent?: string
}): string | undefined {
  const baseGoal = input.currentGoal?.trim()
  const inlineIntent = input.inlineIntent?.trim()

  if (!baseGoal) {
    return inlineIntent || undefined
  }

  if (!inlineIntent) {
    return baseGoal
  }

  return `${baseGoal}\n\n补充约束: ${inlineIntent}`
}

function shouldConfirmDocsExecution(
  message: string,
  state: import('@/workbench/types.js').WorkbenchState,
): boolean {
  const normalizedMessage = message.trim().toLowerCase()

  if (!state.execution.pendingGoal || state.plan.steps.length === 0) {
    return false
  }

  return [
    /可以落文档/,
    /开始落文档/,
    /开始写入/,
    /可以写入/,
    /确认执行/,
    /开始执行/,
    /执行吧/,
    /就按这个执行/,
    /按这个写/, 
  ].some((pattern) => pattern.test(normalizedMessage))
}

function activatesSession(commandName: string): boolean {
  return [
    '/session-new',
    '/session-resume',
    '/session-fork',
  ].includes(commandName)
}

function createSessionNameFromInput(message: string): string {
  const trimmed = message.trim()

  if (!trimmed) {
    return 'New Workbench Session'
  }

  return trimmed.length > 24 ? `${trimmed.slice(0, 24)}...` : trimmed
}

function filterSessionSuggestions(input: {
  query: string
  sessions: RuntimeSessionListItem[]
}): RuntimeSessionListItem[] {
  const normalizedQuery = input.query.trim().toLowerCase()

  if (!normalizedQuery) {
    return input.sessions.slice(0, 8)
  }

  return input.sessions
    .filter((session) => {
      return [
        session.sessionId,
        session.sessionFile,
        session.sessionName,
        session.goalSummary,
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    })
    .slice(0, 8)
}
