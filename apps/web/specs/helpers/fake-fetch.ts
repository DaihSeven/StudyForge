import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from 'node:util';

// O jsdom não expõe TextEncoder/TextDecoder/Response/ReadableStream. Os testes usam fixtures em memória:
// nunca há rede.
Object.assign(globalThis, { TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder });

export interface FakeFetchCall {
  readonly url: string;
  readonly init: RequestInit;
}

export interface FakeFetch {
  readonly fetch: typeof fetch;
  readonly calls: FakeFetchCall[];
}

function readerFor(chunks: readonly string[], failure?: Error) {
  const encoder = new NodeTextEncoder();
  let position = 0;
  return {
    async read(): Promise<{ done: boolean; value?: Uint8Array }> {
      if (position >= chunks.length) {
        if (failure) {
          throw failure;
        }
        return { done: true };
      }
      const value = encoder.encode(chunks[position]);
      position += 1;
      return { done: false, value };
    },
  };
}

/**
 * Resposta 200 cujo corpo entrega os pedaços de texto um a um (como um stream SSE).
 * Com `failure`, a leitura lança esse erro depois do último pedaço (conexão cortada no meio).
 */
export function streamResponse(chunks: readonly string[], failure?: Error) {
  return { ok: true, status: 200, body: { getReader: () => readerFor(chunks, failure) } };
}

/** Resposta de erro HTTP com corpo JSON (ou texto, se `body` for string). */
export function errorResponse(status: number, body: unknown) {
  return {
    ok: false,
    status,
    body: null,
    json: async () => {
      if (typeof body === 'string') {
        throw new SyntaxError('Unexpected token');
      }
      return body;
    },
  };
}

/** `fetch` falso que devolve a resposta dada (ou rejeita, se receber um Error) e registra as chamadas. */
export function fakeFetch(outcome: ReturnType<typeof streamResponse> | ReturnType<typeof errorResponse> | Error): FakeFetch {
  const calls: FakeFetchCall[] = [];
  const impl = async (input: unknown, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    if (outcome instanceof Error) {
      throw outcome;
    }
    return outcome;
  };
  return { fetch: impl as unknown as typeof fetch, calls };
}

/** Monta um bloco SSE no mesmo formato que a API escreve. */
export function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export const sampleDraft = {
  index: 0,
  id: 'draft-1',
  type: 'SINGLE_CHOICE',
  statement: 'Qual serviço da AWS armazena objetos?',
  alternatives: [
    { letter: 'A', text: 'Amazon S3', isCorrect: true },
    { letter: 'B', text: 'Amazon RDS', isCorrect: false },
    { letter: 'C', text: 'Amazon VPC', isCorrect: false },
    { letter: 'D', text: 'Amazon SQS', isCorrect: false },
  ],
};

export const sampleDone = { draftCount: 1, rejectedCount: 0, usage: { mentor: 9, global: 39 } };

/** Stream controlado pelo teste: `push` entrega um pedaço, `end` fecha. Permite observar o estado "gerando". */
export function controlledStream() {
  const encoder = new NodeTextEncoder();
  const queue: Array<{ done: boolean; value?: Uint8Array }> = [];
  let waiting: ((r: { done: boolean; value?: Uint8Array }) => void) | null = null;
  const deliver = (item: { done: boolean; value?: Uint8Array }) => {
    if (waiting) {
      const resolve = waiting;
      waiting = null;
      resolve(item);
    } else {
      queue.push(item);
    }
  };
  return {
    response: {
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: () =>
            new Promise<{ done: boolean; value?: Uint8Array }>((resolve) => {
              const next = queue.shift();
              if (next) {
                resolve(next);
              } else {
                waiting = resolve;
              }
            }),
        }),
      },
    },
    push: (chunk: string) => deliver({ done: false, value: encoder.encode(chunk) }),
    end: () => deliver({ done: true }),
  };
}
