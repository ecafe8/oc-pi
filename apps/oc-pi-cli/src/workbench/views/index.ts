import {
  CombinedAutocompleteProvider,
  type Component,
  Editor,
  type Focusable,
  Key,
  matchesKey,
  type SlashCommand,
  type TUI,
  truncateToWidth,
  wrapTextWithAnsi,
} from "@earendil-works/pi-tui";

import { presentWorkbenchState } from "@/workbench/presenters/present-workbench-state.js";
import type { WorkbenchState } from "@/workbench/types.js";

const MIN_INFO_PANE_WIDTH = 28;
const INFO_PANE_RATIO = 0.34;
type ScrollPane = "chat" | "thinking" | "info";

interface RenderLayoutMetrics {
  bodyStartRow: number;
  bodyHeight: number;
  chatWidth: number;
  thinkingStartRow: number;
  thinkingHeight: number;
}

export interface WorkbenchRootViewOptions {
  tui: TUI;
  workspacePath: string;
  state: WorkbenchState;
  onSubmit: (value: string) => void;
}

export interface WorkbenchViewCommandResult {
  handled: boolean;
  message?: string;
}

export class WorkbenchRootView implements Component, Focusable {
  private readonly editor: Editor;
  private readonly tui: TUI;
  private state: WorkbenchState;
  private chatScrollOffset = 0;
  private thinkingScrollOffset = 0;
  private infoScrollOffset = 0;
  private autoFollowChat = true;
  private lastChatSignature = "";
  private lastChatMaxOffset = 0;
  private activeScrollPane: ScrollPane = "chat";
  private lastLayout: RenderLayoutMetrics | null = null;
  private inputLocked = false;
  private cancelHintRemainingEsc = 0;
  private shimmerFrame = 0;
  private shimmerTimer: ReturnType<typeof setInterval> | undefined;

  public constructor(options: WorkbenchRootViewOptions) {
    this.tui = options.tui;
    this.state = options.state;
    this.editor = new Editor(options.tui, EDITOR_THEME, {
      paddingX: 0,
      autocompleteMaxVisible: 6,
    });
    this.editor.setAutocompleteProvider(new CombinedAutocompleteProvider(WORKBENCH_COMMANDS, options.workspacePath));
    this.editor.onSubmit = (value) => {
      options.onSubmit(value);
      this.editor.setText("");
    };
  }

  public set focused(value: boolean) {
    this._focused = value;
    this.editor.focused = value && !this.inputLocked;
  }

  public get focused(): boolean {
    return this._focused;
  }

  private _focused = false;

  public setState(state: WorkbenchState): void {
    this.syncChatAutoFollow(state);
    this.state = state;
    this.invalidate();
  }

  public handleInput(data: string): void {
    if (this.handleMouseInput(data)) {
      return;
    }

    if (matchesKey(data, Key.ctrl("1"))) {
      this.activeScrollPane = "chat";
      return;
    }

    if (matchesKey(data, Key.ctrl("2"))) {
      this.activeScrollPane = "thinking";
      return;
    }

    if (matchesKey(data, Key.ctrl("3"))) {
      this.activeScrollPane = "info";
      return;
    }

    if (matchesKey(data, Key.ctrl("u"))) {
      this.scrollActivePane(-3);
      return;
    }

    if (matchesKey(data, Key.ctrl("d"))) {
      this.scrollActivePane(3);
      return;
    }

    if (this.inputLocked) {
      return;
    }

    this.editor.handleInput(data);
  }

  public invalidate(): void {
    this.editor.invalidate();
  }

  public setInputLocked(value: boolean): void {
    if (this.inputLocked === value) {
      return;
    }

    this.inputLocked = value;
    this.editor.focused = this._focused && !value;

    if (!value) {
      this.cancelHintRemainingEsc = 0;
    }

    if (value) {
      this.startShimmer();
    } else {
      this.stopShimmer();
    }

    this.invalidate();
    this.tui.requestRender(true);
  }

  public setCancelHintRemainingEsc(value: number): void {
    const nextValue = Math.max(0, value);

    if (this.cancelHintRemainingEsc === nextValue) {
      return;
    }

    this.cancelHintRemainingEsc = nextValue;
    this.invalidate();
    this.tui.requestRender(true);
  }

  public dispose(): void {
    this.stopShimmer();
  }

  public handleViewCommand(command: string): WorkbenchViewCommandResult {
    if (command === "/workbench-pane-chat-focus") {
      this.activeScrollPane = "chat";
      return { handled: true, message: "Active scroll pane: chat" };
    }

    if (command === "/workbench-pane-thinking-focus") {
      this.activeScrollPane = "thinking";
      return { handled: true, message: "Active scroll pane: thinking" };
    }

    if (command === "/workbench-pane-info-focus") {
      this.activeScrollPane = "info";
      return { handled: true, message: "Active scroll pane: info" };
    }

    return { handled: false };
  }

  public render(width: number): string[] {
    const view = presentWorkbenchState(this.state);
    const safeWidth = Math.max(width, 40);
    const infoWidth = Math.max(MIN_INFO_PANE_WIDTH, Math.floor(safeWidth * INFO_PANE_RATIO));
    const dividerWidth = 3;
    const chatWidth = Math.max(20, safeWidth - infoWidth - dividerWidth);
    const thinkingLines = this.renderThinkingLines(safeWidth);
    const composerLabel = truncateToWidth(
      this.inputLocked
        ? `> composer: AI 处理中 | 输入已暂停${this.renderCancelHint()} | active: ${this.activeScrollPane}`
        : `> composer: 自然语言默认聊天 | 输入 / 查看命令补全 | ctrl+1 chat | ctrl+2 thinking | ctrl+3 info | active: ${this.activeScrollPane}`,
      safeWidth,
      "...",
      true,
    );
    const composerLines = this.renderComposerLines(safeWidth);
    const bodyViewportHeight = this.resolveBodyViewportHeight({
      thinkingLines,
      composerLines,
    });

    const topBarLine = truncateToWidth(
      `session: ${view.topBar.sessionName ?? view.topBar.sessionId ?? 'none'} | model: ${view.topBar.modelId} | ctx: ${view.topBar.contextSummary} | version: ${view.topBar.appVersion} | mode: ${view.topBar.mode} | status: ${view.topBar.runtimeStatus}`,
      safeWidth,
      "...",
      true,
    );

    const chatLines = this.renderChatLines(chatWidth, view);
    const infoLines = this.renderInfoLines(infoWidth, view);
    const visibleChatLines = this.slicePaneLines("chat", chatLines, bodyViewportHeight);
    const visibleInfoLines = this.slicePaneLines("info", infoLines, bodyViewportHeight);
    const rowCount = Math.max(bodyViewportHeight, visibleChatLines.length, visibleInfoLines.length);
    const bodyLines: string[] = [];

    this.lastLayout = {
      bodyStartRow: 3,
      bodyHeight: rowCount,
      chatWidth,
      thinkingStartRow: 4 + rowCount,
      thinkingHeight: thinkingLines.length,
    };

    for (let index = 0; index < rowCount; index += 1) {
      const left = truncateToWidth(visibleChatLines[index] ?? "", chatWidth, "...", true);
      const right = truncateToWidth(visibleInfoLines[index] ?? "", infoWidth, "...", true);

      bodyLines.push(`${left} | ${right}`);
    }

    return [
      topBarLine,
      "".padEnd(safeWidth, "-"),
      ...bodyLines,
      "".padEnd(safeWidth, "-"),
      ...thinkingLines,
      composerLabel,
      ...composerLines,
    ];
  }

  private renderThinkingLines(width: number): string[] {
    if (!this.state.execution.thinkingText?.trim()) {
      return [];
    }

    if (this.state.execution.thinkingCollapsed) {
      return [
        this.decoratePaneTitle(
          `Thinking (collapsed) | ${this.state.execution.thinkingText.length} chars | /workbench-thinking-toggle to expand`,
          "thinking",
          width,
        ),
      ];
    }

    const allLines = [
      this.decoratePaneTitle("Thinking | /workbench-thinking-toggle to collapse", "thinking", width),
      ...wrapTextWithAnsi(this.state.execution.thinkingText, width),
    ];
    const visibleThinkingLines = this.slicePaneLines("thinking", allLines, 6);

    return [...visibleThinkingLines, "".padEnd(width, ".")];
  }

  private renderChatLines(width: number, view: ReturnType<typeof presentWorkbenchState>): string[] {
    const lines = [this.decoratePaneTitle("Chat", "chat", width)];

    if (view.chatPane.messages.length === 0) {
      lines.push(...wrapTextWithAnsi("A: 请输入自然语言开始聊天；输入 / 可查看命令补全。", width));
      return lines;
    }

    for (const message of view.chatPane.messages) {
      const label = toMessagePrefix(message.type);
      const content = `${label}: ${message.summary}`;

      lines.push(...wrapTextWithAnsi(content, width));
    }

    return lines;
  }

  private renderInfoLines(width: number, view: ReturnType<typeof presentWorkbenchState>): string[] {
    const lines = [
      this.decoratePaneTitle("Info", "info", width),
      "",
      "Project",
      ...wrapTextWithAnsi(`session: ${view.rightPane.projectInfo.sessionName ?? view.rightPane.projectInfo.sessionId ?? 'none'}`, width),
      ...wrapTextWithAnsi(`workspace: ${view.rightPane.projectInfo.workspacePath}`, width),
      ...wrapTextWithAnsi(`goal: ${view.rightPane.projectInfo.goalSummary ?? "none"}`, width),
      `stage: ${view.rightPane.projectInfo.currentStageId}`,
      `stage-status: ${view.rightPane.projectInfo.currentStageStatus}`,
      `role: ${view.rightPane.projectInfo.activeRoleId}`,
      `target: ${view.rightPane.projectInfo.activeOutputTarget}`,
      `boundary: ${view.rightPane.projectInfo.executionBoundary}`,
      "",
      "Plan",
    ];

    if (view.rightPane.plan.steps.length === 0) {
      lines.push("no plan yet");
    } else {
      for (const step of view.rightPane.plan.steps) {
        lines.push(...wrapTextWithAnsi(`[${step.status}] ${step.label}`, width));

        if (step.summary) {
          lines.push(...wrapTextWithAnsi(`  ${step.summary}`, width));
        }
      }
    }

    lines.push("", "Execution");
    lines.push(...wrapTextWithAnsi(`current: ${view.rightPane.execution.currentAction}`, width));
    lines.push(...wrapTextWithAnsi(`latest: ${view.rightPane.execution.latestAction}`, width));
    lines.push(`status: ${view.rightPane.execution.lastExecutionStatus}`);
    lines.push(`review: ${view.rightPane.execution.latestReviewStatus ?? "not-started"}`);

    if (view.rightPane.execution.latestReviewSummary) {
      lines.push(...wrapTextWithAnsi(`review-summary: ${view.rightPane.execution.latestReviewSummary}`, width));
    }

    lines.push(`findings: ${view.rightPane.execution.reviewFindingCount}`);
    lines.push(...wrapTextWithAnsi(`resolved: ${view.rightPane.execution.resolvedPath || "none"}`, width));

    if (view.rightPane.execution.touchedFiles.length > 0) {
      lines.push("files:");

      for (const file of view.rightPane.execution.touchedFiles) {
        lines.push(...wrapTextWithAnsi(`- ${file}`, width));
      }
    }

    if (view.rightPane.execution.blockingIssues.length > 0) {
      lines.push("blocking:");

      for (const issue of view.rightPane.execution.blockingIssues) {
        lines.push(...wrapTextWithAnsi(`- ${issue}`, width));
      }
    }

    return lines;
  }

  private slicePaneLines(pane: ScrollPane, lines: string[], visibleHeight: number): string[] {
    if (visibleHeight <= 0) {
      return [];
    }

    const maxOffset = Math.max(0, lines.length - visibleHeight);
    if (pane === "chat") {
      this.lastChatMaxOffset = maxOffset;

      if (this.autoFollowChat) {
        this.chatScrollOffset = maxOffset;
      }

      this.chatScrollOffset = Math.min(this.chatScrollOffset, maxOffset);
    }

    if (pane === "thinking") {
      this.thinkingScrollOffset = Math.min(this.thinkingScrollOffset, maxOffset);
    }

    if (pane === "info") {
      this.infoScrollOffset = Math.min(this.infoScrollOffset, maxOffset);
    }

    const offset =
      pane === "chat" ? this.chatScrollOffset : pane === "thinking" ? this.thinkingScrollOffset : this.infoScrollOffset;

    return lines.slice(offset, offset + visibleHeight);
  }

  private scrollActivePane(delta: number): void {
    this.scrollPane(this.activeScrollPane, delta, true);
  }

  private handleMouseInput(data: string): boolean {
    // biome-ignore lint/suspicious/noControlCharactersInRegex: 需要显式匹配 ANSI ESC 控制字符以解析鼠标转义序列
    const match = data.match(/^\u001b\[<(\d+);(\d+);(\d+)([Mm])$/);

    if (!match || !this.lastLayout) {
      return false;
    }

    const buttonCode = Number(match[1]);
    const column = Number(match[2]);
    const row = Number(match[3]);
    const kind = match[4];

    if (kind !== "M" || (buttonCode & 64) === 0) {
      return false;
    }

    const wheelCode = buttonCode & 0b11;

    if (wheelCode !== 0 && wheelCode !== 1) {
      return false;
    }

    const pane = this.resolvePaneAtPosition(column, row);

    if (!pane) {
      return false;
    }

    this.activeScrollPane = pane;
    this.scrollPane(pane, wheelCode === 0 ? -3 : 3, true);
    this.tui.requestRender(true);

    return true;
  }

  private resolvePaneAtPosition(column: number, row: number): ScrollPane | null {
    if (!this.lastLayout) {
      return null;
    }

    const bodyEndRow = this.lastLayout.bodyStartRow + this.lastLayout.bodyHeight - 1;

    if (row >= this.lastLayout.bodyStartRow && row <= bodyEndRow) {
      return column <= this.lastLayout.chatWidth ? "chat" : "info";
    }

    const thinkingEndRow = this.lastLayout.thinkingStartRow + this.lastLayout.thinkingHeight - 1;

    if (row >= this.lastLayout.thinkingStartRow && row <= thinkingEndRow) {
      return "thinking";
    }

    return null;
  }

  private scrollPane(pane: ScrollPane, delta: number, isUserDriven: boolean): void {
    if (pane === "chat") {
      this.chatScrollOffset = Math.max(0, this.chatScrollOffset + delta);

      if (isUserDriven && delta < 0) {
        this.autoFollowChat = false;
      }

      if (this.chatScrollOffset >= this.lastChatMaxOffset) {
        this.chatScrollOffset = this.lastChatMaxOffset;
        this.autoFollowChat = true;
      }

      return;
    }

    if (pane === "thinking") {
      this.thinkingScrollOffset = Math.max(0, this.thinkingScrollOffset + delta);
      return;
    }

    this.infoScrollOffset = Math.max(0, this.infoScrollOffset + delta);
  }

  private decoratePaneTitle(label: string, pane: ScrollPane, width: number): string {
    const suffix = this.activeScrollPane === pane ? " *" : "";

    return truncateToWidth(`${label}${suffix}`, width, "...", true);
  }

  private resolveBodyViewportHeight(input: { thinkingLines: string[]; composerLines: string[] }): number {
    const terminalRows = Math.max(12, this.tui.terminal.rows);
    const reservedRows = 2 + input.thinkingLines.length + 1 + input.composerLines.length;

    return Math.max(8, terminalRows - reservedRows);
  }

  private renderComposerLines(width: number): string[] {
    if (!this.inputLocked) {
      return this.editor.render(Math.max(20, width));
    }

    return this.renderLockedComposerLines(width);
  }

  private renderLockedComposerLines(width: number): string[] {
    const border = "".padEnd(Math.max(1, width), "─");
    const message = truncateToWidth(
      ` AI 处理中${this.resolveShimmerSuffix()}${this.renderCancelHint()}`,
      width,
      "...",
      true,
    );

    return [border, message.padEnd(width, " "), border];
  }

  private startShimmer(): void {
    if (this.shimmerTimer) {
      return;
    }

    this.shimmerFrame = 0;
    this.shimmerTimer = setInterval(() => {
      this.shimmerFrame = (this.shimmerFrame + 1) % 4;
      this.tui.requestRender(true);
    }, 320);
  }

  private stopShimmer(): void {
    if (!this.shimmerTimer) {
      this.shimmerFrame = 0;
      return;
    }

    clearInterval(this.shimmerTimer);
    this.shimmerTimer = undefined;
    this.shimmerFrame = 0;
  }

  private resolveShimmerSuffix(): string {
    return ".".repeat(this.shimmerFrame);
  }

  private renderCancelHint(): string {
    if (!this.inputLocked) {
      return "";
    }

    if (this.cancelHintRemainingEsc <= 0) {
      return " | 连按 3 次 ESC 可取消";
    }

    return ` | 再按 ${this.cancelHintRemainingEsc} 次 ESC 取消`;
  }

  private syncChatAutoFollow(state: WorkbenchState): void {
    const nextChatSignature = state.timeline.items
      .filter((item) => item.messageType === "user" || item.messageType?.startsWith("assistant"))
      .map((item) => `${item.createdAt}:${item.summary}:${item.isStreaming ? "1" : "0"}`)
      .join("\n");

    if (nextChatSignature === this.lastChatSignature) {
      return;
    }

    this.lastChatSignature = nextChatSignature;

    if (this.autoFollowChat) {
      this.chatScrollOffset = Number.MAX_SAFE_INTEGER;
    }
  }
}

const WORKBENCH_COMMANDS: SlashCommand[] = [
  { name: "session-new", description: "创建并切换到新会话，可选填写会话名" },
  { name: "session-list", description: "列出当前项目可恢复会话与最近目标摘要" },
  { name: "session-resume", description: "恢复指定 session id 或路径对应的会话" },
  { name: "session-fork", description: "从当前会话或指定会话创建分支会话" },
  { name: "docs-goal-new", description: "规划新的文档目标，准备输入或替换当前 goal" },
  { name: "docs-plan-run", description: "为当前文档目标生成 AI 执行方案，不直接写文件" },
  { name: "docs-plan-retry", description: "重新规划当前文档方案，覆盖已有计划草稿" },
  { name: "docs-exec-confirm", description: "确认方案并执行，按运行阶段写入 sandbox 或文档" },
  { name: "docs-exec-cancel", description: "取消待执行的文档方案，不回滚已写入文件" },
  { name: "docs-status-show", description: "查看当前文档工作流状态与执行边界" },
  { name: "docs-review-latest", description: "查看最近一次文档审查结论与摘要" },
  { name: "workbench-help-show", description: "查看工作台命令与用途说明" },
  { name: "workbench-thinking-toggle", description: "折叠或展开 Thinking 区，不影响执行结果" },
  { name: "workbench-pane-chat-focus", description: "将滚动焦点切到聊天区，便于查看对话流" },
  { name: "workbench-pane-thinking-focus", description: "将滚动焦点切到 Thinking 区，便于查看思考流" },
  { name: "workbench-pane-info-focus", description: "将滚动焦点切到右侧信息区，便于查看计划与执行信息" },
];

const EDITOR_THEME = {
  borderColor: (text: string): string => text,
  selectList: {
    selectedPrefix: (text: string): string => text,
    selectedText: (text: string): string => text,
    description: (text: string): string => text,
    scrollInfo: (text: string): string => text,
    noMatch: (text: string): string => text,
  },
};

function toMessagePrefix(type: string): string {
  if (type.startsWith("user")) {
    return "U";
  }

  if (type.startsWith("assistant")) {
    return "A";
  }

  if (type.startsWith("result")) {
    return "R";
  }

  return "S";
}
