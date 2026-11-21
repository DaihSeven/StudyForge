import {
  Alternative,
  EntityId,
  InvalidEntityIdError,
  InvalidOrganizationIdError,
  OrganizationId,
  QuestionType,
} from '@studyforge/shared/domain';
import { validateDraftQuestionStructure } from './validate-draft-question-structure';

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
    const structure = validateDraftQuestionStructure(props);
    if (structure.isErr()) {
      throw structure.error;
    }

    return Object.freeze(new DraftQuestion(props.id, props.organizationId, props.type, props.statement, Object.freeze(structure.value)));
  }
}
