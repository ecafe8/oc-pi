import { existsSync } from 'node:fs'
import { dirname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const CURRENT_FILE_PATH = fileURLToPath(import.meta.url)
const SRC_RUNTIME_DIR = dirname(CURRENT_FILE_PATH)
const CLI_ROOT_PATH = resolve(SRC_RUNTIME_DIR, '..', '..')

export const RUNTIME_STAGE_ENV = 'OC_PI_RUNTIME_STAGE'

export type RuntimeStage = 'development' | 'test' | 'production'

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

export function resolveCliInternalPath(...segments: string[]): string {
  return join(getCliRootPath(), ...segments)
}

export function assertWithinCliRoot(path: string): string {
  return assertWithinAllowedRoot({
    path,
    rootPath: getCliRootPath(),
    errorMessage: 'Refusing to access internal file outside apps/oc-pi-cli',
  })
}

export function assertWithinWorkspaceDocs(path: string): string {
  return assertWithinAllowedRoot({
    path,
    rootPath: join(getWorkspaceRootPath(), 'apps', 'web-docs'),
    errorMessage: 'Refusing to write artifact outside apps/web-docs',
  })
}

export function assertWithinTestSandbox(path: string): string {
  return assertWithinAllowedRoot({
    path,
    rootPath: join(getWorkspaceRootPath(), 'tests', 'sandbox'),
    errorMessage: 'Refusing to write preview artifact outside tests/sandbox',
  })
}

export function resolveRuntimeStage(): RuntimeStage {
  const value = process.env[RUNTIME_STAGE_ENV]?.trim().toLowerCase()

  if (value === 'production') {
    return 'production'
  }

  if (value === 'test') {
    return 'test'
  }

  return 'development'
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

function assertWithinAllowedRoot(input: {
  path: string
  rootPath: string
  errorMessage: string
}): string {
  const normalizedRoot = normalize(input.rootPath + sep)
  const normalizedPath = normalize(input.path)

  if (!normalizedPath.startsWith(normalizedRoot)) {
    throw new Error(`${input.errorMessage}: ${normalizedPath}`)
  }

  return normalizedPath
}
