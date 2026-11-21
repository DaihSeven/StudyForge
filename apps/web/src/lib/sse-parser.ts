export interface SseMessage {
  /** Nome do evento (`event:`); "message" quando o bloco não informa. */
  readonly event: string;
  /** Linhas `data:` unidas por "\n". */
  readonly data: string;
}

export interface SseParseResult {
  readonly messages: readonly SseMessage[];
  /** Texto de um bloco ainda incompleto: deve ser prefixado ao próximo pedaço recebido. */
  readonly remainder: string;
}

/**
 * Parser SSE puro: recebe o texto acumulado e devolve os blocos completos (terminados por linha
 * em branco) e o que sobrou. Sem I/O e sem estado: quem lê o stream guarda o `remainder`.
 */
export function parseSseBuffer(_buffer: string): SseParseResult {
  throw new Error('parseSseBuffer ainda não implementado.');
}
