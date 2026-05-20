import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import {
  assertWithinCliRoot,
  resolveCliInternalPath,
} from '@/runtime/paths.js'
import type { RuntimeSessionPointer } from '@/runtime/pi-session-types.js'

export class CurrentSessionPointerStore {
  public async read(): Promise<RuntimeSessionPointer | null> {
    try {
      const content = await readFile(this.filePath, 'utf8')
      return JSON.parse(content) as RuntimeSessionPointer
    } catch (error) {
      if (isMissingFileError(error)) {
        return null
      }

      throw error
    }
  }

  public async write(pointer: RuntimeSessionPointer): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    await writeFile(this.filePath, `${JSON.stringify(pointer, null, 2)}\n`, 'utf8')
  }

  private get filePath(): string {
    return assertWithinCliRoot(resolveCliInternalPath('.oc-pi-cli', 'current-session.json'))
  }
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
