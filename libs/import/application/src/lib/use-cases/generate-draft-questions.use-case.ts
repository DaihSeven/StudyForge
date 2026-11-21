import { Inject, Injectable } from '@nestjs/common';
import { DraftQuestion, InvalidGenerationRequestError } from '@studyforge/import/domain';
import { GeneratedDraftQuestionSchema } from '@studyforge/shared/contracts';
import { DomainError, EntityId, err, ok, OrganizationId, QUESTION_TYPE_RULES, Result } from '@studyforge/shared/domain';
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

const SUPPORTED_ALTERNATIVE_COUNTS = Object.values(QUESTION_TYPE_RULES).map((rules) => rules.letters.length);

/**
 * Gera rascunhos de questões a partir de um texto: cobra o limite de uso, chama o gerador,
 * valida cada item e salva os válidos como `DraftQuestion` (do `organizationId` do comando).
 * Itens inválidos não abortam a geração: voltam em `rejected`. NUNCA publica (CLAUDE.md, regra 7):
 * a publicação é o use case explícito `PublishQuiz`, disparado pelo mentor.
 */
@Injectable()
export class GenerateDraftQuestionsUseCase {
  constructor(
    @Inject(QUESTION_DRAFT_GENERATOR_TOKEN) private readonly generator: QuestionDraftGenerator,
    @Inject(AI_USAGE_LIMITER_TOKEN) private readonly limiter: AiUsageLimiter,
    private readonly createDraftQuestion: CreateDraftQuestionUseCase,
  ) {}

  async execute(command: GenerateDraftQuestionsCommand): Promise<Result<GenerateDraftQuestionsOutput, DomainError>> {
    let mentorId: EntityId;
    try {
      OrganizationId.create(command.organizationId);
      mentorId = EntityId.create(command.mentorId);
    } catch (error) {
      if (error instanceof DomainError) {
        return err(error);
      }
      throw error;
    }

    const invalidRequest = this.checkRequest(command);
    if (invalidRequest) {
      return err(invalidRequest);
    }

    const usage = await this.limiter.tryConsume(mentorId);
    if (usage.isErr()) {
      return err(usage.error);
    }

    const drafts: DraftQuestion[] = [];
    const rejected: RejectedGeneratedDraft[] = [];
    let index = 0;

    const stream = this.generator.generate({
      text: command.text,
      options: { quantity: command.quantity, alternativesPerQuestion: command.alternativesPerQuestion },
    });

    for await (const item of stream) {
      if (index >= command.quantity) {
        break;
      }

      const parsed = GeneratedDraftQuestionSchema.safeParse(item);
      if (!parsed.success) {
        rejected.push({ index, code: 'INVALID_GENERATED_FORMAT', message: parsed.error.message });
      } else {
        const created = await this.createDraftQuestion.execute({ organizationId: command.organizationId, ...parsed.data });
        if (created.isOk()) {
          drafts.push(created.value);
        } else {
          rejected.push({ index, code: created.error.code, message: created.error.message });
        }
      }
      index += 1;
    }

    return ok({ drafts, rejected });
  }

  private checkRequest(command: GenerateDraftQuestionsCommand): InvalidGenerationRequestError | null {
    if (typeof command.text !== 'string' || command.text.trim() === '') {
      return new InvalidGenerationRequestError('EMPTY_TEXT', 'The source text cannot be empty.');
    }
    if (!Number.isInteger(command.quantity) || command.quantity < 1) {
      return new InvalidGenerationRequestError('INVALID_QUANTITY', 'Quantity must be a positive integer.');
    }
    if (!SUPPORTED_ALTERNATIVE_COUNTS.includes(command.alternativesPerQuestion)) {
      return new InvalidGenerationRequestError(
        'INVALID_ALTERNATIVES_PER_QUESTION',
        `Alternatives per question must be one of ${SUPPORTED_ALTERNATIVE_COUNTS.join(', ')}.`,
      );
    }
    return null;
  }
}
