import {
  GenerationErrorSchema,
  parseGenerationEvent,
  type GenerateDraftQuestionsRequest,
  type GenerationEvent,
} from '@studyforge/shared/contracts';
import { parseSseBuffer } from './sse-parser';

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
export async function streamGeneration(options: StreamGenerationOptions): Promise<void> {
  const { request, onEvent, signal } = options;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);

  const fail = (code: string, message: string) => onEvent({ event: 'error', data: { code, message } });

  let response: Response;
  try {
    response = await fetchImpl(GENERATE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(request),
      signal,
    });
  } catch (error) {
    if (isAbort(error, signal)) {
      return;
    }
    fail(
      'NETWORK_ERROR',
      'Não foi possível conectar ao servidor. Verifique a conexão e tente de novo; não foi possível confirmar se a tentativa contou no limite diário.',
    );
    return;
  }

  if (!response.ok) {
    const parsed = GenerationErrorSchema.safeParse(await readJson(response));
    if (parsed.success) {
      onEvent({ event: 'error', data: parsed.data });
    } else {
      fail(`HTTP_${response.status}`, `O servidor respondeu com erro (HTTP ${response.status}). Tente de novo mais tarde.`);
    }
    return;
  }

  if (!response.body) {
    fail('STREAM_INTERRUPTED', INTERRUPTED_MESSAGE);
    return;
  }

  let finished = false;
  const emit = (event: GenerationEvent) => {
    finished = finished || event.event === 'done' || event.event === 'error';
    onEvent(event);
  };

  try {
    await readEvents(response.body.getReader(), emit);
  } catch (error) {
    if (isAbort(error, signal)) {
      return;
    }
    fail('STREAM_INTERRUPTED', INTERRUPTED_MESSAGE);
    return;
  }

  if (!finished) {
    fail('STREAM_INTERRUPTED', INTERRUPTED_MESSAGE);
  }
}

const INTERRUPTED_MESSAGE =
  'A conexão foi interrompida antes do fim da geração. Os rascunhos já recebidos continuam na tela; não foi possível confirmar se a tentativa contou no limite diário.';

function isAbort(error: unknown, signal?: AbortSignal): boolean {
  return signal?.aborted === true || (error instanceof Error && error.name === 'AbortError');
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function readEvents(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  emit: (event: GenerationEvent) => void,
): Promise<void> {
  const decoder = new TextDecoder();
  let pending = '';

  const dispatch = (messages: ReturnType<typeof parseSseBuffer>['messages']) => {
    for (const message of messages) {
      const event = decodeEvent(message.event, message.data);
      if (event) {
        emit(event);
      }
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    const parsed = parseSseBuffer(pending + decoder.decode(value, { stream: true }));
    pending = parsed.remainder;
    dispatch(parsed.messages);
  }

  // Último bloco sem a linha em branco final.
  dispatch(parseSseBuffer(pending + decoder.decode() + '\n\n').messages);
}

function decodeEvent(name: string, data: string): GenerationEvent | null {
  try {
    return parseGenerationEvent(name, JSON.parse(data));
  } catch {
    return null;
  }
}
