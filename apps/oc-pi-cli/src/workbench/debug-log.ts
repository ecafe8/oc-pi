import { appendFile, mkdir } from 'node:fs/promises'

import { assertWithinCliRoot, resolveCliInternalPath } from '@/runtime/paths.js'

const WORKBENCH_DEBUG_LOG_PATH = assertWithinCliRoot(
  resolveCliInternalPath('.oc-pi-cli', 'workbench-input-debug.log'),
)

export async function appendWorkbenchDebugLog(input: {
  scope: string
  message: string
  data?: Record<string, unknown>
}): Promise<void> {
  try {
    await mkdir(assertWithinCliRoot(resolveCliInternalPath('.oc-pi-cli')), { recursive: true })
    const line = JSON.stringify({
      time: new Date().toISOString(),
      scope: input.scope,
      message: input.message,
      data: input.data,
    })

    await appendFile(WORKBENCH_DEBUG_LOG_PATH, `${line}\n`, 'utf8')
  } catch {
    // Best-effort only. Never break the TUI because logging failed.
  }
}

export function toVisibleControlString(value: string): string {
  return value
    .replace(/\u001b/g, '<ESC>')
    .replace(/\r/g, '<CR>')
    .replace(/\n/g, '<LF>')
    .replace(/\t/g, '<TAB>')
}

export function toHexSequence(value: string): string {
  return Buffer.from(value, 'utf8').toString('hex')
}
