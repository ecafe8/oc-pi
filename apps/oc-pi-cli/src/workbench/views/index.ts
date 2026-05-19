import {
  CombinedAutocompleteProvider,
  Editor,
  Key,
  type Component,
  type Focusable,
  type SlashCommand,
  type TUI,
  matchesKey,
  truncateToWidth,
  wrapTextWithAnsi,
} from '@earendil-works/pi-tui'

import { presentWorkbenchState } from '@/workbench/presenters/present-workbench-state.js'
import type { WorkbenchState } from '@/workbench/types.js'

const MIN_INFO_PANE_WIDTH = 28
const INFO_PANE_RATIO = 0.34

export interface WorkbenchRootViewOptions {
  tui: TUI
  workspacePath: string
  state: WorkbenchState
  onSubmit: (value: string) => void
}

export class WorkbenchRootView implements Component, Focusable {
  private readonly editor: Editor
  private state: WorkbenchState
  private infoScrollOffset = 0

  public constructor(options: WorkbenchRootViewOptions) {
    this.state = options.state
    this.editor = new Editor(options.tui, EDITOR_THEME, {
      paddingX: 0,
      autocompleteMaxVisible: 6,
    })
    this.editor.setAutocompleteProvider(
      new CombinedAutocompleteProvider(WORKBENCH_COMMANDS, options.workspacePath),
    )
    this.editor.onSubmit = (value) => {
      options.onSubmit(value)
      this.editor.setText('')
    }
  }

  public set focused(value: boolean) {
    this._focused = value
    this.editor.focused = value
  }

  public get focused(): boolean {
    return this._focused
  }

  private _focused = false

  public setState(state: WorkbenchState): void {
    this.state = state
    this.invalidate()
  }

  public handleInput(data: string): void {
    if (matchesKey(data, Key.ctrl('u'))) {
      this.infoScrollOffset = Math.max(0, this.infoScrollOffset - 3)
      return
    }

    if (matchesKey(data, Key.ctrl('d'))) {
      this.infoScrollOffset += 3
      return
    }

    this.editor.handleInput(data)
  }

  public invalidate(): void {
    this.editor.invalidate()
  }

  public render(width: number): string[] {
    const view = presentWorkbenchState(this.state)
    const safeWidth = Math.max(width, 40)
    const infoWidth = Math.max(MIN_INFO_PANE_WIDTH, Math.floor(safeWidth * INFO_PANE_RATIO))
    const dividerWidth = 3
    const chatWidth = Math.max(20, safeWidth - infoWidth - dividerWidth)

    const topBarLine = truncateToWidth(
      `model: ${view.topBar.modelId} | ctx: ${view.topBar.contextSummary} | version: ${view.topBar.appVersion} | mode: ${view.topBar.mode} | status: ${view.topBar.runtimeStatus}`,
      safeWidth,
      '...',
      true,
    )

    const chatLines = this.renderChatLines(chatWidth, view)
    const infoLines = this.renderInfoLines(infoWidth, view)
    const visibleInfoLines = this.sliceInfoLines(infoLines, chatLines.length)
    const rowCount = Math.max(chatLines.length, visibleInfoLines.length)
    const bodyLines: string[] = []

    for (let index = 0; index < rowCount; index += 1) {
      const left = truncateToWidth(chatLines[index] ?? '', chatWidth, '...', true)
      const right = truncateToWidth(visibleInfoLines[index] ?? '', infoWidth, '...', true)

      bodyLines.push(`${left} | ${right}`)
    }

    const composerLabel = truncateToWidth('> composer: 自然语言默认聊天 | 输入 / 查看命令补全 | /xxx-xx 命中命令才执行任务', safeWidth, '...', true)
    const composerLines = this.editor.render(Math.max(20, safeWidth))
    const thinkingLines = this.renderThinkingLines(safeWidth)

    return [topBarLine, ''.padEnd(safeWidth, '-'), ...bodyLines, ''.padEnd(safeWidth, '-'), ...thinkingLines, composerLabel, ...composerLines]
  }

  private renderThinkingLines(width: number): string[] {
    if (!this.state.execution.thinkingText?.trim()) {
      return []
    }

    if (this.state.execution.thinkingCollapsed) {
      return [
        truncateToWidth(
          `Thinking (collapsed) | ${this.state.execution.thinkingText.length} chars | /thinking-toggle to expand`,
          width,
          '...',
          true,
        ),
      ]
    }

    return [
      truncateToWidth('Thinking | /thinking-toggle to collapse', width, '...', true),
      ...wrapTextWithAnsi(this.state.execution.thinkingText, width),
      ''.padEnd(width, '.'),
    ]
  }

  private renderChatLines(
    width: number,
    view: ReturnType<typeof presentWorkbenchState>,
  ): string[] {
    const lines = ['Chat']

    if (view.chatPane.messages.length === 0) {
      lines.push(...wrapTextWithAnsi('A: 请输入自然语言开始聊天；输入 / 可查看命令补全。', width))
      return lines
    }

    for (const message of view.chatPane.messages) {
      const label = toMessagePrefix(message.type)
      const streaming = message.isStreaming ? ' ...' : ''
      const content = `${label}: ${message.summary}${streaming}`

      lines.push(...wrapTextWithAnsi(content, width))
    }

    return lines
  }

  private renderInfoLines(
    width: number,
    view: ReturnType<typeof presentWorkbenchState>,
  ): string[] {
    const lines = [
      'Info',
      '',
      'Project',
      ...wrapTextWithAnsi(`workspace: ${view.rightPane.projectInfo.workspacePath}`, width),
      ...wrapTextWithAnsi(`goal: ${view.rightPane.projectInfo.goalSummary ?? 'none'}`, width),
      `stage: ${view.rightPane.projectInfo.currentStageId}`,
      `stage-status: ${view.rightPane.projectInfo.currentStageStatus}`,
      `role: ${view.rightPane.projectInfo.activeRoleId}`,
      `target: ${view.rightPane.projectInfo.activeOutputTarget}`,
      `boundary: ${view.rightPane.projectInfo.executionBoundary}`,
      '',
      'Plan',
    ]

    if (view.rightPane.plan.steps.length === 0) {
      lines.push('no plan yet')
    } else {
      for (const step of view.rightPane.plan.steps) {
        lines.push(...wrapTextWithAnsi(`[${step.status}] ${step.label}`, width))

        if (step.summary) {
          lines.push(...wrapTextWithAnsi(`  ${step.summary}`, width))
        }
      }
    }

    lines.push('', 'Execution')
    lines.push(...wrapTextWithAnsi(`current: ${view.rightPane.execution.currentAction}`, width))
    lines.push(...wrapTextWithAnsi(`latest: ${view.rightPane.execution.latestAction}`, width))
    lines.push(`status: ${view.rightPane.execution.lastExecutionStatus}`)
    lines.push(`review: ${view.rightPane.execution.latestReviewStatus ?? 'not-started'}`)

    if (view.rightPane.execution.latestReviewSummary) {
      lines.push(...wrapTextWithAnsi(`review-summary: ${view.rightPane.execution.latestReviewSummary}`, width))
    }

    lines.push(`findings: ${view.rightPane.execution.reviewFindingCount}`)
    lines.push(...wrapTextWithAnsi(`resolved: ${view.rightPane.execution.resolvedPath || 'none'}`, width))

    if (view.rightPane.execution.touchedFiles.length > 0) {
      lines.push('files:')

      for (const file of view.rightPane.execution.touchedFiles) {
        lines.push(...wrapTextWithAnsi(`- ${file}`, width))
      }
    }

    if (view.rightPane.execution.blockingIssues.length > 0) {
      lines.push('blocking:')

      for (const issue of view.rightPane.execution.blockingIssues) {
        lines.push(...wrapTextWithAnsi(`- ${issue}`, width))
      }
    }

    return lines
  }

  private sliceInfoLines(lines: string[], visibleHeight: number): string[] {
    if (visibleHeight <= 0) {
      return []
    }

    const maxOffset = Math.max(0, lines.length - visibleHeight)
    this.infoScrollOffset = Math.min(this.infoScrollOffset, maxOffset)

    return lines.slice(this.infoScrollOffset, this.infoScrollOffset + visibleHeight)
  }
}

const WORKBENCH_COMMANDS: SlashCommand[] = [
  { name: 'goal-new', description: '设置新的 goal 目标' },
  { name: 'goal-run', description: '基于当前 goal 生成执行方案' },
  { name: 'goal-retry', description: '重新生成当前 goal 的方案' },
  { name: 'confirm-execute', description: '确认当前方案并开始执行' },
  { name: 'cancel-run', description: '取消待执行方案' },
  { name: 'status-show', description: '查看当前状态摘要' },
  { name: 'review-latest', description: '查看最近一次审查结论' },
  { name: 'help-show', description: '查看命令帮助' },
  { name: 'thinking-toggle', description: '折叠或展开 Thinking 区' },
]

const EDITOR_THEME = {
  borderColor: (text: string): string => text,
  selectList: {
    selectedPrefix: (text: string): string => text,
    selectedText: (text: string): string => text,
    description: (text: string): string => text,
    scrollInfo: (text: string): string => text,
    noMatch: (text: string): string => text,
  },
}

function toMessagePrefix(type: string): string {
  if (type.startsWith('user')) {
    return 'U'
  }

  if (type.startsWith('assistant')) {
    return 'A'
  }

  if (type.startsWith('result')) {
    return 'R'
  }

  return 'S'
}
