import { QUESTION_TYPE_RULES } from '@studyforge/shared/domain';
import { z } from 'zod';

/** Teto de questões por pedido (decisão da autora, ADR-010). Limite de entrada, não regra de domínio. */
export const MAX_GENERATION_QUANTITY = 10;

const alternativeCounts: number[] = Object.values(QUESTION_TYPE_RULES).map((rules) => rules.letters.length);

/**
 * Entrada de POST /api/draft-questions/generate. Valida só o formato; `maxInputChars` vem da
 * configuração (AI_MAX_INPUT_CHARS) e por isso o schema é criado por fábrica.
 * `organizationId` e `mentorId` no corpo são TEMPORÁRIOS até o Marco 3.2 (autenticação).
 */
export function createGenerateDraftQuestionsRequestSchema(maxInputChars: number) {
  return z.object({
    organizationId: z.string(),
    mentorId: z.string(),
    text: z
      .string()
      .refine((value) => value.trim() !== '', 'Text cannot be blank.')
      .refine((value) => value.length <= maxInputChars, `Text cannot exceed ${maxInputChars} characters.`),
    quantity: z.number().int().min(1).max(MAX_GENERATION_QUANTITY),
    alternativesPerQuestion: z.number().refine((value) => alternativeCounts.includes(value), {
      message: `alternativesPerQuestion must be one of ${alternativeCounts.join(', ')}.`,
    }),
  });
}

export type GenerateDraftQuestionsRequest = z.infer<ReturnType<typeof createGenerateDraftQuestionsRequestSchema>>;
