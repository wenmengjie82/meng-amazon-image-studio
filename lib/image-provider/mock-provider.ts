import type { ImageGenerationInput, ImageGenerationOutput, ImageGenerationProvider } from './types';

export class MockImageProvider implements ImageGenerationProvider {
  readonly id = 'mock';
  readonly mode = 'mock' as const;

  async generate(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    return {
      requestId: crypto.randomUUID(),
      directionId: input.directionId,
      mode: this.mode,
      provider: this.id,
      status: 'mock_generated',
      createdAt: new Date().toISOString(),
      message: 'Mock generation completed. No commercial image was created; manual QA is still required.'
    };
  }
}
