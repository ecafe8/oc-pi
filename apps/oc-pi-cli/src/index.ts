import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

import {
  FileOAuthCredentialStore,
  PiModelAgentBridge,
  PiOAuthLoginBridge,
} from '@/provider-adapters/index.js'
import {
  type ArtifactMode,
  type RealWriteConfirmationRequest,
  runGoalToDocsMvp,
} from '@/planning/goal-to-docs/run-mvp.js'
import { createDefaultWorkbenchState } from '@/runtime/default-config.js'
import { getCliRootPath } from '@/runtime/paths.js'
import { FileRuntimeSessionStore } from '@/runtime/session-store.js'
import { startWorkbench } from '@/workbench/index.js'
import {
  handleReviewLatest,
  handleStatusShow,
} from '@/workbench/controller/index.js'

const SUPPORTED_AUTH_COMMANDS = ['login', 'api-key', 'status'] as const
const DEFAULT_PROMPT_PROVIDER = 'github-copilot'
const DEFAULT_PROMPT_MODEL_ID = 'gpt-5-mini'
const REAL_DOCS_WRITE_ENV = 'OC_PI_ENABLE_REAL_DOCS_WRITE'

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

  if (scope === 'goal') {
    await runGoalCommand(args)
    return
  }

  if (scope === 'status') {
    await runStatusCommand(args)
    return
  }

  if (scope === 'review') {
    await runReviewCommand(args)
    return
  }

  if (scope === 'workbench') {
    await runWorkbenchCommand(args)
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
  const cliRoot = getCliRootPath()
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
    cwd: cliRoot,
    provider,
    modelId,
    prompt,
    apiKey: next.apiKey,
  })

  console.log(response.text)
}

async function runGoalCommand(args: string[]): Promise<void> {
  const writesDocs = args.includes('--write-docs')
  const writesSandbox = args.includes('--write-sandbox')

  if (writesDocs && writesSandbox) {
    throw new Error('Conflicting goal write flags. Use either --write-docs or --write-sandbox')
  }

  const requestedArtifactMode = resolveArtifactMode({ writesDocs, writesSandbox })
  const artifactMode = resolveEffectiveArtifactMode(requestedArtifactMode)
  const filteredArgs = args.filter(
    (arg) => arg !== '--write-docs' && arg !== '--write-sandbox',
  )
  const [command, ...goalParts] = filteredArgs

  if (command !== 'new') {
    throw new Error(`Unsupported goal command: ${command ?? 'undefined'}. Expected: new`)
  }

  if (goalParts.length === 0) {
    throw new Error('Missing goal text. Example: bun run src/index.ts goal new 做一个本地 AI 规划工作台')
  }

  const goal = goalParts.join(' ')
  const cliRoot = getCliRootPath()
  const sessionStore = new FileRuntimeSessionStore(cliRoot)
  const result = await runGoalToDocsMvp({
    goal,
    cliRoot,
    artifactMode,
    confirmRealWrite: artifactMode === 'write' ? confirmRealDocsWrite : undefined,
  })

  if (requestedArtifactMode === 'write' && artifactMode !== 'write') {
    console.log(
      `[write-mode] real docs write disabled, redirected to sandbox. Set ${REAL_DOCS_WRITE_ENV}=true to enable apps/web-docs writes.`,
    )
  }

  if (artifactMode === 'write' && !result.blockedByRealWriteGuard) {
    await sessionStore.write({
      workbenchState: result.workbenchState,
      latestRun: result.run,
    })
  }

  console.log(
    JSON.stringify(
      {
        command: 'goal.new',
        requestedMode: requestedArtifactMode,
        mode: artifactMode,
        acceptedGoal: goal,
        stages: result.stages.map((stage) => ({
          stageId: stage.stageId,
          primaryOutputSlot: stage.primaryOutputSlot,
          additionalOutputSlots: stage.additionalOutputSlots,
          logicalArtifactPath: stage.logicalArtifactPath,
          resolvedArtifactAbsolutePath: stage.resolvedArtifactAbsolutePath,
          resolvedTargets: stage.resolvedTargets,
          reviewStatus: stage.review.status,
          reviewSummary: stage.review.summary,
          wroteArtifact: stage.wroteArtifact,
          artifactDetails: stage.artifactDetails.map((artifact) => ({
            slotId: artifact.slotId,
            logicalArtifactPath: artifact.logicalArtifactPath,
            resolvedArtifactAbsolutePath: artifact.resolvedArtifactAbsolutePath,
            reviewStatus: artifact.review.status,
            reviewSummary: artifact.review.summary,
            wroteArtifact: artifact.wroteArtifact,
            realWriteGuard: artifact.realWriteGuard
              ? {
                  conflictLevel: artifact.realWriteGuard.conflictLevel,
                  summary: artifact.realWriteGuard.summary,
                  findings: artifact.realWriteGuard.findings.map((finding) => finding.message),
                  action: artifact.realWriteGuard.action,
                }
              : null,
          })),
          realWriteGuard: stage.realWriteGuard
            ? {
                conflictLevel: stage.realWriteGuard.conflictLevel,
                summary: stage.realWriteGuard.summary,
                findings: stage.realWriteGuard.findings.map((finding) => finding.message),
                action: stage.realWriteGuard.action,
              }
            : null,
        })),
        wroteArtifact: result.wroteArtifact,
        blockedByRealWriteGuard: result.blockedByRealWriteGuard,
        latestReviewStatus: result.latestReview.status,
        latestReviewSummary: result.latestReview.summary,
      },
      null,
      2,
    ),
  )
}

async function runStatusCommand(args: string[]): Promise<void> {
  const [command] = args

  if (command !== 'show') {
    throw new Error(`Unsupported status command: ${command ?? 'undefined'}. Expected: show`)
  }

  const cliRoot = getCliRootPath()
  const sessionStore = new FileRuntimeSessionStore(cliRoot)
  const session = await sessionStore.read()
  const state = session?.workbenchState ?? createDefaultWorkbenchState(cliRoot)
  const result = handleStatusShow(state)

  console.log(JSON.stringify(result.command, null, 2))
}

async function runReviewCommand(args: string[]): Promise<void> {
  const [command] = args

  if (command !== 'latest') {
    throw new Error(`Unsupported review command: ${command ?? 'undefined'}. Expected: latest`)
  }

  const cliRoot = getCliRootPath()
  const sessionStore = new FileRuntimeSessionStore(cliRoot)
  const session = await sessionStore.read()
  const state = session?.workbenchState ?? createDefaultWorkbenchState(cliRoot)
  const result = handleReviewLatest(state)

  console.log(JSON.stringify(result.command, null, 2))
}

async function runWorkbenchCommand(args: string[]): Promise<void> {
  const [command] = args

  if (command && command !== 'start') {
    throw new Error(`Unsupported workbench command: ${command}. Expected: start`)
  }

  await startWorkbench({
    workspacePath: getCliRootPath(),
  })
}

function isSupportedAuthCommand(
  value: string | undefined,
): value is (typeof SUPPORTED_AUTH_COMMANDS)[number] {
  return Boolean(value && SUPPORTED_AUTH_COMMANDS.includes(value as never))
}

function printUsage(): void {
  console.log('Usage: bun run src/index.ts auth <login|api-key|status> <provider>')
  console.log('Usage: bun run src/index.ts prompt <message>')
  console.log('Default goal preview target: tests/sandbox/web-docs/content/... (no files written)')
  console.log('Sandbox goal write target: tests/sandbox/web-docs/content/... (--write-sandbox)')
  console.log(`Real goal write target: apps/web-docs/content/docs/... (--write-docs, requires ${REAL_DOCS_WRITE_ENV}=true)`) 
  console.log('Usage: bun run src/index.ts goal new [--write-sandbox|--write-docs] <goal>')
  console.log('Usage: bun run src/index.ts status show')
  console.log('Usage: bun run src/index.ts review latest')
  console.log('Usage: bun run src/index.ts workbench [start]')
}

function resolveArtifactMode(input: {
  writesDocs: boolean
  writesSandbox: boolean
}): ArtifactMode {
  if (input.writesDocs) {
    return 'write'
  }

  if (input.writesSandbox) {
    return 'sandbox-write'
  }

  return 'preview'
}

function resolveEffectiveArtifactMode(artifactMode: ArtifactMode): ArtifactMode {
  if (artifactMode !== 'write') {
    return artifactMode
  }

  return isRealDocsWriteEnabled() ? 'write' : 'sandbox-write'
}

function isRealDocsWriteEnabled(): boolean {
  const value = process.env[REAL_DOCS_WRITE_ENV]?.trim().toLowerCase()

  return value === '1' || value === 'true' || value === 'yes'
}

async function confirmRealDocsWrite(
  request: RealWriteConfirmationRequest,
): Promise<boolean> {
  const rl = createInterface({ input, output })

  try {
    console.log(`[real-write-guard] stage=${request.stageId} slot=${request.primaryOutputSlot}`)
    console.log(`[real-write-guard] path=${request.logicalArtifactPath}`)
    console.log(`[real-write-guard] resolved=${request.resolvedArtifactAbsolutePath}`)
    console.log(`[real-write-guard] conflict=${request.conflictLevel}`)
    console.log(`[real-write-guard] summary=${request.summary}`)
    console.log(`[real-write-guard] source=${request.sourceSummary}`)
    console.log(`[real-write-guard] candidate=${request.candidateSummary}`)

    if (request.findings.length > 0) {
      for (const finding of request.findings) {
        console.log(`[real-write-guard] finding=${finding}`)
      }
    }

    for (const target of request.resolvedTargets) {
      console.log(`[real-write-guard] target=${target.slotId} -> ${target.path}`)
    }

    const answer = await rl.question(
      request.canForceWrite
        ? 'Blocking conflict detected. Type "overwrite" to force real write, or press Enter to cancel: '
        : 'Warning conflict detected. Type "yes" to continue real write, or press Enter to cancel: ',
    )

    const normalized = answer.trim().toLowerCase()

    return request.canForceWrite
      ? normalized === 'overwrite'
      : normalized === 'yes'
  } finally {
    rl.close()
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
