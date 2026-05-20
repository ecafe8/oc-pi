import { copyFile, mkdir, readFile, unlink } from 'node:fs/promises'
import { dirname } from 'node:path'

import {
  SessionManager,
  type SessionInfo,
  type SessionManager as PiSessionManager,
} from '@earendil-works/pi-coding-agent'

import { createDefaultWorkbenchState } from '@/runtime/default-config.js'
import { CurrentSessionPointerStore } from '@/runtime/current-session-pointer.js'
import {
  type RuntimeSessionListItem,
  type RuntimeSessionPointer,
  type RuntimeSessionRecord,
  type WorkbenchSessionEntryData,
  WORKBENCH_SESSION_ENTRY_TYPE,
  WORKBENCH_SESSION_ENTRY_VERSION,
} from '@/runtime/pi-session-types.js'
import {
  assertWithinCliRoot,
  resolveCliInternalPath,
} from '@/runtime/paths.js'
import type { WorkbenchState } from '@/workbench/types.js'

export class PiSessionBackedRuntimeStore {
  private readonly pointerStore = new CurrentSessionPointerStore()

  public constructor(private readonly workspaceRoot: string) {}

  public async read(): Promise<RuntimeSessionRecord | null> {
    const sessionManager = await this.getOrCreateCurrentSessionManager()

    return this.readRecordFromSession(sessionManager)
  }

  public async write(record: RuntimeSessionRecord): Promise<void> {
    const sessionManager = await this.getOrCreateCurrentSessionManager()
    await this.persistRecord(sessionManager, record)
    await this.writePointer(sessionManager)
  }

  public async createSession(sessionName?: string): Promise<RuntimeSessionRecord> {
    const sessionManager = SessionManager.create(this.workspaceRoot, this.sessionDir)

    if (sessionName?.trim()) {
      sessionManager.appendSessionInfo(sessionName.trim())
    }

    const record = this.createDefaultRecord(sessionManager)
    await this.persistRecord(sessionManager, record)
    await this.writePointer(sessionManager)

    return record
  }

  public async listSessions(): Promise<RuntimeSessionListItem[]> {
    const currentPointer = await this.pointerStore.read()
    const sessions = await SessionManager.list(this.workspaceRoot, this.sessionDir)

    return sessions.map((session) => this.toSessionListItem(session, currentPointer))
  }

  public async resumeSession(sessionIdOrPath: string): Promise<RuntimeSessionRecord> {
    const session = await this.resolveSession(sessionIdOrPath)
    const sessionManager = SessionManager.open(session.path, this.sessionDir, this.workspaceRoot)

    await this.writePointer(sessionManager)

    return this.readRecordFromSession(sessionManager)
  }

  public async forkSession(sessionIdOrPath?: string, sessionName?: string): Promise<RuntimeSessionRecord> {
    const sourcePath = sessionIdOrPath
      ? (await this.resolveSession(sessionIdOrPath)).path
      : (await this.getOrCreateCurrentSessionManager()).getSessionFile()

    if (!sourcePath) {
      return this.createSession(sessionName)
    }

    const sessionManager = SessionManager.forkFrom(sourcePath, this.workspaceRoot, this.sessionDir)

    if (sessionName?.trim()) {
      sessionManager.appendSessionInfo(sessionName.trim())
    }

    const record = this.readRecordFromSession(sessionManager)
    await this.persistRecord(sessionManager, record)
    await this.writePointer(sessionManager)

    return record
  }

  private async getOrCreateCurrentSessionManager(): Promise<PiSessionManager> {
    const pointer = await this.pointerStore.read()

    if (pointer?.sessionFile) {
      try {
        return SessionManager.open(pointer.sessionFile, this.sessionDir, this.workspaceRoot)
      } catch {
        // Fall through and recreate below.
      }
    }

    const migrated = await this.migrateLegacySessionIfNeeded()

    if (migrated) {
      return migrated
    }

    const sessionManager = SessionManager.create(this.workspaceRoot, this.sessionDir)
    const record = this.createDefaultRecord(sessionManager)

    await this.persistRecord(sessionManager, record)
    await this.writePointer(sessionManager)

    return sessionManager
  }

  private async migrateLegacySessionIfNeeded(): Promise<PiSessionManager | null> {
    try {
      const content = await readFile(this.legacySessionFilePath, 'utf8')
      const parsed = JSON.parse(content) as RuntimeSessionRecord
      const sessionManager = SessionManager.create(this.workspaceRoot, this.sessionDir)
      const record = this.normalizeRecord(parsed, sessionManager)

      sessionManager.appendSessionInfo('Migrated legacy session')
      await this.persistRecord(sessionManager, record)
      await this.writePointer(sessionManager)
      await mkdir(dirname(this.legacySessionBackupFilePath), { recursive: true })
      await copyFile(this.legacySessionFilePath, this.legacySessionBackupFilePath)
      await unlink(this.legacySessionFilePath)

      return sessionManager
    } catch (error) {
      if (isMissingFileError(error)) {
        return null
      }

      throw error
    }
  }

  private async persistRecord(
    sessionManager: PiSessionManager,
    record: RuntimeSessionRecord,
  ): Promise<void> {
    sessionManager.appendCustomEntry(WORKBENCH_SESSION_ENTRY_TYPE, {
      version: WORKBENCH_SESSION_ENTRY_VERSION,
      savedAt: new Date().toISOString(),
      ...this.normalizeRecord(record, sessionManager),
    } satisfies WorkbenchSessionEntryData)
    forcePersistSession(sessionManager)
  }

  private readRecordFromSession(sessionManager: PiSessionManager): RuntimeSessionRecord {
    const entries = [...sessionManager.getEntries()].reverse()
    const snapshotEntry = entries.find(
      (entry) => entry.type === 'custom' && entry.customType === WORKBENCH_SESSION_ENTRY_TYPE,
    )

    if (snapshotEntry?.type === 'custom' && isWorkbenchSessionEntryData(snapshotEntry.data)) {
      return this.normalizeRecord(snapshotEntry.data, sessionManager)
    }

    return this.createDefaultRecord(sessionManager)
  }

  private createDefaultRecord(sessionManager: PiSessionManager): RuntimeSessionRecord {
    return this.normalizeRecord(
      {
        workbenchState: createDefaultWorkbenchState(this.workspaceRoot),
      },
      sessionManager,
    )
  }

  private normalizeRecord(
    record: RuntimeSessionRecord,
    sessionManager: PiSessionManager,
  ): RuntimeSessionRecord {
    const fallback = createDefaultWorkbenchState(this.workspaceRoot)
    const state = record.workbenchState ?? fallback

    return {
      latestRun: record.latestRun,
      workbenchState: hydrateWorkbenchState(
        {
          ...state,
          session: {
            ...state.session,
            workspacePath: this.workspaceRoot,
            sessionId: sessionManager.getSessionId(),
            sessionName: sessionManager.getSessionName(),
            sessionFile: sessionManager.getSessionFile(),
            parentSessionId: sessionManager.getHeader()?.parentSession,
          },
        },
        this.workspaceRoot,
      ),
    }
  }

  private toSessionListItem(
    session: SessionInfo,
    currentPointer: RuntimeSessionPointer | null,
  ): RuntimeSessionListItem {
    const goalSummary = this.readGoalSummary(session.path)

    return {
      sessionId: session.id,
      sessionName: session.name,
      sessionFile: session.path,
      parentSessionId: session.parentSessionPath,
      createdAt: session.created.toISOString(),
      updatedAt: session.modified.toISOString(),
      goalSummary,
      isCurrent: currentPointer?.sessionFile === session.path,
    }
  }

  private readGoalSummary(sessionFile: string): string | undefined {
    try {
      const sessionManager = SessionManager.open(sessionFile, this.sessionDir, this.workspaceRoot)
      const record = this.readRecordFromSession(sessionManager)

      return record.workbenchState.session.currentGoal
    } catch {
      return undefined
    }
  }

  private async resolveSession(sessionIdOrPath: string): Promise<SessionInfo> {
    const sessions = await SessionManager.list(this.workspaceRoot, this.sessionDir)
    const exactMatch = sessions.find(
      (session) => session.id === sessionIdOrPath || session.path === sessionIdOrPath,
    )

    if (exactMatch) {
      return exactMatch
    }

    const prefixMatches = sessions.filter((session) => session.id.startsWith(sessionIdOrPath))

    if (prefixMatches.length === 1) {
      const [match] = prefixMatches

      if (match) {
        return match
      }
    }

    throw new Error(`No session found matching: ${sessionIdOrPath}`)
  }

  private async writePointer(sessionManager: PiSessionManager): Promise<void> {
    const sessionFile = sessionManager.getSessionFile()

    if (!sessionFile) {
      return
    }

    await this.pointerStore.write({
      sessionFile,
      sessionId: sessionManager.getSessionId(),
    })
  }

  private get sessionDir(): string {
    return assertWithinCliRoot(resolveCliInternalPath('.oc-pi-cli', 'session-dir'))
  }

  private get legacySessionFilePath(): string {
    return assertWithinCliRoot(resolveCliInternalPath('.oc-pi-cli', 'session.json'))
  }

  private get legacySessionBackupFilePath(): string {
    return assertWithinCliRoot(resolveCliInternalPath('.oc-pi-cli', 'session.legacy.json.bak'))
  }
}

function forcePersistSession(sessionManager: PiSessionManager): void {
  // Pi SessionManager only auto-flushes after assistant message entries. Workbench stores
  // session state as custom entries, so force a full rewrite to keep list/resume/fork working.
  const persistedSessionManager = sessionManager as unknown as {
    _rewriteFile?: () => void
  }

  persistedSessionManager._rewriteFile?.()
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

function isWorkbenchSessionEntryData(value: unknown): value is WorkbenchSessionEntryData {
  return typeof value === 'object' && value !== null && 'workbenchState' in value
}

function hydrateWorkbenchState(
  state: WorkbenchState | undefined,
  workspaceRoot: string,
): WorkbenchState {
  const fallback = createDefaultWorkbenchState(workspaceRoot)

  if (!state) {
    return fallback
  }

  return {
    ...fallback,
    ...state,
    session: {
      ...fallback.session,
      ...state.session,
    },
    timeline: {
      items: state.timeline?.items ?? fallback.timeline.items,
    },
    context: {
      ...fallback.context,
      ...state.context,
    },
    inspector: {
      ...fallback.inspector,
      ...state.inspector,
    },
    plan: {
      steps: state.plan?.steps ?? fallback.plan.steps,
    },
    execution: {
      ...fallback.execution,
      ...state.execution,
    },
    review: {
      ...fallback.review,
      ...state.review,
      latestFindings: state.review?.latestFindings ?? fallback.review.latestFindings,
    },
    statusBar: {
      ...fallback.statusBar,
      ...state.statusBar,
    },
  }
}
