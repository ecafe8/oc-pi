import type { RoleConfig } from '@/shared/types/artifacts.js'

export interface ProviderModelMapping {
  provider: string
  logicalModelId: string
  resolvedModelId: string
}

export interface ResolvedProviderModel {
  provider: string
  logicalModelId: string
  resolvedModelId: string
}

export interface ResolveProviderModelInput {
  role: RoleConfig
  mappings: ProviderModelMapping[]
}

export interface PiPromptRequest {
  cwd: string
  provider: string
  modelId: string
  prompt: string
}

export interface PiPromptResponse {
  text: string
}

export interface PiAgentBridge {
  prompt(request: PiPromptRequest): Promise<PiPromptResponse>
}
