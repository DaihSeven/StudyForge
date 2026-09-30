import { ALTERNATIVE_LETTERS, QuestionType } from '@studyforge/shared/domain';
import { z } from 'zod';

/**
 * Entrada para criar uma `DraftQuestion`. Valida só o formato; as regras por tipo
 * (quantas alternativas, quantas corretas, textos não vazios) ficam no domínio.
 */
export const CreateDraftQuestionCommandSchema = z.object({
  organizationId: z.string(),
  type: z.enum(QuestionType),
  statement: z.string(),
  alternatives: z.array(
    z.object({
      letter: z.enum(ALTERNATIVE_LETTERS),
      text: z.string(),
      isCorrect: z.boolean(),
    }),
  ),
});

export type CreateDraftQuestionCommand = z.infer<typeof CreateDraftQuestionCommandSchema>;
