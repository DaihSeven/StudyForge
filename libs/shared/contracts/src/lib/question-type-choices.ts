import { QUESTION_TYPE_RULES, type QuestionType } from '@studyforge/shared/domain';

/** Um tipo de questão como opção de formulário: quantas alternativas e quantas corretas. */
export interface QuestionTypeChoice {
  readonly type: QuestionType;
  readonly alternativesPerQuestion: number;
  readonly correctCount: number;
}

/**
 * Opções de tipo de questão derivadas de `QUESTION_TYPE_RULES` (sem repetir os números), para o `web`
 * montar o campo "Tipo de questão" sem importar o domínio. Só dados, nenhuma regra.
 */
export const QUESTION_TYPE_CHOICES: readonly QuestionTypeChoice[] = (
  Object.keys(QUESTION_TYPE_RULES) as QuestionType[]
).map((type) => ({
  type,
  alternativesPerQuestion: QUESTION_TYPE_RULES[type].letters.length,
  correctCount: QUESTION_TYPE_RULES[type].correctCount,
}));
