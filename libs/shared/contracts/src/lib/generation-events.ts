import { ALTERNATIVE_LETTERS, QuestionType } from '@studyforge/shared/domain';
import { z } from 'zod';

/**
 * Forma dos eventos SSE de POST /api/draft-questions/generate e do corpo de erro HTTP.
 * Só formato (sem regra de negócio): quem produz é a API, quem consome é o `web`.
 */
export const DraftEventSchema = z.object({
  index: z.number().int().min(0),
  id: z.string(),
  type: z.enum(QuestionType),
  statement: z.string(),
  alternatives: z.array(
    z.object({
      letter: z.enum(ALTERNATIVE_LETTERS),
      text: z.string(),
      isCorrect: z.boolean(),
    }),
  ),
});

export const RejectedEventSchema = z.object({
  index: z.number().int().min(0),
  code: z.string(),
  message: z.string(),
});

export const DoneEventSchema = z.object({
  draftCount: z.number().int().min(0),
  rejectedCount: z.number().int().min(0),
  usage: z.object({ mentor: z.number().int().min(0), global: z.number().int().min(0) }),
  notice: z.string().optional(),
});

/** Evento `error` do stream e corpo JSON de respostas HTTP de erro (400, 429, 502). */
export const GenerationErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type DraftEvent = z.infer<typeof DraftEventSchema>;
export type RejectedEvent = z.infer<typeof RejectedEventSchema>;
export type DoneEvent = z.infer<typeof DoneEventSchema>;
export type GenerationError = z.infer<typeof GenerationErrorSchema>;

export type GenerationEvent =
  | { readonly event: 'draft'; readonly data: DraftEvent }
  | { readonly event: 'rejected'; readonly data: RejectedEvent }
  | { readonly event: 'done'; readonly data: DoneEvent }
  | { readonly event: 'error'; readonly data: GenerationError };

/**
 * Valida o par (nome do evento, JSON já decodificado). Devolve `null` se o nome for desconhecido
 * ou o dado não tiver a forma esperada.
 */
export function parseGenerationEvent(_event: string, _data: unknown): GenerationEvent | null {
  throw new Error('parseGenerationEvent ainda não implementado.');
}
