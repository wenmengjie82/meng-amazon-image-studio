import type { ClaimRiskLevel, ReferenceRole, SourceType } from '@/types/workflow';

export type GenerationMode = 'mock' | 'real';
export type GenerationResultStatus = 'mock_generated' | 'real_generated';
export type GenerationRecordStatus =
  | 'not_generated'
  | 'generating'
  | GenerationResultStatus
  | 'generation_failed';

export interface AssetManifestItem {
  id: string;
  fileName: string;
  sourceType: SourceType;
  referenceRole: ReferenceRole;
  claimRiskLevel: ClaimRiskLevel;
  directionScope: string;
  blocked: boolean;
  blockReason?: string;
}

export interface ImageGenerationInput {
  directionId: string;
  finalGenerationPrompt: string;
  negativePrompt: string;
  assetManifest: AssetManifestItem[];
}

export interface ImageGenerationOutput {
  requestId: string;
  directionId: string;
  mode: GenerationMode;
  provider: string;
  status: GenerationResultStatus;
  createdAt: string;
  message: string;
  imageDataUrl?: string;
  outputMimeType?: string;
  revisedPrompt?: string;
}

export interface GenerationRecord {
  directionId: string;
  mode: GenerationMode;
  status: GenerationRecordStatus;
  provider?: string;
  requestId?: string;
  createdAt?: string;
  message?: string;
  errorCode?: string;
  imageDataUrl?: string;
  outputMimeType?: string;
  revisedPrompt?: string;
}

export interface ImageGenerationProvider {
  readonly id: string;
  readonly mode: GenerationMode;
  generate(input: ImageGenerationInput): Promise<ImageGenerationOutput>;
}

export class ImageProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ImageProviderError';
  }
}
