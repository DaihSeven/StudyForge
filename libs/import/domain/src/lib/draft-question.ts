import {
  Alternative,
  DomainError,
  EntityId,
  InvalidEntityIdError,
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
  | 'INVALID_CORRECT_COUNT'
  | 'EMPTY_STATEMENT'
  | 'EMPTY_ALTERNATIVE_TEXT';

export class InvalidDraftQuestionError extends DomainError<InvalidDraftQuestionCode> {
  constructor(code: InvalidDraftQuestionCode, message: string) {
    super(code, message);
  }
}

export interface DraftQuestionProps {
  readonly id: EntityId;
  readonly organizationId: OrganizationId;
  readonly type: QuestionType;
  readonly statement: string;
  readonly alternatives: readonly Alternative[];
}

/**
 * Questão extraída de material importado, aguardando revisão do mentor.
 * Só existe em estado estruturalmente válido para o seu `QuestionType`.
 * O `id` vem de fora (gerado por um port fora do domínio, ou lido da persistência).
 */
export class DraftQuestion {
  private constructor(
    readonly id: EntityId,
    readonly organizationId: OrganizationId,
    readonly type: QuestionType,
    readonly statement: string,
    readonly alternatives: readonly Alternative[],
  ) {}

  static create(props: DraftQuestionProps): DraftQuestion {
    if (!(props.id instanceof EntityId)) {
      throw new InvalidEntityIdError();
    }
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

    if (typeof props.statement !== 'string' || props.statement.trim() === '') {
      throw new InvalidDraftQuestionError('EMPTY_STATEMENT', 'Statement cannot be empty.');
    }

    const emptyText = sorted.find((alternative) => alternative.text.trim() === '');
    if (emptyText) {
      throw new InvalidDraftQuestionError(
        'EMPTY_ALTERNATIVE_TEXT',
        `Alternative ${emptyText.letter} text cannot be empty.`,
      );
    }

    return Object.freeze(new DraftQuestion(props.id, props.organizationId, props.type, props.statement, Object.freeze(sorted)));
  }
}
