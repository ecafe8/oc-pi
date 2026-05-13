import type {
  OAuthCredentials,
  PiAgentBridge,
  PiLoginBridge,
  PiLoginRequest,
  PiLoginResponse,
  PiPromptRequest,
  PiPromptResponse,
} from '@/provider-adapters/types.js'

export class PlaceholderPiAgentBridge implements PiAgentBridge {
  public async prompt(request: PiPromptRequest): Promise<PiPromptResponse> {
    return {
      text: `[placeholder:${request.provider}/${request.modelId}] ${request.prompt}`,
    }
  }
}

export class PlaceholderPiLoginBridge implements PiLoginBridge {
  public async login(request: PiLoginRequest): Promise<PiLoginResponse> {
    const credentials: OAuthCredentials = {
      refresh: `placeholder-refresh:${request.provider}`,
      access: `placeholder-access:${request.provider}`,
      expires: Date.now() + 60 * 60 * 1000,
    }

    return {
      provider: request.provider,
      credentials,
    }
  }
}
