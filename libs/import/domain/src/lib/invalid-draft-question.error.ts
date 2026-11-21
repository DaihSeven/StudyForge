import { DomainError } from '@studyforge/shared/domain';

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
