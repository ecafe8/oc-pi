import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

import type { OAuthCredentialMap, OAuthCredentials } from '@/provider-adapters/types.js'

export interface OAuthCredentialStore {
  readAll(): Promise<OAuthCredentialMap>
  read(provider: string): Promise<OAuthCredentials | null>
  write(provider: string, credentials: OAuthCredentials): Promise<void>
}

const DEFAULT_CONFIG_DIR = join(homedir(), '.config', 'oc-pi-cli')
const DEFAULT_STORE_PATH = join(
  process.env.XDG_CONFIG_HOME ?? DEFAULT_CONFIG_DIR,
  process.env.XDG_CONFIG_HOME ? 'oc-pi-cli' : '',
  'oauth-credentials.json',
)

export class FileOAuthCredentialStore implements OAuthCredentialStore {
  public constructor(private readonly filePath: string = DEFAULT_STORE_PATH) {}

  public async readAll(): Promise<OAuthCredentialMap> {
    try {
      const content = await readFile(this.filePath, 'utf8')
      const parsed = JSON.parse(content) as unknown

      if (!isOAuthCredentialMap(parsed)) {
        throw new Error(`Invalid OAuth credential store format: ${this.filePath}`)
      }

      return parsed
    } catch (error) {
      if (isMissingFileError(error)) {
        return {}
      }

      throw error
    }
  }

  public async read(provider: string): Promise<OAuthCredentials | null> {
    const credentials = await this.readAll()

    return credentials[provider] ?? null
  }

  public async write(provider: string, credentials: OAuthCredentials): Promise<void> {
    const current = await this.readAll()
    const next: OAuthCredentialMap = {
      ...current,
      [provider]: credentials,
    }

    await mkdir(dirname(this.filePath), { recursive: true })
    await writeFile(this.filePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  }
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

function isOAuthCredentialMap(value: unknown): value is OAuthCredentialMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  return Object.values(value).every(isOAuthCredentials)
}

function isOAuthCredentials(value: unknown): value is OAuthCredentials {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.refresh === 'string' &&
    typeof candidate.access === 'string' &&
    typeof candidate.expires === 'number'
  )
}
