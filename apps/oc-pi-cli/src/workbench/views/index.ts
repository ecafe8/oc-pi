import { Input, Key, type Component, type Focusable, matchesKey, truncateToWidth, wrapTextWithAnsi } from '@earendil-works/pi-tui'

import { presentWorkbenchState } from '@/workbench/presenters/present-workbench-state.js'
import type { WorkbenchState } from '@/workbench/types.js'

const MIN_INFO_PANE_WIDTH = 28
const INFO_PANE_RATIO = 0.34

export interface WorkbenchRootViewOptions {
  state: WorkbenchState
  onSubmit: (value: string) => void
}

export class WorkbenchRootView implements Component, Focusable {
  private readonly input: Input
  private state: WorkbenchState
  private infoScrollOffset = 0

  public constructor(options: WorkbenchRootViewOptions) {
    this.state = options.state
    this.input = new Input()
    this.input.onSubmit = (value) => {
      options.onSubmit(value)
      this.input.setValue('')
    }
  }

  public set focused(value: boolean) {
    this._focused = value
    this.input.focused = value
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

    this.input.handleInput(data)
  }

  public invalidate(): void {
    this.input.invalidate()
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

    const composerLabel = truncateToWidth('> composer: 自然语言默认聊天 | /xxx-xx 命中命令才执行任务 | ctrl+u/d scroll', safeWidth, '...', true)
    const composerInput = this.input.render(Math.max(8, safeWidth))[0] ?? ''.padEnd(safeWidth, ' ')

    return [topBarLine, ''.padEnd(safeWidth, '-'), ...bodyLines, ''.padEnd(safeWidth, '-'), composerLabel, truncateToWidth(composerInput, safeWidth, '...', true)]
  }

  private renderChatLines(
    width: number,
    view: ReturnType<typeof presentWorkbenchState>,
  ): string[] {
    const lines = ['Chat']

    if (view.chatPane.messages.length === 0) {
      lines.push(...wrapTextWithAnsi('A: 请输入目标，或使用 /goal-new 进入目标输入模式。', width))
      return lines
    }

    for (const message of view.chatPane.messages) {
      const label = toMessagePrefix(message.type)
      const streaming = message.isStreaming ? ' [streaming]' : ''
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
