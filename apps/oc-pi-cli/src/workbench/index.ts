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
import { FileRuntimeSessionStore } from '@/runtime/session-store.js'
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
import { toggleWorkbenchThinkingCollapsed } from '@/workbench/state.js'
import { WorkbenchRootView } from '@/workbench/views/index.js'

export interface StartWorkbenchOptions {
  workspacePath: string
}

interface GoalPlanDraft {
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
    onSubmit: async (value) => {
      const trimmed = value.trim()

      if (trimmed.length === 0 || isBusy) {
        return
      }

      isBusy = true
      rootView.setInputLocked(true)

      try {
        if (trimmed.startsWith('/')) {
          const viewCommand = rootView.handleViewCommand(trimmed)

          if (viewCommand.handled) {
            if (viewCommand.message) {
              state = appendSystemMessage(state, viewCommand.message)
            }
          } else {
          const result = await handleWorkbenchCommand({
            state,
            input: trimmed,
            cliRoot: getCliRootPath(),
            latestRun: session?.latestRun,
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
}): Promise<WorkbenchActionResult> {
  const next = handleGoalNew({
    state: input.state,
    goal: input.goal,
  })
  const plan = await createGoalPlan({
    goal: input.goal,
    cliRoot: input.cliRoot,
  })

  return {
    state: applyGoalPlanToWorkbench({
      state: next.state,
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
  const thinkingState = markAssistantReplyPending(handleChatMessage({
    state: input.state,
    message: input.message,
  }))
  input.onStateChange(thinkingState)

  const reply = await createChatReply({
    message: input.message,
    cliRoot: input.cliRoot,
    currentGoal: thinkingState.session.currentGoal,
    signal: input.signal,
    onDelta: (delta, currentState) => {
      const nextState = appendAssistantReplyDelta(currentState, delta)
      input.onStateChange(nextState)
      return nextState
    },
    onThinkingDelta: (delta, currentState) => {
      const nextState = appendAssistantThinkingDelta(currentState, delta)
      input.onStateChange(nextState)
      return nextState
    },
    initialState: thinkingState,
  })

  if (reply.interrupted) {
    const interruptedReply = reply.text.trim() || '已中断当前 AI 回复。'

    return {
      state: appendSystemMessage(
        applyChatReply(reply.state, interruptedReply),
        '已中断当前 AI 回复。',
      ),
    }
  }

  return {
    state: applyChatReply(reply.state, reply.text),
  }
}

async function handleWorkbenchCommand(input: {
  state: import('@/workbench/types.js').WorkbenchState
  input: string
  cliRoot: string
  latestRun?: import('@/planning/goal-to-docs/types.js').GoalToDocsRunRecord
}): Promise<WorkbenchActionResult> {
  switch (input.input) {
    case '/confirm-execute': {
      const confirmed = handleConfirmExecute(input.state)

      if (!confirmed.canExecute || !confirmed.goal) {
        return {
          state: confirmed.state,
          latestRun: input.latestRun,
        }
      }

      const artifactMode: ArtifactMode = confirmed.shouldWrite ? 'write' : 'preview'
      const result = await runGoalToDocsMvp({
        goal: confirmed.goal,
        cliRoot: input.cliRoot,
        artifactMode,
        initialWorkbenchState: confirmed.state,
        skipInitialGoalTimeline: true,
      })

      return {
        state: result.workbenchState,
        latestRun: result.run,
      }
    }

    case '/cancel-run':
      return {
        state: handleCancelRun(input.state),
        latestRun: input.latestRun,
      }

    case '/status-show': {
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

    case '/review-latest': {
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

    case '/help-show':
      return {
        state: appendSystemMessage(input.state, 'Commands: /goal-new /goal-run /goal-retry /confirm-execute /cancel-run /status-show /review-latest /help-show /thinking-toggle /pane-chat /pane-thinking /pane-info'),
        latestRun: input.latestRun,
      }

    case '/thinking-toggle':
      return {
        state: appendSystemMessage(
          toggleWorkbenchThinkingCollapsed(input.state),
          input.state.execution.thinkingCollapsed ? 'Thinking panel expanded.' : 'Thinking panel collapsed.',
        ),
        latestRun: input.latestRun,
      }

    case '/goal-new':
      return {
        state: appendSystemMessage(input.state, '已准备新的 goal。接下来请用自然语言描述目标，再用 /goal-run 生成执行方案。'),
        latestRun: input.latestRun,
      }

    case '/goal-run': {
      if (!input.state.session.currentGoal) {
        return {
          state: appendSystemMessage(input.state, 'No current goal. 请先输入目标文本。'),
          latestRun: input.latestRun,
        }
      }

      return handleGoalPlanning({
        state: input.state,
        goal: input.state.session.currentGoal,
        cliRoot: input.cliRoot,
      })
    }

    case '/goal-retry': {
      if (!input.state.session.currentGoal) {
        return {
          state: appendSystemMessage(input.state, 'No current goal to retry.'),
          latestRun: input.latestRun,
        }
      }

      const retriedState = appendSystemMessage(input.state, 'Retrying AI plan generation for current goal.')

      return handleGoalPlanning({
        state: retriedState,
        goal: input.state.session.currentGoal,
        cliRoot: input.cliRoot,
      })
    }

    default:
      return {
        state: appendSystemMessage(input.state, `Unknown command: ${input.input}`),
        latestRun: input.latestRun,
      }
  }
}

async function createGoalPlan(input: {
  goal: string
  cliRoot: string
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

    const response = await agentBridge.prompt({
      cwd: input.cliRoot,
      provider: DEFAULT_PROVIDER,
      modelId: DEFAULT_MODEL_ID,
      prompt: buildGoalPlanPrompt(input.goal),
      apiKey: next.apiKey,
    })

    return parseGoalPlanResponse(response.text, input.goal)
  } catch {
    return createFallbackPlan(input.goal)
  }
}

async function createChatReply(input: {
  message: string
  cliRoot: string
  currentGoal?: string
  initialState: import('@/workbench/types.js').WorkbenchState
  signal: AbortSignal
  onDelta: (delta: string, state: import('@/workbench/types.js').WorkbenchState) => import('@/workbench/types.js').WorkbenchState
  onThinkingDelta: (delta: string, state: import('@/workbench/types.js').WorkbenchState) => import('@/workbench/types.js').WorkbenchState
}): Promise<{ text: string; state: import('@/workbench/types.js').WorkbenchState; interrupted: boolean }> {
  try {
    const credentialStore = new FileOAuthCredentialStore()
    const loginBridge = new PiOAuthLoginBridge()
    const agentBridge = new PiModelAgentBridge()
    const credentials = await credentialStore.read(DEFAULT_PROVIDER)

    if (!credentials) {
      return {
        text: createFallbackChatReply(input.message),
        state: input.initialState,
        interrupted: false,
      }
    }

    const next = await loginBridge.getApiKey({
      provider: DEFAULT_PROVIDER,
      credentials: { [DEFAULT_PROVIDER]: credentials },
    })

    if (!next) {
      return {
        text: createFallbackChatReply(input.message),
        state: input.initialState,
        interrupted: false,
      }
    }

    await credentialStore.write(DEFAULT_PROVIDER, next.newCredentials)

    let streamedText = ''
    let currentState = input.initialState

    for await (const event of agentBridge.promptStream({
      cwd: input.cliRoot,
      provider: DEFAULT_PROVIDER,
      modelId: DEFAULT_MODEL_ID,
      prompt: buildWorkbenchChatPrompt(input),
      apiKey: next.apiKey,
      signal: input.signal,
    })) {

      if (event.type === 'text-delta' && event.text) {
        streamedText += event.text
        currentState = input.onDelta(event.text, currentState)
      }

      if (event.type === 'thinking-delta' && event.text) {
        currentState = input.onThinkingDelta(event.text, currentState)
      }
    }

    return {
      text: streamedText.trim() || createFallbackChatReply(input.message),
      state: currentState,
      interrupted: input.signal.aborted,
    }
  } catch {
    return {
      text: createFallbackChatReply(input.message),
      state: input.initialState,
      interrupted: input.signal.aborted,
    }
  }
}

function buildWorkbenchChatPrompt(input: {
  message: string
  currentGoal?: string
}): string {
  return [
    '你是 apps/oc-pi-cli 的 interactive workbench 聊天助手。',
    '当前阶段先只做聊天，不要直接执行任务，不要把自然语言输入解释成命令。',
    '如果用户想真正触发任务，请提醒使用 slash command，例如 /goal-run、/status-show、/review-latest。',
    '请用简洁中文回复。',
    input.currentGoal ? `current goal: ${input.currentGoal}` : 'current goal: none',
    `user message: ${input.message}`,
  ].join('\n')
}

function buildGoalPlanPrompt(goal: string): string {
  return [
    '你是 apps/oc-pi-cli 的工作台规划助手。',
    '请先判断这个目标是否需要实际写文件。',
    '只返回 JSON，不要输出 Markdown 或解释。',
    'JSON schema:',
    '{"summary":"string","shouldWrite":true,"steps":["step 1","step 2","step 3"]}',
    '规则:',
    '- summary 必须是一段简短中文执行方案',
    '- shouldWrite 表示执行阶段是否需要落地写入文件；若仅适合预览分析则为 false',
    '- steps 给出 3 到 5 条中文短步骤',
    `goal: ${goal}`,
  ].join('\n')
}

function parseGoalPlanResponse(text: string, goal: string): GoalPlanDraft {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      return createFallbackPlan(goal)
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      summary?: string
      shouldWrite?: boolean
      steps?: string[]
    }

    if (!parsed.summary || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      return createFallbackPlan(goal)
    }

    return {
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

  return {
    summary: shouldWrite
      ? `我建议先确认目标边界，然后执行四阶段 goal-to-docs，并根据运行阶段决定写入 sandbox 还是 workspace docs。`
      : '我建议先做预览分析，确认范围与阶段输出后再决定是否写入。',
    shouldWrite,
    steps: [
      '确认目标范围与输出边界',
      '生成四阶段执行方案',
      '等待用户确认是否执行',
      shouldWrite ? '执行并输出结果文件摘要' : '预览结果并等待下一步确认',
    ],
  }
}

function createFallbackChatReply(message: string): string {
  return `我已收到你的消息：${message}。当前自然语言输入先作为聊天处理；如果你想生成执行方案，请输入 /goal-run。`
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
