import { FileOAuthCredentialStore, PiOAuthLoginBridge } from '@/provider-adapters/index.js'

const SUPPORTED_AUTH_COMMANDS = ['login', 'api-key', 'status'] as const

export async function main(): Promise<void> {
  const [scope, command, provider] = process.argv.slice(2)

  if (scope !== 'auth') {
    printUsage()
    return
  }

  if (!provider) {
    throw new Error('Missing provider argument. Expected: github-copilot')
  }

  if (!isSupportedAuthCommand(command)) {
    throw new Error(
      `Unsupported auth command: ${command ?? 'undefined'}. Expected one of: ${SUPPORTED_AUTH_COMMANDS.join(', ')}`,
    )
  }

  const store = new FileOAuthCredentialStore()
  const bridge = new PiOAuthLoginBridge()

  if (command === 'login') {
    const result = await bridge.login({ provider })
    await store.write(provider, result.credentials)
    console.log(`Stored OAuth credentials for ${provider}`)
    return
  }

  const credentials = await store.read(provider)

  if (!credentials) {
    throw new Error(`No stored OAuth credentials found for ${provider}. Run: bun run src/index.ts auth login ${provider}`)
  }

  if (command === 'status') {
    console.log(
      JSON.stringify(
        {
          provider,
          authenticated: true,
          expiresAt: new Date(credentials.expires).toISOString(),
        },
        null,
        2,
      ),
    )
    return
  }

  const next = await bridge.getApiKey({
    provider,
    credentials: { [provider]: credentials },
  })

  if (!next) {
    throw new Error(`Unable to resolve API key for ${provider}`)
  }

  await store.write(provider, next.newCredentials)
  console.log(next.apiKey)
}

function isSupportedAuthCommand(
  value: string | undefined,
): value is (typeof SUPPORTED_AUTH_COMMANDS)[number] {
  return Boolean(value && SUPPORTED_AUTH_COMMANDS.includes(value as never))
}

function printUsage(): void {
  console.log('Usage: bun run src/index.ts auth <login|api-key|status> <provider>')
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
