import { ProcessTerminal, TUI, isKeyRelease, matchesKey } from '@earendil-works/pi-tui'

import {
  FileOAuthCredentialStore,
  PiModelAgentBridge,
  PiOAuthLoginBridge,
} from '@/provider-adapters/index.js'
import { type ArtifactMode, runGoalToDocsMvp } from '@/planning/goal-to-docs/run-mvp.js'
import type { GoalToDocsRunRecord } from '@/planning/goal-to-docs/types.js'
import { createDefaultWorkbenchState } from '@/runtime/default-config.js'
import { getCliRootPath } from '@/runtime/paths.js'
import {
  FileRuntimeSessionStore,
  type RuntimeSessionListItem,
} from '@/runtime/session-store.js'
import {
  appendAssistantReplyDelta,
  appendAssistantThinkingDelta,
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
import { setWorkbenchGoal, setWorkbenchRuntimeStatus, toggleWorkbenchThinkingCollapsed } from '@/workbench/state.js'
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
}

interface WorkbenchActionResult {
  state: import('@/workbench/types.js').WorkbenchState
  latestRun?: GoalToDocsRunRecord
}

const DEFAULT_PROVIDER = 'github-copilot'
const DEFAULT_MODEL_ID = 'gpt-5-mini'
const ENTER_ALTERNATE_SCREEN = '\u001b[?1049h'
const EXIT_ALTERNATE_SCREEN = '\u001b[?1049l'
const ENABLE_MOUSE_REPORTING = '\u001b[?1000h\u001b[?1006h'
const DISABLE_MOUSE_REPORTING = '\u001b[?1000l\u001b[?1006l'

export async function startWorkbench(options: StartWorkbenchOptions): Promise<void> {
  const sessionStore = new FileRuntimeSessionStore(options.workspacePath)
  let session = await sessionStore.read()
  let state = session?.workbenchState ?? createDefaultWorkbenchState(options.workspacePath)
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
          session = {
            workbenchState: state,
            latestRun: result.latestRun ?? session?.latestRun,
          }
          }
        } else {
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

        await sessionStore.write({
          workbenchState: state,
          latestRun: session?.latestRun,
        })
        session = await sessionStore.read()
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
  const next = handleGoalNew({
    state: input.state,
    goal: input.goal,
  })
  let progressiveState = markAssistantReplyPending(next.state)
  input.onStateChange?.(progressiveState)

  let plan: GoalPlanDraft

  try {
    plan = await createGoalPlan({
      goal: input.goal,
      cliRoot: input.cliRoot,
      signal: input.signal,
      onThinkingDelta: (delta) => {
        progressiveState = appendAssistantThinkingDelta(progressiveState, delta)
        input.onStateChange?.(progressiveState)
      },
      onReplyDelta: (delta) => {
        progressiveState = appendAssistantReplyDelta(progressiveState, delta)
        input.onStateChange?.(progressiveState)
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
      state: applyChatReply(progressiveState, plan.assistantReply),
      goal: input.goal,
      summary: plan.summary,
      steps: plan.steps,
      shouldWrite: plan.shouldWrite,
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
  const planningState = markAssistantReplyPending(setWorkbenchGoal(chatState, planningGoal))
  input.onStateChange(planningState)
  let progressiveState = planningState

  let plan: GoalPlanDraft

  try {
    plan = await createGoalPlan({
      goal: planningGoal,
      cliRoot: input.cliRoot,
      signal: input.signal,
      onThinkingDelta: (delta) => {
        progressiveState = appendAssistantThinkingDelta(progressiveState, delta)
        input.onStateChange(progressiveState)
      },
      onReplyDelta: (delta) => {
        progressiveState = appendAssistantReplyDelta(progressiveState, delta)
        input.onStateChange(progressiveState)
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
      state: applyChatReply(progressiveState, plan.assistantReply),
      goal: planningGoal,
      summary: plan.summary,
      steps: plan.steps,
      shouldWrite: plan.shouldWrite,
    }),
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
}): Promise<GoalPlanDraft> {
  try {
    const credentialStore = new FileOAuthCredentialStore()
    const loginBridge = new PiOAuthLoginBridge()
    const agentBridge = new PiModelAgentBridge()
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

    let responseText = ''
    let visibleReply = ''

    for await (const event of agentBridge.promptStream({
      cwd: input.cliRoot,
      provider: DEFAULT_PROVIDER,
      modelId: DEFAULT_MODEL_ID,
      prompt: buildGoalPlanPrompt(input.goal),
      apiKey: next.apiKey,
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

function isAbortError(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) {
    return true
  }

  return error instanceof Error && error.name === 'AbortError'
}

function buildGoalPlanPrompt(goal: string): string {
  return [
    '你是 apps/oc-pi-cli 的工作台规划助手。',
    '请先判断这个目标是否需要实际写文件。',
    '请严格输出两个区块，先输出给用户看的规划回复，再输出 JSON。',
    '输出格式必须是：',
    '<assistant_plan>',
    '这里写给用户看的中文规划回复，包含：目标理解、3-5 条步骤、可继续修改或确认执行的提示。',
    '</assistant_plan>',
    '<plan_json>',
    '{"summary":"string","shouldWrite":true,"steps":["step 1","step 2","step 3"]}',
    '</plan_json>',
    '规则:',
    '- summary 必须是一段简短中文执行方案',
    '- shouldWrite 表示执行阶段是否需要落地写入文件；若仅适合预览分析则为 false',
    '- steps 给出 3 到 5 条中文短步骤',
    '- assistant_plan 必须是自然中文，不要解释标签规则',
    `goal: ${goal}`,
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
    }

    if (!parsed.summary || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      return createFallbackPlan(goal)
    }

    return {
      assistantReply: assistantReply || formatGoalPlanAssistantReply({
        summary: parsed.summary,
        shouldWrite: parsed.shouldWrite ?? true,
        steps: parsed.steps.slice(0, 5),
      }),
      summary: parsed.summary,
      shouldWrite: parsed.shouldWrite ?? true,
      steps: parsed.steps.slice(0, 5),
    }
  } catch {
    return createFallbackPlan(goal)
  }
}

function createFallbackPlan(goal: string): GoalPlanDraft {
  const shouldWrite = /生成|写入|更新|落地|文档|docs|文件/.test(goal)
  const summary = shouldWrite
    ? `我建议先确认目标边界，然后执行四阶段 goal-to-docs，并根据运行阶段决定写入 sandbox 还是 workspace docs。`
    : '我建议先做预览分析，确认范围与阶段输出后再决定是否写入。'
  const steps = [
    '确认目标范围与输出边界',
    '生成四阶段执行方案',
    '根据对话继续补充或调整方案',
    shouldWrite ? '确认后执行并输出结果文件摘要' : '确认后执行预览并等待下一步确认',
  ]

  return {
    assistantReply: formatGoalPlanAssistantReply({
      summary,
      shouldWrite,
      steps,
    }),
    summary,
    shouldWrite,
    steps,
  }
}

function extractAssistantPlanReply(text: string): string {
  const openTag = '<assistant_plan>'
  const closeTag = '</assistant_plan>'
  const startIndex = text.indexOf(openTag)

  if (startIndex < 0) {
    return ''
  }

  const contentStart = startIndex + openTag.length
  const endIndex = text.indexOf(closeTag, contentStart)
  const content = endIndex >= 0
    ? text.slice(contentStart, endIndex)
    : stripIncompleteXmlLikeTail(text.slice(contentStart))

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

function formatGoalPlanAssistantReply(input: {
  summary: string
  steps: string[]
  shouldWrite: boolean
}): string {
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
