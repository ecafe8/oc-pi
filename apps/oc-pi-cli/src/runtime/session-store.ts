import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { GoalToDocsRunRecord } from '@/planning/goal-to-docs/types.js'
import { createDefaultWorkbenchState } from '@/runtime/default-config.js'
import { assertWithinCliRoot, resolveCliInternalPath } from '@/runtime/paths.js'
import type { WorkbenchState } from '@/workbench/types.js'

export interface RuntimeSessionRecord {
  workbenchState: WorkbenchState
  latestRun?: GoalToDocsRunRecord
}

export class FileRuntimeSessionStore {
  public constructor(private readonly workspaceRoot: string) {}

  public async read(): Promise<RuntimeSessionRecord | null> {
    try {
      const content = await readFile(this.filePath, 'utf8')
      const parsed = JSON.parse(content) as RuntimeSessionRecord

      return {
        ...parsed,
        workbenchState: hydrateWorkbenchState(parsed.workbenchState, this.workspaceRoot),
      }
    } catch (error) {
      if (isMissingFileError(error)) {
        return null
      }

      throw error
    }
  }

  public async write(record: RuntimeSessionRecord): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    await writeFile(this.filePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8')
  }

  private get filePath(): string {
    return assertWithinCliRoot(resolveCliInternalPath('.oc-pi-cli', 'session.json'))
  }
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
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
