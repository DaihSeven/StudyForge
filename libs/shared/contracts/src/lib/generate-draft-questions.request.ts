import { z } from 'zod';

export const MAX_GENERATION_QUANTITY = 10;

export interface GenerateDraftQuestionsRequest {
  organizationId: string;
  mentorId: string;
  text: string;
  quantity: number;
  alternativesPerQuestion: number;
}

export function createGenerateDraftQuestionsRequestSchema(maxInputChars: number): z.ZodType<GenerateDraftQuestionsRequest> {
  void maxInputChars;
  return z.custom<GenerateDraftQuestionsRequest>(() => {
    throw new Error('createGenerateDraftQuestionsRequestSchema ainda não implementado.');
  });
}
