import { Inject, Injectable } from '@nestjs/common';
import { DraftQuestion } from '@studyforge/import/domain';
import { CreateDraftQuestionCommand } from '@studyforge/shared/contracts';
import { Alternative, DomainError, EntityId, err, ok, OrganizationId, Result } from '@studyforge/shared/domain';
import { DRAFT_QUESTION_REPOSITORY_TOKEN, DraftQuestionRepository } from '../ports/draft-question.repository';
import { ID_GENERATOR_TOKEN, IdGenerator } from '../ports/id-generator.port';

/**
 * Cria e persiste uma `DraftQuestion`. Entrada inválida para o domínio vira `Err`
 * com o `DomainError`; falhas inesperadas (id gerado inválido, persistência) são relançadas.
 */
@Injectable()
export class CreateDraftQuestionUseCase {
  constructor(
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGenerator,
    @Inject(DRAFT_QUESTION_REPOSITORY_TOKEN) private readonly repository: DraftQuestionRepository,
  ) {}

  async execute(command: CreateDraftQuestionCommand): Promise<Result<DraftQuestion, DomainError>> {
    const id = EntityId.create(this.idGenerator.generate());

    let draft: DraftQuestion;
    try {
      draft = DraftQuestion.create({
        id,
        organizationId: OrganizationId.create(command.organizationId),
        type: command.type,
        statement: command.statement,
        alternatives: command.alternatives.map((alternative) => Alternative.create(alternative)),
      });
    } catch (error) {
      if (error instanceof DomainError) {
        return err(error);
      }
      throw error;
    }

    await this.repository.save(draft);
    return ok(draft);
  }
}
