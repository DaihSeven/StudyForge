import { AlternativeProps, err, isQuestionType, ok, QUESTION_TYPE_RULES, QuestionType, Result } from '@studyforge/shared/domain';
import { InvalidDraftQuestionError } from './draft-question';

export interface DraftQuestionStructure<A extends AlternativeProps = AlternativeProps> {
  readonly type: QuestionType;
  readonly statement: string;
  readonly alternatives: readonly A[];
}

/**
 * Regra "validar_questao": confere se a estrutura de uma questão respeita o seu `QuestionType`
 * (quantidade e letras das alternativas, número de corretas, textos não vazios).
 * Pura: não lança, não tem I/O. Em caso de sucesso devolve as alternativas ordenadas por letra.
 */
export function validateDraftQuestionStructure<A extends AlternativeProps>(
  candidate: DraftQuestionStructure<A>,
): Result<readonly A[], InvalidDraftQuestionError> {
  if (!isQuestionType(candidate.type)) {
    return err(new InvalidDraftQuestionError('INVALID_QUESTION_TYPE', `Unknown question type "${String(candidate.type)}".`));
  }

  const rules = QUESTION_TYPE_RULES[candidate.type];

  if (candidate.alternatives.length !== rules.letters.length) {
    return err(
      new InvalidDraftQuestionError(
        'INVALID_ALTERNATIVE_COUNT',
        `${candidate.type} requires ${rules.letters.length} alternatives, got ${candidate.alternatives.length}.`,
      ),
    );
  }

  const sorted = [...candidate.alternatives].sort((a, b) => (a.letter < b.letter ? -1 : a.letter > b.letter ? 1 : 0));

  if (sorted.some((alternative, index) => alternative.letter !== rules.letters[index])) {
    return err(
      new InvalidDraftQuestionError(
        'INVALID_ALTERNATIVE_LETTERS',
        `${candidate.type} requires alternatives ${rules.letters.join(', ')}, got ${sorted.map((a) => a.letter).join(', ')}.`,
      ),
    );
  }

  const correctCount = sorted.filter((alternative) => alternative.isCorrect).length;
  if (correctCount !== rules.correctCount) {
    return err(
      new InvalidDraftQuestionError(
        'INVALID_CORRECT_COUNT',
        `${candidate.type} requires exactly ${rules.correctCount} correct alternative(s), got ${correctCount}.`,
      ),
    );
  }

  if (typeof candidate.statement !== 'string' || candidate.statement.trim() === '') {
    return err(new InvalidDraftQuestionError('EMPTY_STATEMENT', 'Statement cannot be empty.'));
  }

  const emptyText = sorted.find((alternative) => typeof alternative.text !== 'string' || alternative.text.trim() === '');
  if (emptyText) {
    return err(new InvalidDraftQuestionError('EMPTY_ALTERNATIVE_TEXT', `Alternative ${emptyText.letter} text cannot be empty.`));
  }

  return ok(sorted);
}
