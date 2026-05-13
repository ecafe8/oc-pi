import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

import { completeSimple, getModels } from '@earendil-works/pi-ai'
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

export class PiModelAgentBridge implements PiAgentBridge {
  public async prompt(request: PiPromptRequest): Promise<PiPromptResponse> {
    if (request.provider !== 'github-copilot') {
      throw new Error(`Real prompt bridge is not implemented for provider: ${request.provider}`)
    }

    if (!request.apiKey) {
      throw new Error(`API key is required for provider: ${request.provider}`)
    }

    const model = getModels('github-copilot').find(
      (candidate) => candidate.id === request.modelId,
    )

    if (!model) {
      throw new Error(`No GitHub Copilot model found for model ID: ${request.modelId}`)
    }

    const response = await completeSimple(
      model,
      {
        messages: [
          {
            role: 'user',
            content: request.prompt,
            timestamp: Date.now(),
          },
        ],
      },
      {
        apiKey: request.apiKey,
        reasoning: 'minimal',
      },
    )

    return {
      text: response.content
        .filter((item) => item.type === 'text')
        .map((item) => item.text)
        .join('')
        .trim(),
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
      onPrompt: async ({ message, placeholder, allowEmpty }) => {
        return promptForOAuthInput({
          message,
          placeholder,
          allowEmpty,
        })
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

async function promptForOAuthInput(inputOptions: {
  message: string
  placeholder?: string
  allowEmpty?: boolean
}): Promise<string> {
  const rl = createInterface({ input, output })

  try {
    const suffix = inputOptions.placeholder
      ? ` (${inputOptions.placeholder})`
      : inputOptions.allowEmpty
        ? ' (press Enter to leave blank)'
        : ''
    const answer = await rl.question(`${inputOptions.message}${suffix}: `)

    if (!answer && !inputOptions.allowEmpty) {
      throw new Error(`OAuth input is required: ${inputOptions.message}`)
    }

    return answer
  } finally {
    rl.close()
  }
}
