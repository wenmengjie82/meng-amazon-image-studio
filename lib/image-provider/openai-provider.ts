import { ImageProviderError } from './types';
import type { ImageGenerationInput, ImageGenerationOutput, ImageGenerationProvider } from './types';

interface OpenAIImageResponse {
  data?: Array<{
    b64_json?: string;
    revised_prompt?: string;
  }>;
  error?: {
    code?: string;
    message?: string;
  };
}

function buildPrompt(input: ImageGenerationInput) {
  const governedAssets = input.assetManifest.filter((asset) => !asset.blocked);
  const assetSummary = governedAssets.length
    ? governedAssets
        .map((asset) => `- source=${asset.sourceType}; role=${asset.referenceRole}; claim_risk=${asset.claimRiskLevel}`)
        .join('\n')
    : '- No governed asset metadata was supplied.';

  return `${input.finalGenerationPrompt}

HARD RESTRICTIONS:
${input.negativePrompt}

ASSET GOVERNANCE MANIFEST:
${assetSummary}

The manifest contains metadata only in this v0.2 adapter. Do not invent product truth from filenames or metadata. This output is a structure-generation test and must not be treated as final commercial or marketplace-ready artwork.`;
}

export class OpenAIImageProvider implements ImageGenerationProvider {
  readonly id = 'openai';
  readonly mode = 'real' as const;

  async generate(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new ImageProviderError(
        'Real generation is unavailable because OPENAI_API_KEY is not configured on the server.',
        'OPENAI_API_KEY_MISSING',
        503
      );
    }

    const model = process.env.OPENAI_IMAGE_MODEL?.trim() || 'gpt-image-2';
    const size = process.env.OPENAI_IMAGE_SIZE?.trim() || '1024x1024';
    const quality = process.env.OPENAI_IMAGE_QUALITY?.trim() || 'low';
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        prompt: buildPrompt(input),
        size,
        quality
      }),
      cache: 'no-store'
    });

    const payload = (await response.json()) as OpenAIImageResponse;
    if (!response.ok) {
      throw new ImageProviderError(
        payload.error?.message || `OpenAI image generation failed with status ${response.status}.`,
        payload.error?.code || 'OPENAI_IMAGE_GENERATION_FAILED',
        response.status
      );
    }

    const image = payload.data?.[0];
    if (!image?.b64_json) {
      throw new ImageProviderError(
        'OpenAI returned no image data.',
        'OPENAI_IMAGE_DATA_MISSING',
        502
      );
    }

    return {
      requestId: crypto.randomUUID(),
      directionId: input.directionId,
      mode: this.mode,
      provider: this.id,
      status: 'real_generated',
      createdAt: new Date().toISOString(),
      message: 'Real image generation completed. Manual structure QA is still required.',
      imageDataUrl: `data:image/png;base64,${image.b64_json}`,
      outputMimeType: 'image/png',
      revisedPrompt: image.revised_prompt
    };
  }
}
