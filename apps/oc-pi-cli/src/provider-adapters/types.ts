import type { RoleConfig } from '@/shared/types/artifacts.js'
import type { OAuthCredentials as PiOAuthCredentials } from '@earendil-works/pi-ai/oauth'

export interface ProviderModelMapping {
  provider: string
  logicalModelId: string
  resolvedModelId: string
  authMode?: ProviderAuthMode
}

export type ProviderAuthMode = 'api-key' | 'oauth'

export interface ResolvedProviderModel {
  provider: string
  logicalModelId: string
  resolvedModelId: string
  authMode: ProviderAuthMode
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

export type OAuthCredentials = PiOAuthCredentials

export interface OAuthCredentialRecord {
  provider: string
  credentials: OAuthCredentials
}

export type OAuthCredentialMap = Record<string, OAuthCredentials>

export interface PiLoginRequest {
  provider: string
}

export interface PiLoginResponse {
  provider: string
  credentials: OAuthCredentials
}

export interface PiLoginBridge {
  login(request: PiLoginRequest): Promise<PiLoginResponse>
}

export interface PiOAuthApiKeyRequest {
  provider: string
  credentials: OAuthCredentialMap
}

export interface PiOAuthApiKeyResponse {
  provider: string
  apiKey: string
  newCredentials: OAuthCredentials
}

export interface PiOAuthBridge {
  getApiKey(request: PiOAuthApiKeyRequest): Promise<PiOAuthApiKeyResponse | null>
}
