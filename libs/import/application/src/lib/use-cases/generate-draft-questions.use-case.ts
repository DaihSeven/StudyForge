import { Inject, Injectable } from '@nestjs/common';
import { DraftQuestion } from '@studyforge/import/domain';
import { DomainError, Result } from '@studyforge/shared/domain';
import { AI_USAGE_LIMITER_TOKEN, AiUsageLimiter } from '../ports/ai-usage-limiter.port';
import { QUESTION_DRAFT_GENERATOR_TOKEN, QuestionDraftGenerator } from '../ports/question-draft-generator.port';
import { CreateDraftQuestionUseCase } from './create-draft-question.use-case';

export interface GenerateDraftQuestionsCommand {
  readonly organizationId: string;
  readonly mentorId: string;
  readonly text: string;
  readonly quantity: number;
  readonly alternativesPerQuestion: number;
}

export interface RejectedGeneratedDraft {
  /** Posição (a partir de 0) do item na saída do gerador. */
  readonly index: number;
  readonly code: string;
  readonly message: string;
}

export interface GenerateDraftQuestionsOutput {
  readonly drafts: readonly DraftQuestion[];
  readonly rejected: readonly RejectedGeneratedDraft[];
}

/** Stub (RED): o comportamento real vem no commit green. */
@Injectable()
export class GenerateDraftQuestionsUseCase {
  constructor(
    @Inject(QUESTION_DRAFT_GENERATOR_TOKEN) private readonly generator: QuestionDraftGenerator,
    @Inject(AI_USAGE_LIMITER_TOKEN) private readonly limiter: AiUsageLimiter,
    private readonly createDraftQuestion: CreateDraftQuestionUseCase,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub
  async execute(_command: GenerateDraftQuestionsCommand): Promise<Result<GenerateDraftQuestionsOutput, DomainError>> {
    throw new Error('GenerateDraftQuestionsUseCase ainda não implementado.');
  }
}
