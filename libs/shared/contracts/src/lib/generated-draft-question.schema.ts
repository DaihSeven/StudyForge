import { z } from 'zod';
import { QuestionType } from '@studyforge/shared/domain';

/** Questão como devolvida por um gerador (IA ou mock), antes de virar `DraftQuestion`. */
export interface GeneratedDraftQuestion {
  readonly type: QuestionType;
  readonly statement: string;
  readonly alternatives: readonly { readonly letter: string; readonly text: string; readonly isCorrect: boolean }[];
}

/** Stub (RED): o schema real vem no commit green. */
export const GeneratedDraftQuestionSchema = {
  safeParse(): never {
    throw new Error('GeneratedDraftQuestionSchema ainda não implementado.');
  },
} as unknown as z.ZodType<GeneratedDraftQuestion>;
