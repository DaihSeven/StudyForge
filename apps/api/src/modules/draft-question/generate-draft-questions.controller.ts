import { Body, Controller, HttpException, HttpStatus, Inject, Post, Res } from '@nestjs/common';
import { GenerateDraftQuestionsUseCase, GenerationFailedError } from '@studyforge/import/application';
import { AiUsageLimitExceededError, DraftQuestion } from '@studyforge/import/domain';
import { AI_CONFIG_TOKEN, AiConfig } from '@studyforge/import/infra';
import { createGenerateDraftQuestionsRequestSchema, GenerateDraftQuestionsRequest } from '@studyforge/shared/contracts';
import type { Response } from 'express';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';

const GENERATION_FAILED_MESSAGE =
  'Não foi possível gerar as questões agora. Use a importação manual (JSON ou Markdown).';

function toDraftEvent(draft: DraftQuestion, index: number) {
  return {
    index,
    id: draft.id.value,
    type: draft.type,
    statement: draft.statement,
    alternatives: draft.alternatives.map((a) => ({ letter: a.letter, text: a.text, isCorrect: a.isCorrect })),
  };
}

/**
 * Falha do gerador → código e mensagem seguros. `GenerationFailedError` já traz uma mensagem própria
 * para o mentor (inclusive se a tentativa contou); qualquer outro erro vira uma mensagem genérica.
 */
function toSafeError(error: unknown): { status: HttpStatus; code: string; message: string } {
  if (error instanceof GenerationFailedError) {
    const status = error.code === 'AI_PROVIDER_RATE_LIMITED' ? HttpStatus.TOO_MANY_REQUESTS : HttpStatus.BAD_GATEWAY;
    return { status, code: error.code, message: error.message };
  }
  return { status: HttpStatus.BAD_GATEWAY, code: 'GENERATION_FAILED', message: GENERATION_FAILED_MESSAGE };
}

/**
 * HTTP → use case → eventos SSE. Sem regra de negócio: valida o corpo (Zod), chama o use case e
 * mapeia a saída. Nunca publica: só salva `DraftQuestion` (regra 7 do CLAUDE.md).
 *
 * TEMPORÁRIO até o Marco 3.2 (autenticação): `organizationId` e `mentorId` vêm do corpo, como no
 * `POST /api/draft-questions`. Também não há checagem de papel MENTOR (identity ainda não integrado).
 */
@Controller('draft-questions')
export class GenerateDraftQuestionsController {
  private readonly bodyPipe: ZodValidationPipe<GenerateDraftQuestionsRequest>;

  constructor(
    private readonly generateDraftQuestions: GenerateDraftQuestionsUseCase,
    @Inject(AI_CONFIG_TOKEN) config: AiConfig,
  ) {
    this.bodyPipe = new ZodValidationPipe(createGenerateDraftQuestionsRequestSchema(config.maxInputChars));
  }

  @Post('generate')
  async generate(@Body() body: unknown, @Res() res: Response): Promise<void> {
    const command = this.bodyPipe.transform(body);

    let started = false;
    const send = (event: string, data: unknown) => {
      if (!started) {
        started = true;
        res.status(HttpStatus.OK);
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();
      }
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    let result;
    try {
      result = await this.generateDraftQuestions.execute(command, {
        onDraft: (draft, index) => send('draft', toDraftEvent(draft, index)),
        onRejected: (rejected) => send('rejected', rejected),
      });
    } catch (error) {
      const safe = toSafeError(error);
      if (started) {
        send('error', { code: safe.code, message: safe.message });
        res.end();
        return;
      }
      throw new HttpException({ code: safe.code, message: safe.message }, safe.status);
    }

    if (result.isErr()) {
      const { error } = result;
      const status = error instanceof AiUsageLimitExceededError ? HttpStatus.TOO_MANY_REQUESTS : HttpStatus.BAD_REQUEST;
      throw new HttpException({ code: error.code, message: error.message }, status);
    }

    const { drafts, rejected, usage, notice } = result.value;
    send('done', { draftCount: drafts.length, rejectedCount: rejected.length, usage, ...(notice ? { notice } : {}) });
    res.end();
  }
}
