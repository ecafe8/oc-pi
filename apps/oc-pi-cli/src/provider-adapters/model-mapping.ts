import type { RoleConfig } from '@/shared/types/artifacts.js'
import type {
  ProviderModelMapping,
  ResolveProviderModelInput,
  ResolvedProviderModel,
} from '@/provider-adapters/types.js'

export const DEFAULT_PROVIDER_MODEL_MAPPINGS: ProviderModelMapping[] = [
  {
    provider: 'openai',
    logicalModelId: 'planner-model',
    resolvedModelId: 'gpt-5.4',
    authMode: 'api-key',
  },
  {
    provider: 'anthropic',
    logicalModelId: 'reviewer-model',
    resolvedModelId: 'claude-sonnet-4-5',
    authMode: 'api-key',
  },
  {
    provider: 'openai',
    logicalModelId: 'doc-writer-model',
    resolvedModelId: 'gpt-5.4',
    authMode: 'api-key',
  },
  {
    provider: 'anthropic',
    logicalModelId: 'doc-reviewer-model',
    resolvedModelId: 'claude-sonnet-4-5',
    authMode: 'api-key',
  },
  {
    provider: 'anthropic',
    logicalModelId: 'code-writer-model',
    resolvedModelId: 'claude-sonnet-4-5',
    authMode: 'api-key',
  },
  {
    provider: 'openai',
    logicalModelId: 'code-reviewer-model',
    resolvedModelId: 'gpt-5.4',
    authMode: 'api-key',
  },
  {
    provider: 'github-copilot',
    logicalModelId: 'copilot-chat-model',
    resolvedModelId: 'gpt-5-mini',
    authMode: 'oauth',
  },
]

export function resolveProviderModel(
  input: ResolveProviderModelInput,
): ResolvedProviderModel {
  const mapping = input.mappings.find(
    (item) =>
      item.provider === input.role.provider && item.logicalModelId === input.role.model,
  )

  if (!mapping) {
    throw new Error(
      `No provider model mapping found for role ${input.role.roleId} using ${input.role.provider}/${input.role.model}`,
    )
  }

  return {
    provider: mapping.provider,
    logicalModelId: mapping.logicalModelId,
    resolvedModelId: mapping.resolvedModelId,
    authMode: mapping.authMode ?? 'api-key',
  }
}

export function resolveProviderModelForRole(
  role: RoleConfig,
  mappings: ProviderModelMapping[] = DEFAULT_PROVIDER_MODEL_MAPPINGS,
): ResolvedProviderModel {
  return resolveProviderModel({ role, mappings })
}
