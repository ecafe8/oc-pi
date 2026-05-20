import { createDefaultWorkbenchState } from '@/runtime/default-config.js'
import { getCliRootPath } from '@/runtime/paths.js'
import { FileRuntimeSessionStore } from '@/runtime/session-store.js'
import { executeWorkbenchSlashCommand } from '@/workbench/index.js'
import { presentWorkbenchState } from '@/workbench/presenters/present-workbench-state.js'

import type { GoalToDocsRunRecord } from '@/planning/goal-to-docs/types.js'
import type { RuntimeSessionListItem } from '@/runtime/session-store.js'
import type { WorkbenchState } from '@/workbench/types.js'

interface WorkbenchSessionSmokeResult {
  originalSessionId?: string
  createdSessionId: string
  forkedSessionId: string
  restoredSessionId?: string
  listedBefore: number
  listedAfterCreate: number
  listedAfterFork: number
}

const cliRoot = getCliRootPath()

const result = await runWorkbenchSessionSmokeTest({
  workspacePath: cliRoot,
})

console.log(JSON.stringify(result, null, 2))

async function runWorkbenchSessionSmokeTest(input: {
  workspacePath: string
}): Promise<WorkbenchSessionSmokeResult> {
  const sessionStore = new FileRuntimeSessionStore(input.workspacePath)
  const existingSession = await sessionStore.read()
  const originalSessionId = existingSession?.workbenchState.session.sessionId
  let state = existingSession?.workbenchState ?? createDefaultWorkbenchState(input.workspacePath)
  let latestRun = existingSession?.latestRun

  const listedBefore = await sessionStore.listSessions()
  const listedView = await runSlashCommand({
    state,
    latestRun,
    command: '/session-list',
    workspacePath: input.workspacePath,
    sessionStore,
  })
  state = listedView.state
  latestRun = listedView.latestRun

  assert(
    listedView.presented.chatPane.latestSummary?.includes('updated:') ?? false,
    'Expected /session-list to append a formatted session summary.',
  )

  const createdView = await runSlashCommand({
    state,
    latestRun,
    command: '/session-new Smoke Test Session',
    workspacePath: input.workspacePath,
    sessionStore,
  })
  state = createdView.state
  latestRun = createdView.latestRun

  const createdSessionId = requiredSessionId(createdView.state, '/session-new')
  const listedAfterCreate = await sessionStore.listSessions()

  assert(
    listedAfterCreate.some((session) => session.sessionId === createdSessionId && session.isCurrent),
    'Expected /session-new to create and switch to a current session.',
  )
  assert(
    createdView.presented.topBar.sessionName === 'Smoke Test Session',
    'Expected top bar to show the newly created session name.',
  )
  assert(
    createdView.presented.rightPane.projectInfo.sessionName === 'Smoke Test Session',
    'Expected right pane project info to show the newly created session name.',
  )

  const forkedView = await runSlashCommand({
    state,
    latestRun,
    command: '/session-fork',
    workspacePath: input.workspacePath,
    sessionStore,
  })
  state = forkedView.state
  latestRun = forkedView.latestRun

  const forkedSessionId = requiredSessionId(forkedView.state, '/session-fork')
  const listedAfterFork = await sessionStore.listSessions()

  assert(
    forkedSessionId !== createdSessionId,
    'Expected /session-fork to switch to a distinct session.',
  )
  assert(
    Boolean(forkedView.state.session.parentSessionId),
    'Expected /session-fork to preserve a parent session reference.',
  )
  assert(
    listedAfterFork.some((session) => session.sessionId === forkedSessionId && session.isCurrent),
    'Expected /session-fork to switch the current session pointer.',
  )
  assert(
    forkedView.presented.topBar.sessionId === forkedSessionId,
    'Expected top bar to refresh to the forked session id.',
  )
  assert(
    forkedView.presented.rightPane.projectInfo.sessionId === forkedSessionId,
    'Expected right pane project info to refresh to the forked session id.',
  )

  const resumedView = await runSlashCommand({
    state,
    latestRun,
    command: `/session-resume ${createdSessionId}`,
    workspacePath: input.workspacePath,
    sessionStore,
  })
  state = resumedView.state
  latestRun = resumedView.latestRun

  assert(
    resumedView.state.session.sessionId === createdSessionId,
    'Expected /session-resume to switch back to the requested session.',
  )
  assert(
    resumedView.presented.topBar.sessionName === 'Smoke Test Session',
    'Expected top bar to show the resumed session name.',
  )
  assert(
    resumedView.presented.rightPane.projectInfo.sessionName === 'Smoke Test Session',
    'Expected right pane project info to show the resumed session name.',
  )

  if (originalSessionId && originalSessionId !== resumedView.state.session.sessionId) {
    const restoredView = await runSlashCommand({
      state,
      latestRun,
      command: `/session-resume ${originalSessionId}`,
      workspacePath: input.workspacePath,
      sessionStore,
    })

    state = restoredView.state
    latestRun = restoredView.latestRun

    assert(
      restoredView.state.session.sessionId === originalSessionId,
      'Expected smoke test to restore the original current session.',
    )
  }

  return {
    originalSessionId,
    createdSessionId,
    forkedSessionId,
    restoredSessionId: state.session.sessionId,
    listedBefore: listedBefore.length,
    listedAfterCreate: listedAfterCreate.length,
    listedAfterFork: listedAfterFork.length,
  }
}

async function runSlashCommand(input: {
  state: WorkbenchState
  latestRun?: GoalToDocsRunRecord
  command: string
  workspacePath: string
  sessionStore: FileRuntimeSessionStore
}): Promise<{
  state: WorkbenchState
  latestRun?: GoalToDocsRunRecord
  presented: ReturnType<typeof presentWorkbenchState>
  persistedSessions: RuntimeSessionListItem[]
}> {
  const result = await executeWorkbenchSlashCommand({
    state: input.state,
    command: input.command,
    cliRoot: input.workspacePath,
    latestRun: input.latestRun,
    sessionStore: input.sessionStore,
  })

  await input.sessionStore.write({
    workbenchState: result.state,
    latestRun: result.latestRun ?? input.latestRun,
  })

  const persisted = await input.sessionStore.read()
  const state = persisted?.workbenchState ?? result.state
  const latestRun = persisted?.latestRun ?? result.latestRun ?? input.latestRun

  return {
    state,
    latestRun,
    presented: presentWorkbenchState(state),
    persistedSessions: await input.sessionStore.listSessions(),
  }
}

function requiredSessionId(state: WorkbenchState, commandName: string): string {
  const sessionId = state.session.sessionId

  assert(Boolean(sessionId), `Expected ${commandName} to resolve a session id.`)

  return sessionId as string
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}
