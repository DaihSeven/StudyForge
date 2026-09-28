import { AlternativeLetter } from './alternative';

export const QuestionType = Object.freeze({
  SINGLE_CHOICE: 'SINGLE_CHOICE',
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
} as const);

export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

export function isQuestionType(value: unknown): value is QuestionType {
  return (Object.values(QuestionType) as unknown[]).includes(value);
}

/** Estrutura exigida por um tipo de questão: letras esperadas (em ordem) e número de corretas. */
export interface QuestionTypeRules {
  readonly letters: readonly AlternativeLetter[];
  readonly correctCount: number;
}

export const QUESTION_TYPE_RULES: Readonly<Record<QuestionType, QuestionTypeRules>> = Object.freeze({
  [QuestionType.SINGLE_CHOICE]: Object.freeze({
    letters: Object.freeze(['A', 'B', 'C', 'D'] as const),
    correctCount: 1,
  }),
  [QuestionType.MULTIPLE_CHOICE]: Object.freeze({
    letters: Object.freeze(['A', 'B', 'C', 'D', 'E'] as const),
    correctCount: 2,
  }),
});
