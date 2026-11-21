import type { GenerateDraftQuestionsRequest, GenerationEvent } from '@studyforge/shared/contracts';

/** Rota relativa: o `next.config.js` repassa para a API (rewrites), então não há CORS. */
export const GENERATE_ENDPOINT = '/api/draft-questions/generate';

export interface StreamGenerationOptions {
  readonly request: GenerateDraftQuestionsRequest;
  /** Chamado a cada evento válido. Termina sempre com `done` ou `error`, salvo se abortado. */
  readonly onEvent: (event: GenerationEvent) => void;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

/**
 * POST + leitura do stream SSE (EventSource não serve: só faz GET). Valida cada evento com Zod
 * (`parseGenerationEvent`); falhas de HTTP e de rede viram um evento `error` com mensagem para o mentor.
 */
export async function streamGeneration(_options: StreamGenerationOptions): Promise<void> {
  throw new Error('streamGeneration ainda não implementado.');
}
