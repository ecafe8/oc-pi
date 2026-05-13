import { existsSync } from 'node:fs'
import { dirname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const CURRENT_FILE_PATH = fileURLToPath(import.meta.url)
const SRC_RUNTIME_DIR = dirname(CURRENT_FILE_PATH)
const CLI_ROOT_PATH = resolve(SRC_RUNTIME_DIR, '..', '..')

export function getCliRootPath(): string {
  return CLI_ROOT_PATH
}

export function getWorkspaceRootPath(): string {
  return discoverWorkspaceRoot(CLI_ROOT_PATH)
}

export function resolveWorkspacePath(...segments: string[]): string {
  return join(getWorkspaceRootPath(), ...segments)
}

export function resolveTestSandboxPath(...segments: string[]): string {
  return join(getWorkspaceRootPath(), 'tests', 'sandbox', ...segments)
}

export function assertWithinWorkspaceDocs(path: string): string {
  const workspaceDocsRoot = normalize(
    join(getWorkspaceRootPath(), 'apps', 'web-docs') + sep,
  )
  const normalizedPath = normalize(path)

  if (!normalizedPath.startsWith(workspaceDocsRoot)) {
    throw new Error(
      `Refusing to write artifact outside apps/web-docs: ${normalizedPath}`,
    )
  }

  return normalizedPath
}

export function assertWithinTestSandbox(path: string): string {
  const sandboxRoot = normalize(
    join(getWorkspaceRootPath(), 'tests', 'sandbox') + sep,
  )
  const normalizedPath = normalize(path)

  if (!normalizedPath.startsWith(sandboxRoot)) {
    throw new Error(
      `Refusing to write preview artifact outside tests/sandbox: ${normalizedPath}`,
    )
  }

  return normalizedPath
}

function discoverWorkspaceRoot(startPath: string): string {
  let currentPath = resolve(startPath)

  while (true) {
    if (isWorkspaceRoot(currentPath)) {
      return currentPath
    }

    const parentPath = dirname(currentPath)

    if (parentPath === currentPath) {
      throw new Error(
        `Unable to locate workspace root from ${startPath}. Expected apps/oc-pi-cli/package.json and apps/web-docs/content/docs.`,
      )
    }

    currentPath = parentPath
  }
}

function isWorkspaceRoot(path: string): boolean {
  return (
    existsSync(join(path, 'apps', 'oc-pi-cli', 'package.json')) &&
    existsSync(join(path, 'apps', 'web-docs', 'content', 'docs'))
  )
}
