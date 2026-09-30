import { DraftQuestion } from '@studyforge/import/domain';

/** Persistência de `DraftQuestion`. A implementação (Prisma) fica na infra. */
export interface DraftQuestionRepository {
  save(draft: DraftQuestion): Promise<void>;
}

export const DRAFT_QUESTION_REPOSITORY_TOKEN = Symbol('DraftQuestionRepository');
