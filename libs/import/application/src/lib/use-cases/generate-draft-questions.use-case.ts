import { Inject, Injectable } from '@nestjs/common';
import { DraftQuestion, InvalidGenerationRequestError } from '@studyforge/import/domain';
import { GeneratedDraftQuestionSchema, MAX_GENERATION_QUANTITY } from '@studyforge/shared/contracts';
import { DomainError, EntityId, err, ok, OrganizationId, QUESTION_TYPE_RULES, Result } from '@studyforge/shared/domain';
import { AI_USAGE_LIMITER_TOKEN, AiUsageLimiter, AiUsageRemaining } from '../ports/ai-usage-limiter.port';
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
  /** Uso restante do mentor e da plataforma, depois de cobrar esta geração. */
  readonly usage: AiUsageRemaining;
  /** Presente quando nenhum item foi aproveitado: explica ao mentor que a tentativa contou. */
  readonly notice?: string;
}

/** Chamado a cada item assim que ele é processado, para quem quiser transmitir (streaming) o andamento. */
export interface GenerationListener {
  onDraft?(draft: DraftQuestion, index: number): void | Promise<void>;
  onRejected?(rejected: RejectedGeneratedDraft): void | Promise<void>;
}

const ALL_REJECTED_NOTICE =
  'Nenhuma questão gerada passou na validação. Esta tentativa contou no seu limite diário e não é devolvida. Tente de novo com um texto mais claro ou use a importação manual (JSON ou Markdown).';

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

  async execute(
    command: GenerateDraftQuestionsCommand,
    listener: GenerationListener = {},
  ): Promise<Result<GenerateDraftQuestionsOutput, DomainError>> {
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

      const outcome = await this.saveGenerated(command.organizationId, item);
      if (outcome.isOk()) {
        drafts.push(outcome.value);
        await listener.onDraft?.(outcome.value, index);
      } else {
        const rejection = { index, ...outcome.error };
        rejected.push(rejection);
        await listener.onRejected?.(rejection);
      }
      index += 1;
    }

    const usageLeft = await this.limiter.remaining(mentorId);
    return ok({ drafts, rejected, usage: usageLeft, ...(drafts.length === 0 && rejected.length > 0 ? { notice: ALL_REJECTED_NOTICE } : {}) });
  }

  /** Valida o formato (schema) e a regra do domínio de um item gerado e, se válido, salva o rascunho. */
  private async saveGenerated(
    organizationId: string,
    item: unknown,
  ): Promise<Result<DraftQuestion, { readonly code: string; readonly message: string }>> {
    const parsed = GeneratedDraftQuestionSchema.safeParse(item);
    if (!parsed.success) {
      return err({ code: 'INVALID_GENERATED_FORMAT', message: parsed.error.message });
    }
    const created = await this.createDraftQuestion.execute({ organizationId, ...parsed.data });
    return created.mapErr((error) => ({ code: error.code, message: error.message }));
  }

  private checkRequest(command: GenerateDraftQuestionsCommand): InvalidGenerationRequestError | null {
    if (typeof command.text !== 'string' || command.text.trim() === '') {
      return new InvalidGenerationRequestError('EMPTY_TEXT', 'The source text cannot be empty.');
    }
    if (!Number.isInteger(command.quantity) || command.quantity < 1 || command.quantity > MAX_GENERATION_QUANTITY) {
      return new InvalidGenerationRequestError(
        'INVALID_QUANTITY',
        `Quantity must be an integer from 1 to ${MAX_GENERATION_QUANTITY}.`,
      );
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
