import {
  FileOAuthCredentialStore,
  PiModelAgentBridge,
  PiOAuthLoginBridge,
} from '@/provider-adapters/index.js'

const SUPPORTED_AUTH_COMMANDS = ['login', 'api-key', 'status'] as const
const DEFAULT_PROMPT_PROVIDER = 'github-copilot'
const DEFAULT_PROMPT_MODEL_ID = 'gpt-5-mini'

export async function main(): Promise<void> {
  const [scope, ...args] = process.argv.slice(2)

  if (scope === 'auth') {
    await runAuthCommand(args)
    return
  }

  if (scope === 'prompt') {
    await runPromptCommand(args)
    return
  }

  printUsage()
}

async function runAuthCommand(args: string[]): Promise<void> {
  const [command, provider] = args

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

async function runPromptCommand(args: string[]): Promise<void> {
  if (args.length === 0) {
    throw new Error('Missing prompt text. Example: bun run src/index.ts prompt 你好')
  }

  const store = new FileOAuthCredentialStore()
  const loginBridge = new PiOAuthLoginBridge()
  const agentBridge = new PiModelAgentBridge()
  const provider = DEFAULT_PROMPT_PROVIDER
  const modelId = DEFAULT_PROMPT_MODEL_ID
  const prompt = args.join(' ')
  const credentials = await store.read(provider)

  if (!credentials) {
    throw new Error(`No stored OAuth credentials found for ${provider}. Run: bun run src/index.ts auth login ${provider}`)
  }

  const next = await loginBridge.getApiKey({
    provider,
    credentials: { [provider]: credentials },
  })

  if (!next) {
    throw new Error(`Unable to resolve API key for ${provider}`)
  }

  await store.write(provider, next.newCredentials)

  const response = await agentBridge.prompt({
    cwd: process.cwd(),
    provider,
    modelId,
    prompt,
    apiKey: next.apiKey,
  })

  console.log(response.text)
}

function isSupportedAuthCommand(
  value: string | undefined,
): value is (typeof SUPPORTED_AUTH_COMMANDS)[number] {
  return Boolean(value && SUPPORTED_AUTH_COMMANDS.includes(value as never))
}

function printUsage(): void {
  console.log('Usage: bun run src/index.ts auth <login|api-key|status> <provider>')
  console.log('Usage: bun run src/index.ts prompt <message>')
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
