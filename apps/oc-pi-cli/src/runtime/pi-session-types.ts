import type { GoalToDocsRunRecord } from '@/planning/goal-to-docs/types.js'
import type { WorkbenchState } from '@/workbench/types.js'

export const WORKBENCH_SESSION_ENTRY_TYPE = 'oc-pi-workbench-state'
export const WORKBENCH_SESSION_ENTRY_VERSION = 1

export interface RuntimeSessionRecord {
  workbenchState: WorkbenchState
  latestRun?: GoalToDocsRunRecord
}

export interface WorkbenchSessionEntryData extends RuntimeSessionRecord {
  version: number
  savedAt: string
}

export interface RuntimeSessionListItem {
  sessionId: string
  sessionName?: string
  sessionFile?: string
  parentSessionId?: string
  createdAt: string
  updatedAt: string
  goalSummary?: string
  isCurrent: boolean
}

export interface RuntimeSessionPointer {
  sessionFile: string
  sessionId?: string
}
