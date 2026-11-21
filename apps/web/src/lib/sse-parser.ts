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
/** Valor de uma linha `campo: valor`; o campo precisa casar exato e um único espaço após ":" é descartado. */
function fieldValue(line: string, field: string): string | null {
  const prefix = `${field}:`;
  return line.startsWith(prefix) ? line.slice(prefix.length).replace(/^ /, '') : null;
}

export function parseSseBuffer(buffer: string): SseParseResult {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const blocks = normalized.split('\n\n');
  const remainder = blocks.pop() ?? '';

  const messages: SseMessage[] = [];
  for (const block of blocks) {
    let event = 'message';
    const data: string[] = [];
    for (const line of block.split('\n')) {
      const eventName = fieldValue(line, 'event');
      const dataLine = fieldValue(line, 'data');
      if (eventName !== null) {
        event = eventName;
      } else if (dataLine !== null) {
        data.push(dataLine);
      }
    }
    if (data.length > 0) {
      messages.push({ event, data: data.join('\n') });
    }
  }

  return { messages, remainder };
}
