import { MockImageProvider } from '@/lib/image-provider/mock-provider';
import { OpenAIImageProvider } from '@/lib/image-provider/openai-provider';
import { ImageProviderError } from '@/lib/image-provider/types';
import type {
  AssetManifestItem,
  GenerationMode,
  ImageGenerationInput,
  ImageGenerationProvider
} from '@/lib/image-provider/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GenerateRequestBody extends ImageGenerationInput {
  generationMode?: GenerationMode;
}

function errorResponse(message: string, code: string, status: number) {
  return Response.json({ ok: false, error: { code, message } }, { status });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isAssetManifest(value: unknown): value is AssetManifestItem[] {
  return Array.isArray(value) && value.every((asset) => {
    if (!asset || typeof asset !== 'object') return false;
    const item = asset as Partial<AssetManifestItem>;
    return (
      isNonEmptyString(item.id) &&
      isNonEmptyString(item.fileName) &&
      isNonEmptyString(item.sourceType) &&
      isNonEmptyString(item.referenceRole) &&
      isNonEmptyString(item.claimRiskLevel) &&
      isNonEmptyString(item.directionScope) &&
      typeof item.blocked === 'boolean'
    );
  });
}

function selectProvider(mode: GenerationMode): ImageGenerationProvider {
  return mode === 'real' ? new OpenAIImageProvider() : new MockImageProvider();
}

export async function POST(request: Request) {
  let body: GenerateRequestBody;
  try {
    body = (await request.json()) as GenerateRequestBody;
  } catch {
    return errorResponse('Request body must be valid JSON.', 'INVALID_JSON', 400);
  }

  const generationMode = body.generationMode ?? 'mock';
  if (generationMode !== 'mock' && generationMode !== 'real') {
    return errorResponse('generationMode must be mock or real.', 'INVALID_GENERATION_MODE', 400);
  }
  if (!isNonEmptyString(body.directionId)) {
    return errorResponse('directionId is required.', 'DIRECTION_ID_REQUIRED', 400);
  }
  if (!isNonEmptyString(body.finalGenerationPrompt)) {
    return errorResponse('finalGenerationPrompt is required.', 'FINAL_PROMPT_REQUIRED', 400);
  }
  if (!isNonEmptyString(body.negativePrompt)) {
    return errorResponse('negativePrompt is required.', 'NEGATIVE_PROMPT_REQUIRED', 400);
  }
  if (!isAssetManifest(body.assetManifest)) {
    return errorResponse('assetManifest must be an array of governed asset records.', 'INVALID_ASSET_MANIFEST', 400);
  }

  const blockedTruthAsset = body.assetManifest.find(
    (asset) => asset.sourceType === 'competitor' && asset.referenceRole === 'product_truth_reference'
  );
  if (blockedTruthAsset) {
    return errorResponse(
      `Asset ${blockedTruthAsset.fileName} is blocked: competitor images cannot be product truth references.`,
      'ASSET_ROLE_BLOCKED',
      422
    );
  }

  try {
    const provider = selectProvider(generationMode);
    const result = await provider.generate({
      directionId: body.directionId.trim(),
      finalGenerationPrompt: body.finalGenerationPrompt.trim(),
      negativePrompt: body.negativePrompt.trim(),
      assetManifest: body.assetManifest
    });
    return Response.json({ ok: true, result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof ImageProviderError) {
      return errorResponse(error.message, error.code, error.status);
    }
    console.error('Unhandled image generation error', error);
    return errorResponse('Image generation failed unexpectedly.', 'IMAGE_GENERATION_FAILED', 500);
  }
}
