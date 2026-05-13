import type { PiAgentBridge, PiPromptRequest, PiPromptResponse } from '@/provider-adapters/types.js'

export class PlaceholderPiAgentBridge implements PiAgentBridge {
  public async prompt(request: PiPromptRequest): Promise<PiPromptResponse> {
    return {
      text: `[placeholder:${request.provider}/${request.modelId}] ${request.prompt}`,
    }
  }
}
