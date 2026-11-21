import { ALTERNATIVE_LETTERS, QUESTION_TYPE_RULES, QuestionType } from '@studyforge/shared/domain';
import { z } from 'zod';

const alternativeCounts = Object.values(QUESTION_TYPE_RULES).map((rules) => rules.letters.length);

/**
 * Formato (structured output) de uma questão devolvida por um gerador. Valida só a forma:
 * tipo conhecido, letras A–E e quantidade de alternativas dentro dos limites dos tipos
 * existentes (derivados de `QUESTION_TYPE_RULES`, sem repetir os números). A regra de
 * quantas são corretas, por tipo, fica no domínio (`validateDraftQuestionStructure`).
 */
export const GeneratedDraftQuestionSchema = z.object({
  type: z.enum(QuestionType),
  statement: z.string(),
  alternatives: z
    .array(
      z.object({
        letter: z.enum(ALTERNATIVE_LETTERS),
        text: z.string(),
        isCorrect: z.boolean(),
      }),
    )
    .min(Math.min(...alternativeCounts))
    .max(Math.max(...alternativeCounts)),
});

export type GeneratedDraftQuestion = z.infer<typeof GeneratedDraftQuestionSchema>;
