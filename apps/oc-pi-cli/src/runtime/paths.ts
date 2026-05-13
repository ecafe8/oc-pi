import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const CURRENT_FILE_PATH = fileURLToPath(import.meta.url)
const SRC_RUNTIME_DIR = dirname(CURRENT_FILE_PATH)

export function getCliRootPath(): string {
  return resolve(SRC_RUNTIME_DIR, '..', '..')
}

export function getWorkspaceRootPath(): string {
  return resolve(SRC_RUNTIME_DIR, '..', '..', '..', '..')
}
