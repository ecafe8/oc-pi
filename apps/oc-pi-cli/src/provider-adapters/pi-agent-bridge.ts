import type {
  OAuthCredentialMap,
  OAuthCredentials,
  PiAgentBridge,
  PiLoginBridge,
  PiLoginRequest,
  PiLoginResponse,
  PiOAuthApiKeyRequest,
  PiOAuthApiKeyResponse,
  PiOAuthBridge,
  PiPromptRequest,
  PiPromptResponse,
} from '@/provider-adapters/types.js'
import { getOAuthApiKey, loginGitHubCopilot } from '@earendil-works/pi-ai/oauth'

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

export class PiOAuthLoginBridge implements PiLoginBridge, PiOAuthBridge {
  public async login(request: PiLoginRequest): Promise<PiLoginResponse> {
    if (request.provider !== 'github-copilot') {
      throw new Error(`OAuth login is not implemented for provider: ${request.provider}`)
    }

    const credentials = await loginGitHubCopilot({
      onAuth: (url, instructions) => {
        console.log(`Open: ${url}`)
        if (instructions) {
          console.log(instructions)
        }
      },
      onPrompt: async ({ message }) => {
        throw new Error(`Interactive prompt required for OAuth login: ${message}`)
      },
      onProgress: (message) => {
        console.log(message)
      },
    })

    return {
      provider: request.provider,
      credentials,
    }
  }

  public async getApiKey(
    request: PiOAuthApiKeyRequest,
  ): Promise<PiOAuthApiKeyResponse | null> {
    const result = await getOAuthApiKey(
      request.provider as 'github-copilot',
      request.credentials as OAuthCredentialMap,
    )

    if (!result) {
      return null
    }

    return {
      provider: request.provider,
      apiKey: result.apiKey,
      newCredentials: result.newCredentials,
    }
  }
}
