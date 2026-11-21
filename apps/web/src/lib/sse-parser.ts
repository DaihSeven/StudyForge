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
export function parseSseBuffer(buffer: string): SseParseResult {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const blocks = normalized.split('\n\n');
  const remainder = blocks.pop() ?? '';

  const messages: SseMessage[] = [];
  for (const block of blocks) {
    let event = 'message';
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) {
        event = line.slice('event:'.length).trimStart();
      } else if (line.startsWith('data:')) {
        data.push(line.slice('data:'.length).replace(/^ /, ''));
      }
    }
    if (data.length > 0) {
      messages.push({ event, data: data.join('\n') });
    }
  }

  return { messages, remainder };
}
