import {
  Alternative,
  DomainError,
  InvalidOrganizationIdError,
  isQuestionType,
  OrganizationId,
  QUESTION_TYPE_RULES,
  QuestionType,
} from '@studyforge/shared/domain';

export type InvalidDraftQuestionCode =
  | 'INVALID_QUESTION_TYPE'
  | 'INVALID_ALTERNATIVE_COUNT'
  | 'INVALID_ALTERNATIVE_LETTERS'
  | 'INVALID_CORRECT_COUNT';

export class InvalidDraftQuestionError extends DomainError<InvalidDraftQuestionCode> {
  constructor(code: InvalidDraftQuestionCode, message: string) {
    super(code, message);
  }
}

export interface DraftQuestionProps {
  readonly organizationId: OrganizationId;
  readonly type: QuestionType;
  readonly statement: string;
  readonly alternatives: readonly Alternative[];
}

/**
 * Questão extraída de material importado, aguardando revisão do mentor.
 * Só existe em estado estruturalmente válido para o seu `QuestionType`.
 */
export class DraftQuestion {
  private constructor(
    readonly organizationId: OrganizationId,
    readonly type: QuestionType,
    readonly statement: string,
    readonly alternatives: readonly Alternative[],
  ) {}

  static create(props: DraftQuestionProps): DraftQuestion {
    if (!(props.organizationId instanceof OrganizationId)) {
      throw new InvalidOrganizationIdError();
    }
    if (!isQuestionType(props.type)) {
      throw new InvalidDraftQuestionError('INVALID_QUESTION_TYPE', `Unknown question type "${String(props.type)}".`);
    }

    const rules = QUESTION_TYPE_RULES[props.type];

    if (props.alternatives.length !== rules.letters.length) {
      throw new InvalidDraftQuestionError(
        'INVALID_ALTERNATIVE_COUNT',
        `${props.type} requires ${rules.letters.length} alternatives, got ${props.alternatives.length}.`,
      );
    }

    const sorted = [...props.alternatives].sort((a, b) => (a.letter < b.letter ? -1 : a.letter > b.letter ? 1 : 0));

    if (sorted.some((alternative, index) => alternative.letter !== rules.letters[index])) {
      throw new InvalidDraftQuestionError(
        'INVALID_ALTERNATIVE_LETTERS',
        `${props.type} requires alternatives ${rules.letters.join(', ')}, got ${sorted.map((a) => a.letter).join(', ')}.`,
      );
    }

    const correctCount = sorted.filter((alternative) => alternative.isCorrect).length;
    if (correctCount !== rules.correctCount) {
      throw new InvalidDraftQuestionError(
        'INVALID_CORRECT_COUNT',
        `${props.type} requires exactly ${rules.correctCount} correct alternative(s), got ${correctCount}.`,
      );
    }

    return Object.freeze(new DraftQuestion(props.organizationId, props.type, props.statement, Object.freeze(sorted)));
  }
}
