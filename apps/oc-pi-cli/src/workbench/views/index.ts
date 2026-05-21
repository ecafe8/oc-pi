import {
  CombinedAutocompleteProvider,
  type Component,
  Editor,
  type Focusable,
  Key,
  Markdown,
  matchesKey,
  type SlashCommand,
  type TUI,
  truncateToWidth,
  visibleWidth,
  wrapTextWithAnsi,
} from "@earendil-works/pi-tui";
import type { RuntimeSessionListItem } from "@/runtime/session-store.js";
import { appendWorkbenchDebugLog, toHexSequence, toVisibleControlString } from "@/workbench/debug-log.js";
import { presentWorkbenchState } from "@/workbench/presenters/present-workbench-state.js";
import type { WorkbenchState } from "@/workbench/types.js";

const MIN_INFO_PANE_WIDTH = 28;
const INFO_PANE_RATIO = 0.34;
const LIVE_DRAFT_MAX_HEIGHT = 6;
const INPUT_BG = "\u001b[48;5;236m";
const INPUT_BG_ACTIVE = "\u001b[48;5;238m";
const INPUT_FG = "\u001b[38;5;255m";
const USER_CHAT_BG = "\u001b[48;5;238m";
const ASSISTANT_CHAT_BG = "\u001b[48;5;235m";
const SYSTEM_CHAT_BG = "\u001b[48;5;237m";
const RESULT_CHAT_BG = "\u001b[48;5;240m";
const USER_LABEL_FG = "\u001b[38;5;153m";
const PLANNER_LABEL_FG = "\u001b[38;5;81m";
const REVIEWER_LABEL_FG = "\u001b[38;5;221m";
const ASSISTANT_LABEL_FG = "\u001b[38;5;159m";
const SYSTEM_LABEL_FG = "\u001b[38;5;250m";
const RESULT_LABEL_FG = "\u001b[38;5;120m";
const INFO_CARD_BG = "\u001b[48;5;234m";
const INFO_CARD_SECTION_BG = "\u001b[48;5;236m";
const INFO_CARD_BORDER_FG = "\u001b[38;5;239m";
const INFO_CARD_TITLE_FG = "\u001b[38;5;188m";
const INFO_CARD_LABEL_FG = "\u001b[38;5;145m";
const INFO_CARD_VALUE_FG = "\u001b[38;5;255m";
const INFO_CARD_MUTED_FG = "\u001b[38;5;248m";
const INFO_STATUS_PENDING_FG = "\u001b[38;5;221m";
const INFO_STATUS_DONE_FG = "\u001b[38;5;120m";
const INFO_STATUS_ACTIVE_FG = "\u001b[38;5;81m";
const USER_ACCENT = "\u001b[38;5;153m";
const PLANNER_ACCENT = "\u001b[38;5;81m";
const REVIEWER_ACCENT = "\u001b[38;5;221m";
const ASSISTANT_ACCENT = "\u001b[38;5;159m";
const SYSTEM_ACCENT = "\u001b[38;5;245m";
const RESULT_ACCENT = "\u001b[38;5;120m";
const MARKDOWN_BOLD_FG = "\u001b[38;5;230m";
const MARKDOWN_CODE_FG = "\u001b[38;5;186m";
const MARKDOWN_QUOTE_FG = "\u001b[38;5;180m";
const MARKDOWN_QUOTE_PREFIX_FG = "\u001b[38;5;144m";
const ANSI_RESET = "\u001b[0m";
type ScrollPane = "chat" | "thinking" | "draft" | "info";

interface RenderLayoutMetrics {
  bodyStartRow: number;
  bodyHeight: number;
  chatWidth: number;
  thinkingStartRow: number;
  thinkingHeight: number;
  suggestionStartRow?: number;
  suggestionHeight?: number;
}

type InfoCardTone = "value" | "muted" | "status" | "active" | "done";

interface InfoCardItem {
  label: string;
  value: string;
  tone: InfoCardTone;
}

export interface WorkbenchRootViewOptions {
  tui: TUI;
  workspacePath: string;
  state: WorkbenchState;
  getSessionSuggestions: (query: string) => Promise<RuntimeSessionListItem[]>;
  onSubmit: (value: string) => void;
}

export interface WorkbenchViewCommandResult {
  handled: boolean;
  message?: string;
}

export class WorkbenchRootView implements Component, Focusable {
  private readonly editor: Editor;
  private readonly assistantMarkdown = new Markdown("", 0, 0, WORKBENCH_MARKDOWN_THEME, {
    color: (text: string): string => text,
  });
  private readonly getSessionSuggestions: (query: string) => Promise<RuntimeSessionListItem[]>;
  private readonly onSubmit: (value: string) => void;
  private readonly tui: TUI;
  private state: WorkbenchState;
  private chatScrollOffset = 0;
  private thinkingScrollOffset = 0;
  private draftScrollOffset = 0;
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
  private lastEditorValue = "";
  private inlineSessionSuggestions: RuntimeSessionListItem[] = [];
  private sessionSuggestionRequestId = 0;
  private selectedSessionSuggestionIndex = 0;

  public constructor(options: WorkbenchRootViewOptions) {
    this.tui = options.tui;
    this.state = options.state;
    this.getSessionSuggestions = options.getSessionSuggestions;
    this.onSubmit = options.onSubmit;
    this.editor = new Editor(options.tui, EDITOR_THEME, {
      paddingX: 0,
      autocompleteMaxVisible: 6,
    });
    this.editor.setAutocompleteProvider(
      new CombinedAutocompleteProvider(createWorkbenchCommands(options.getSessionSuggestions), options.workspacePath),
    );
    this.editor.onChange = (value) => {
      this.lastEditorValue = value;
      void this.refreshInlineSessionSuggestions(value);
    };
    this.editor.onSubmit = (value) => {
      this.onSubmit(value);
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
    try {
      void appendWorkbenchDebugLog({
        scope: 'view.handleInput',
        message: 'received input',
        data: {
          visible: toVisibleControlString(data),
          hex: toHexSequence(data),
          lastEditorValue: this.lastEditorValue,
          inlineSuggestionCount: this.inlineSessionSuggestions.length,
          inputLocked: this.inputLocked,
        },
      });

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

      if (matchesKey(data, Key.ctrl("4"))) {
        this.activeScrollPane = "draft";
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

      if (this.inlineSessionSuggestions.length > 0) {
        if (matchesKey(data, "up")) {
          this.selectedSessionSuggestionIndex = Math.max(0, this.selectedSessionSuggestionIndex - 1);
          this.invalidate();
          this.tui.requestRender(true);
          return;
        }

        if (matchesKey(data, "down")) {
          this.selectedSessionSuggestionIndex = Math.min(
            this.inlineSessionSuggestions.length - 1,
            this.selectedSessionSuggestionIndex + 1,
          );
          this.invalidate();
          this.tui.requestRender(true);
          return;
        }

        if (matchesKey(data, "tab")) {
          this.applySelectedSessionSuggestion(false);
          return;
        }

        if (matchesKey(data, "enter")) {
          this.applySelectedSessionSuggestion(true);
          return;
        }
      }

      if (this.inputLocked) {
        return;
      }

      const previousValue = this.lastEditorValue;

      this.editor.handleInput(data);

      if (matchesKey(data, "tab") && previousValue !== this.lastEditorValue) {
        void this.refreshInlineSessionSuggestions(this.lastEditorValue);
      }
    } catch {
      void appendWorkbenchDebugLog({
        scope: 'view.handleInput',
        message: 'input handling error',
        data: {
          visible: toVisibleControlString(data),
          hex: toHexSequence(data),
          lastEditorValue: this.lastEditorValue,
          inlineSuggestionCount: this.inlineSessionSuggestions.length,
        },
      });

      // Ignore malformed input/control sequences (for example IME switching) to keep the TUI alive.
      this.invalidate();
      this.tui.requestRender(true);
    }
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

    if (view.chatPane.messages.length === 0) {
      return this.renderEmptyLandingView(safeWidth, view);
    }

    const infoWidth = Math.max(MIN_INFO_PANE_WIDTH, Math.floor(safeWidth * INFO_PANE_RATIO));
    const dividerWidth = 2;
    const chatWidth = Math.max(20, safeWidth - infoWidth - dividerWidth);
    const thinkingLines = this.renderThinkingLines(safeWidth);
    const composerLabel = truncateToWidth(
      this.inputLocked
        ? `> composer: AI 处理中 | 输入已暂停${this.renderCancelHint()} | active: ${this.activeScrollPane}`
        : `> composer: 自然语言默认聊天 | 输入 / 查看命令补全 | ctrl+1 chat | ctrl+2 thinking | ctrl+3 info | ctrl+4 draft | active: ${this.activeScrollPane}`,
      safeWidth,
      "...",
      true,
    );
    const liveDraftLines = this.renderLiveDraftLines(safeWidth, view);
    const composerLines = this.renderComposerLines(safeWidth);
    const bodyViewportHeight = this.resolveBodyViewportHeight({
      thinkingLines,
      liveDraftLines,
      composerLines,
    });

    const topBarLine = truncateToWidth(
      `session: ${view.topBar.sessionName ?? view.topBar.sessionId ?? "none"} | model: ${view.topBar.modelId} | ctx: ${view.topBar.contextSummary} | version: ${view.topBar.appVersion} | mode: ${view.topBar.mode} | status: ${view.topBar.runtimeStatus}`,
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
      const left = visibleChatLines[index] ?? "";
      const right = visibleInfoLines[index] ?? "";

      bodyLines.push(
        fitRenderedLineSilently(
          `${padRenderedLine(left, chatWidth)}${" ".repeat(dividerWidth)}${padRenderedLine(right, infoWidth)}`,
          safeWidth,
        ),
      );
    }

    return [
      topBarLine,
      "",
      ...bodyLines,
      "",
      ...thinkingLines,
      ...liveDraftLines,
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

    return visibleThinkingLines;
  }

  private renderChatLines(width: number, view: ReturnType<typeof presentWorkbenchState>): string[] {
    const lines = [this.decoratePaneTitle("Chat", "chat", width)];
    const contentWidth = Math.max(1, width - 2);

    if (view.chatPane.messages.length === 0) {
      lines.push(...wrapTextWithAnsi("A: 请输入自然语言开始聊天；输入 / 可查看命令补全。", width));
      return lines;
    }

    for (const message of view.chatPane.messages) {
      const label = formatMessageLabel(message.type, message.actorLabel);
      const background = resolveChatMessageBackground(message.type);
      const accent = resolveChatMessageAccent(message.type, message.actorLabel);

      if (message.type.startsWith("assistant")) {
        this.assistantMarkdown.setText(message.summary);
        const markdownLines = this.assistantMarkdown.render(contentWidth);

        lines.push(
          ...markdownLines.flatMap((line, index) => {
            const content = index === 0 ? `${label}: ${line}` : `  ${line}`;

            return wrapTextWithAnsi(content, contentWidth).map((wrappedLine) =>
              applyBlockBackground(wrappedLine, width, background, accent),
            );
          }),
        );

        continue;
      }

      const content = `${label}: ${applyInlineMarkdownHighlights(message.summary)}`;

      lines.push(
        ...wrapTextWithAnsi(content, contentWidth).map((line) =>
          applyBlockBackground(line, width, background, accent),
        ),
      );
    }

    return lines;
  }

  private renderLiveDraftLines(width: number, view: ReturnType<typeof presentWorkbenchState>): string[] {
    if (!view.rightPane.execution.liveDraftText?.trim()) {
      return [];
    }

    const title = view.rightPane.execution.liveDraftTitle ?? "Live Draft";
    const allLines = [
      this.decoratePaneTitle(`${title} | live draft`, "draft", width),
      ...wrapTextWithAnsi(view.rightPane.execution.liveDraftText, width),
    ];
    const visibleLines = this.slicePaneLines("draft", allLines, LIVE_DRAFT_MAX_HEIGHT);

    return visibleLines;
  }

  private renderInfoLines(width: number, view: ReturnType<typeof presentWorkbenchState>): string[] {
    const lines = [this.decoratePaneTitle("Info", "info", width), ""];
    const projectItems: InfoCardItem[] = [
      {
        label: "session",
        value: view.rightPane.projectInfo.sessionName ?? view.rightPane.projectInfo.sessionId ?? "none",
        tone: "value",
      },
      { label: "workspace", value: view.rightPane.projectInfo.workspacePath, tone: "muted" },
      { label: "goal", value: view.rightPane.projectInfo.goalSummary ?? "none", tone: "value" },
      { label: "stage", value: view.rightPane.projectInfo.currentStageId, tone: "active" },
      { label: "stage-status", value: view.rightPane.projectInfo.currentStageStatus, tone: "status" },
      { label: "role", value: view.rightPane.projectInfo.activeRoleId, tone: "muted" },
      { label: "target", value: view.rightPane.projectInfo.activeOutputTarget, tone: "muted" },
      { label: "boundary", value: view.rightPane.projectInfo.executionBoundary, tone: "muted" },
    ];

    const planItems: InfoCardItem[] =
      view.rightPane.plan.steps.length === 0
        ? [{ label: "status", value: "no plan yet", tone: "muted" }]
        : view.rightPane.plan.steps.flatMap((step, index) => {
            const stepItems: InfoCardItem[] = [
              {
                label: `step ${index + 1}`,
                value: step.label,
                tone: step.status === "completed" ? "done" : step.status === "in_progress" ? "active" : "value",
              },
              { label: "state", value: step.status, tone: "status" },
            ];

            if (step.summary) {
              stepItems.push({ label: "note", value: step.summary, tone: "muted" });
            }

            return stepItems;
          });

    const executionItems: InfoCardItem[] = [
      { label: "current", value: view.rightPane.execution.currentAction, tone: "value" },
      { label: "latest", value: view.rightPane.execution.latestAction, tone: "muted" },
      { label: "status", value: view.rightPane.execution.lastExecutionStatus, tone: "status" },
      { label: "review", value: view.rightPane.execution.latestReviewStatus ?? "not-started", tone: "status" },
      { label: "findings", value: String(view.rightPane.execution.reviewFindingCount), tone: "value" },
      { label: "resolved", value: view.rightPane.execution.resolvedPath || "none", tone: "muted" },
    ];

    if (view.rightPane.execution.latestReviewSummary) {
      executionItems.push({ label: "review-summary", value: view.rightPane.execution.latestReviewSummary, tone: "muted" });
    }

    for (const file of view.rightPane.execution.touchedFiles) {
      executionItems.push({ label: "file", value: file, tone: "muted" });
    }

    for (const issue of view.rightPane.execution.blockingIssues) {
      executionItems.push({ label: "blocking", value: issue, tone: "status" });
    }

    lines.push(...renderInfoCard(width, "Project", projectItems), "");
    lines.push(...renderInfoCard(width, "Plan", planItems), "");
    lines.push(...renderInfoCard(width, "Execution", executionItems));

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

    if (pane === "draft") {
      this.draftScrollOffset = Math.min(this.draftScrollOffset, maxOffset);
    }

    if (pane === "info") {
      this.infoScrollOffset = Math.min(this.infoScrollOffset, maxOffset);
    }

    const offset =
      pane === "chat"
        ? this.chatScrollOffset
        : pane === "thinking"
          ? this.thinkingScrollOffset
          : pane === "draft"
            ? this.draftScrollOffset
            : this.infoScrollOffset;

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

    if (pane === "draft") {
      this.draftScrollOffset = Math.max(0, this.draftScrollOffset + delta);
      return;
    }

    this.infoScrollOffset = Math.max(0, this.infoScrollOffset + delta);
  }

  private decoratePaneTitle(label: string, pane: ScrollPane, width: number): string {
    const suffix = this.activeScrollPane === pane ? " active" : "";
    const title = truncateToWidth(`${label}${suffix}`, width, "...", true);

    return fitRenderedLine(`${resolvePaneTitleForeground(pane)}${title}${ANSI_RESET}`, width);
  }

  private resolveBodyViewportHeight(input: {
    thinkingLines: string[];
    liveDraftLines: string[];
    composerLines: string[];
  }): number {
    const terminalRows = Math.max(12, this.tui.terminal.rows);
    const reservedRows = 2 + input.thinkingLines.length + input.liveDraftLines.length + 1 + input.composerLines.length;

    return Math.max(8, terminalRows - reservedRows);
  }

  private renderComposerLines(width: number): string[] {
    if (!this.inputLocked) {
      const editorLines = this.decorateComposerBox(this.editor.render(Math.max(20, width)), width, false);
      const suggestionLines = this.renderInlineSessionSuggestionLines(width);

      return [...editorLines, ...suggestionLines];
    }

    return this.decorateComposerBox(this.renderLockedComposerLines(width), width, true);
  }

  private renderLockedComposerLines(width: number): string[] {
    const message = truncateToWidth(` AI 处理中${this.resolveShimmerSuffix()}`, width, "...", true);

    return [message.padEnd(width, " ")];
  }

  private decorateComposerBox(lines: string[], width: number, locked: boolean): string[] {
    const background = locked ? INPUT_BG_ACTIVE : INPUT_BG;
    const normalizedLines = lines.length > 0 ? lines : [""];

    return normalizedLines.map((line) => {
      const content = truncateToWidth(line, width, "...", true).padEnd(width, " ");
      return fitRenderedLine(`${background}${INPUT_FG}${content}${ANSI_RESET}`, width);
    });
  }

  private renderEmptyLandingView(width: number, view: ReturnType<typeof presentWorkbenchState>): string[] {
    const promptWidth = Math.max(32, Math.min(width - 8, Math.floor(width * 0.7)));
    const sidePadding = " ".repeat(Math.max(0, Math.floor((width - promptWidth) / 2)));
    const title = truncateToWidth("Start A New Session", promptWidth, "...", true);
    const subtitleLines = wrapTextWithAnsi(
      "描述你想规划的应用、目标用户和核心场景。首次发送后会自动创建新 session；也可以用 /session-resume 恢复已有会话。",
      promptWidth,
    );
    const composerLabel = truncateToWidth(
      this.inputLocked
        ? "> AI 处理中 | 输入已暂停"
        : "> 新对话输入区 | 输入后自动创建 session | /session-resume 恢复历史会话",
      promptWidth,
      "...",
      true,
    );
    const composerLines = this.renderComposerLines(promptWidth);
    const blankRows = Math.max(2, Math.floor((this.tui.terminal.rows - subtitleLines.length - composerLines.length - 6) / 2));

    return [
      ...Array.from({ length: blankRows }, () => ""),
      `${sidePadding}${title}`,
      "",
      ...subtitleLines.map((line) => `${sidePadding}${line}`),
      "",
      `${sidePadding}${composerLabel}`,
      ...composerLines.map((line) => `${sidePadding}${line}`),
      "",
      `${sidePadding}${truncateToWidth(`model: ${view.topBar.modelId} | status: ${view.topBar.runtimeStatus}`, promptWidth, "...", true)}`,
    ];
  }

  private renderInlineSessionSuggestionLines(width: number): string[] {
    if (this.inlineSessionSuggestions.length === 0) {
      return [];
    }

    const lines = [
      fitRenderedLine(
        `${SYSTEM_LABEL_FG}${truncateToWidth("resume candidates  ↑↓ select  tab/enter apply", width, "...", true)}${ANSI_RESET}`,
        width,
      ),
    ];

    for (const [index, session] of this.inlineSessionSuggestions.slice(0, 6).entries()) {
      const label = normalizeSingleLineText(
        session.sessionName
          ? `${session.sessionName} (${session.sessionId.slice(0, 8)})`
          : session.sessionId,
      );
      const detailText = resolveSessionSuggestionDetail(session);
      const detail = detailText ? ` - ${detailText}` : "";
      const prefix = index === this.selectedSessionSuggestionIndex ? ">" : " ";
      const lineText = truncateToWidth(`${prefix} ${label}${detail}`, width, "...", true);
      const lineColor = index === this.selectedSessionSuggestionIndex ? PLANNER_ACCENT : SYSTEM_ACCENT;

      lines.push(
        fitRenderedLine(`${lineColor}${lineText}${ANSI_RESET}`, width),
      );
    }

    return lines;
  }

  private async refreshInlineSessionSuggestions(value: string): Promise<void> {
    const query = parseSessionSuggestionQuery(value);

    if (query === null) {
      this.sessionSuggestionRequestId += 1;

      if (this.inlineSessionSuggestions.length > 0) {
        this.inlineSessionSuggestions = [];
        this.selectedSessionSuggestionIndex = 0;
        this.invalidate();
        this.tui.requestRender(true);
      }

      return;
    }

    const requestId = ++this.sessionSuggestionRequestId;
    const suggestions = await this.getSessionSuggestions(query);

    if (requestId !== this.sessionSuggestionRequestId) {
      return;
    }

    this.inlineSessionSuggestions = suggestions;
    this.selectedSessionSuggestionIndex = suggestions.length === 0
      ? 0
      : Math.min(this.selectedSessionSuggestionIndex, suggestions.length - 1);
    this.invalidate();
    this.tui.requestRender(true);
  }

  private applySelectedSessionSuggestion(shouldSubmit: boolean): void {
    const selected = this.inlineSessionSuggestions[this.selectedSessionSuggestionIndex];

    if (!selected) {
      return;
    }

    if (this.lastEditorValue.startsWith("/session-resume")) {
      this.lastEditorValue = `/session-resume ${selected.sessionId}`;
      this.editor.setText(this.lastEditorValue);
    } else if (this.lastEditorValue.startsWith("/session-fork")) {
      this.lastEditorValue = `/session-fork ${selected.sessionId}`;
      this.editor.setText(this.lastEditorValue);
    }

    this.inlineSessionSuggestions = [];
    this.selectedSessionSuggestionIndex = 0;
    this.sessionSuggestionRequestId += 1;
    this.invalidate();
    this.tui.requestRender(true);

    if (shouldSubmit) {
      const submitValue = this.lastEditorValue;
      this.onSubmit(submitValue);
      this.editor.setText("");
      this.lastEditorValue = "";
    }
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

function createWorkbenchCommands(
  getSessionSuggestions: (query: string) => Promise<RuntimeSessionListItem[]>,
): SlashCommand[] {
  return [
    {
      name: "session-new",
      argumentHint: "<session-name>",
      description: "创建并切换到新会话，可直接补充自然语言会话名",
    },
    { name: "session-list", description: "列出当前项目可恢复会话与最近目标摘要" },
    {
      name: "session-resume",
      argumentHint: "<session-id-or-path>",
      description: "恢复指定 session id 或路径对应的会话，支持补全最近会话",
    },
    {
      name: "session-fork",
      argumentHint: "[session-id-or-path]",
      description: "从当前会话或指定会话创建分支会话，支持补全最近会话",
    },
    {
      name: "docs-goal-new",
      argumentHint: "<goal-description>",
      description: "兼容命令：设置新的文档目标；推荐直接用自然语言聊天规划",
    },
    {
      name: "docs-plan-run",
      argumentHint: "[extra-intent]",
      description: "兼容命令：为当前目标生成方案；推荐直接用自然语言聊天规划",
    },
    {
      name: "docs-plan-retry",
      argumentHint: "[retry-intent]",
      description: "兼容命令：重新规划当前方案；推荐直接用自然语言要求重规划",
    },
    { name: "docs-exec-confirm", description: "确认当前聊天中已生成的方案并执行，按运行阶段写入 sandbox 或文档" },
    { name: "docs-exec-cancel", description: "取消待执行的文档方案，不回滚已写入文件" },
    { name: "docs-status-show", description: "查看当前文档工作流状态与执行边界" },
    { name: "docs-review-latest", description: "查看最近一次文档审查结论与摘要" },
    { name: "workbench-help-show", description: "查看工作台命令与用途说明" },
    { name: "workbench-thinking-toggle", description: "折叠或展开 Thinking 区，不影响执行结果" },
    { name: "workbench-pane-chat-focus", description: "将滚动焦点切到聊天区，便于查看对话流" },
    { name: "workbench-pane-thinking-focus", description: "将滚动焦点切到 Thinking 区，便于查看思考流" },
    { name: "workbench-pane-info-focus", description: "将滚动焦点切到右侧信息区，便于查看计划与执行信息" },
  ];
}

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

function toMessagePrefix(type: string, actorLabel?: string): string {
  if (type.startsWith("user")) {
    return "U";
  }

  if (type.startsWith("assistant")) {
    return actorLabel ? `A/${actorLabel}` : "A";
  }

  if (type.startsWith("result")) {
    return "R";
  }

  return "S";
}

function formatMessageLabel(type: string, actorLabel?: string): string {
  const prefix = toMessagePrefix(type, actorLabel);
  const foreground = resolveMessageLabelForeground(type, actorLabel);

  return `${foreground}${prefix}${ANSI_RESET}`;
}

function resolveMessageLabelForeground(type: string, actorLabel?: string): string {
  if (type.startsWith("user")) {
    return USER_LABEL_FG;
  }

  if (type.startsWith("assistant")) {
    if (actorLabel === "Planner") {
      return PLANNER_LABEL_FG;
    }

    if (actorLabel === "Reviewer") {
      return REVIEWER_LABEL_FG;
    }

    return ASSISTANT_LABEL_FG;
  }

  if (type.startsWith("result")) {
    return RESULT_LABEL_FG;
  }

  return SYSTEM_LABEL_FG;
}

function resolveChatMessageBackground(type: string): string {
  if (type.startsWith("user")) {
    return USER_CHAT_BG;
  }

  if (type.startsWith("assistant")) {
    return ASSISTANT_CHAT_BG;
  }

  if (type.startsWith("result")) {
    return RESULT_CHAT_BG;
  }

  return SYSTEM_CHAT_BG;
}

function resolveChatMessageAccent(type: string, actorLabel?: string): string {
  if (type.startsWith("user")) {
    return USER_ACCENT;
  }

  if (type.startsWith("assistant")) {
    if (actorLabel === "Planner") {
      return PLANNER_ACCENT;
    }

    if (actorLabel === "Reviewer") {
      return REVIEWER_ACCENT;
    }

    return ASSISTANT_ACCENT;
  }

  if (type.startsWith("result")) {
    return RESULT_ACCENT;
  }

  return SYSTEM_ACCENT;
}

function applyBlockBackground(text: string, width: number, background: string, accent: string): string {
  const safeWidth = Math.max(3, width);
  const contentWidth = Math.max(1, safeWidth - 2);
  const padded = truncateToWidth(text, contentWidth, "", true).padEnd(contentWidth, " ");
  const accentBar = `${accent}▌${ANSI_RESET}`;

  return fitRenderedLine(withPersistentBackground(`${accentBar}${padded} `, background), safeWidth);
}

function parseSessionSuggestionQuery(value: string): string | null {
  if (value === "/session-resume" || value === "/session-fork") {
    return "";
  }

  if (value.startsWith("/session-resume ")) {
    return value.slice("/session-resume ".length);
  }

  if (value.startsWith("/session-fork ")) {
    return value.slice("/session-fork ".length);
  }

  return null;
}

function normalizeSingleLineText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function fitRenderedLine(line: string, width: number): string {
  if (visibleWidth(line) <= width) {
    return line;
  }

  return truncateToWidth(line, width, "", true);
}

function fitRenderedLineSilently(line: string, width: number): string {
  if (visibleWidth(line) <= width) {
    return line;
  }

  return truncateToWidth(line, width, "", true);
}

function withPersistentBackground(text: string, background: string): string {
  return `${background}${text.replaceAll(ANSI_RESET, `${ANSI_RESET}${background}`)}${ANSI_RESET}`;
}

function padRenderedLine(line: string, width: number): string {
  const fitted = fitRenderedLineSilently(line, width);
  const paddingWidth = Math.max(0, width - visibleWidth(fitted));

  return `${fitted}${" ".repeat(paddingWidth)}`;
}

function renderInfoCard(width: number, title: string, items: InfoCardItem[]): string[] {
  const safeWidth = Math.max(12, width);
  const contentWidth = Math.max(1, safeWidth - 2);
  const lines: string[] = [];
  const titleText = truncateToWidth(title, contentWidth, "...", true);

  lines.push(
    fitRenderedLine(withPersistentBackground(
      `${INFO_CARD_BORDER_FG} ${INFO_CARD_TITLE_FG}${padRenderedLine(titleText, contentWidth)}`,
      INFO_CARD_SECTION_BG,
    ), safeWidth),
  );

  for (const item of items) {
    const plainPrefix = `${item.label}: `;
    const prefix = `${INFO_CARD_LABEL_FG}${item.label}${ANSI_RESET}${INFO_CARD_MUTED_FG}: ${ANSI_RESET}`;
    const valueColor = resolveInfoCardTone(item.tone);
    const continuationPrefix = " ".repeat(Math.min(contentWidth, visibleWidth(plainPrefix)));
    const wrappedLines = wrapTextWithAnsi(item.value, Math.max(1, contentWidth - visibleWidth(plainPrefix)));

    if (wrappedLines.length === 0) {
      lines.push(renderInfoCardBodyLine(prefix, `${valueColor}-${ANSI_RESET}`, safeWidth));
      continue;
    }

    lines.push(renderInfoCardBodyLine(prefix, `${valueColor}${wrappedLines[0]}${ANSI_RESET}`, safeWidth));

    for (const continuedLine of wrappedLines.slice(1)) {
      lines.push(renderInfoCardBodyLine(continuationPrefix, `${valueColor}${continuedLine}${ANSI_RESET}`, safeWidth));
    }
  }

  return lines;
}

function renderInfoCardBodyLine(prefix: string, value: string, width: number): string {
  const safeWidth = Math.max(12, width);
  const contentWidth = Math.max(1, safeWidth - 2);
  const line = padRenderedLine(`${prefix}${value}`, contentWidth);

  return fitRenderedLine(withPersistentBackground(`${INFO_CARD_BORDER_FG} ${line}`, INFO_CARD_BG), safeWidth);
}

function resolveInfoCardTone(tone: InfoCardTone): string {
  if (tone === "muted") {
    return INFO_CARD_MUTED_FG;
  }

  if (tone === "active") {
    return INFO_STATUS_ACTIVE_FG;
  }

  if (tone === "done") {
    return INFO_STATUS_DONE_FG;
  }

  if (tone === "status") {
    return INFO_STATUS_PENDING_FG;
  }

  return INFO_CARD_VALUE_FG;
}

function resolvePaneTitleForeground(pane: ScrollPane): string {
  if (pane === "chat") {
    return ASSISTANT_LABEL_FG;
  }

  if (pane === "thinking") {
    return REVIEWER_LABEL_FG;
  }

  if (pane === "draft") {
    return RESULT_LABEL_FG;
  }

  return SYSTEM_LABEL_FG;
}

function resolveSessionSuggestionDetail(session: RuntimeSessionListItem): string {
  if (!session.goalSummary) {
    return "";
  }

  const normalizedGoal = normalizeSingleLineText(session.goalSummary);
  const normalizedSessionName = session.sessionName
    ? normalizeSingleLineText(session.sessionName)
    : "";

  if (!normalizedGoal) {
    return "";
  }

  if (!normalizedSessionName) {
    return normalizedGoal;
  }

  if (
    normalizedGoal === normalizedSessionName
    || normalizedGoal.startsWith(normalizedSessionName)
    || normalizedSessionName.startsWith(normalizedGoal)
  ) {
    return "";
  }

  return normalizedGoal;
}

function applyInlineMarkdownHighlights(text: string): string {
  return text
    .replace(/^>\s?(.*)$/gm, (_match, content: string) => {
      return `${MARKDOWN_QUOTE_PREFIX_FG}> ${MARKDOWN_QUOTE_FG}${content}${ANSI_RESET}`;
    })
    .replace(/\*\*(.+?)\*\*/g, (_match, content: string) => {
      return `${MARKDOWN_BOLD_FG}${content}${ANSI_RESET}`;
    })
    .replace(/`([^`]+)`/g, (_match, content: string) => {
      return `${MARKDOWN_CODE_FG}${content}${ANSI_RESET}`;
    });
}

const WORKBENCH_MARKDOWN_THEME = {
  heading: (text: string): string => `${MARKDOWN_BOLD_FG}${text}${ANSI_RESET}`,
  link: (text: string): string => `${PLANNER_LABEL_FG}${text}${ANSI_RESET}`,
  linkUrl: (text: string): string => `${SYSTEM_LABEL_FG}${text}${ANSI_RESET}`,
  code: (text: string): string => `${MARKDOWN_CODE_FG}${text}${ANSI_RESET}`,
  codeBlock: (text: string): string => `${MARKDOWN_CODE_FG}${text}${ANSI_RESET}`,
  codeBlockBorder: (text: string): string => `${SYSTEM_LABEL_FG}${text}${ANSI_RESET}`,
  quote: (text: string): string => `${MARKDOWN_QUOTE_FG}${text}${ANSI_RESET}`,
  quoteBorder: (text: string): string => `${MARKDOWN_QUOTE_PREFIX_FG}${text}${ANSI_RESET}`,
  hr: (text: string): string => `${SYSTEM_LABEL_FG}${text}${ANSI_RESET}`,
  listBullet: (text: string): string => `${PLANNER_LABEL_FG}${text}${ANSI_RESET}`,
  bold: (text: string): string => `${MARKDOWN_BOLD_FG}${text}${ANSI_RESET}`,
  italic: (text: string): string => `${REVIEWER_LABEL_FG}${text}${ANSI_RESET}`,
  strikethrough: (text: string): string => `${SYSTEM_LABEL_FG}${text}${ANSI_RESET}`,
  underline: (text: string): string => `${ASSISTANT_LABEL_FG}${text}${ANSI_RESET}`,
};
