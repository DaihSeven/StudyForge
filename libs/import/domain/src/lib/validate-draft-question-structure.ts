import { AlternativeProps, QuestionType } from '@studyforge/shared/domain';
import { Result } from '@studyforge/shared/domain';
import { InvalidDraftQuestionError } from './draft-question';

export interface DraftQuestionStructure<A extends AlternativeProps = AlternativeProps> {
  readonly type: QuestionType;
  readonly statement: string;
  readonly alternatives: readonly A[];
}

/** Stub (RED): a regra real vem no commit green. */
export function validateDraftQuestionStructure<A extends AlternativeProps>(
  _candidate: DraftQuestionStructure<A>,
): Result<readonly A[], InvalidDraftQuestionError> {
  throw new Error('validateDraftQuestionStructure ainda não implementado.');
}
