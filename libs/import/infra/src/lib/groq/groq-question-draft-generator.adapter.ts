import { QuestionDraftGenerationInput, QuestionDraftGenerator } from '@studyforge/import/application';
import { GeneratedDraftQuestion } from '@studyforge/shared/contracts';
import { AiProviderError, MANUAL_IMPORT_HINT } from './ai-provider.error';
import { buildSystemPrompt, buildUserMessage, VALIDATE_TOOL_NAME } from './system-prompt';
import { MAX_CORRECTION_ROUNDS, VALIDAR_QUESTAO_TOOL, ValidarQuestaoTool } from './validar-questao.tool';

export const GROQ_DEFAULT_MODEL = 'openai/gpt-oss-120b';
export const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_TIMEOUT_MS = 60_000;

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface GroqQuestionDraftGeneratorOptions {
  readonly apiKey: string;
  readonly model?: string;
  /** Padrão: `fetch` nativo. Os testes injetam um falso: CI nunca chama o provedor real. */
  readonly fetch?: FetchLike;
  readonly timeoutMs?: number;
}

interface ToolCall {
  id: string;
  function: { name: string; arguments: string };
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

/**
 * Gerador de rascunhos via Groq (API compatível com OpenAI). Faz o ciclo de tool calling com
 * `validar_questao` e devolve os itens do JSON final SEM validá-los: quem chama (o use case)
 * valida cada item e rejeita os inválidos. A chave só vai no cabeçalho; nunca em log nem em erro.
 */
export class GroqQuestionDraftGeneratorAdapter implements QuestionDraftGenerator {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchFn: FetchLike;
  private readonly timeoutMs: number;

  constructor(options: GroqQuestionDraftGeneratorOptions) {
    if (!options.apiKey) {
      throw new Error('GroqQuestionDraftGeneratorAdapter requires an apiKey.');
    }
    this.apiKey = options.apiKey;
    this.model = options.model ?? GROQ_DEFAULT_MODEL;
    this.fetchFn = options.fetch ?? ((url, init) => fetch(url, init));
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async *generate({ text, options }: QuestionDraftGenerationInput): AsyncIterable<GeneratedDraftQuestion> {
    const messages: ChatMessage[] = [
      { role: 'system', content: buildSystemPrompt(options) },
      { role: 'user', content: buildUserMessage(text) },
    ];
    const tool = new ValidarQuestaoTool();
    const maxTurns = options.quantity * (MAX_CORRECTION_ROUNDS + 1) + 2;

    for (let turn = 0; turn < maxTurns; turn++) {
      const message = await this.complete(messages, turn === 0);

      if (!message.tool_calls?.length) {
        yield* this.parseFinalAnswer(message.content, tool.validatedQuestions());
        return;
      }

      messages.push({
        role: 'assistant',
        content: message.content ?? null,
        tool_calls: message.tool_calls,
      });
      for (const call of message.tool_calls) {
        const result =
          call.function?.name === VALIDATE_TOOL_NAME
            ? tool.execute(call.function.arguments)
            : {
                valid: false,
                code: 'UNKNOWN_TOOL',
                message: `Ferramenta desconhecida: ${String(call.function?.name)}.`,
              };
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name: call.function?.name,
          content: JSON.stringify(result),
        });
      }
    }

    throw new AiProviderError(
      'AI_PROVIDER_BAD_RESPONSE',
      `O provedor de IA não concluiu a geração. ${MANUAL_IMPORT_HINT}`,
    );
  }

  /** `firstRequest`: ainda não houve nenhuma resposta do provedor, então falhas transitórias são devolvíveis (cota). */
  private async complete(messages: ChatMessage[], firstRequest: boolean): Promise<ChatMessage> {
    let response: Response;
    try {
      response = await this.fetchFn(GROQ_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        // Sem `response_format`: a Groq não aceita structured outputs junto com tool use.
        body: JSON.stringify({
          model: this.model,
          messages,
          tools: [VALIDAR_QUESTAO_TOOL],
          tool_choice: 'auto',
          parallel_tool_calls: false,
          stream: false,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (name === 'TimeoutError' || name === 'AbortError') {
        throw new AiProviderError(
          'AI_PROVIDER_TIMEOUT',
          `O provedor de IA demorou demais para responder. ${MANUAL_IMPORT_HINT}`,
          firstRequest,
        );
      }
      throw new AiProviderError(
        'AI_PROVIDER_ERROR',
        `Não foi possível falar com o provedor de IA. ${MANUAL_IMPORT_HINT}`,
        firstRequest,
      );
    }

    if (response.status === 429) {
      throw new AiProviderError(
        'AI_PROVIDER_RATE_LIMITED',
        `O provedor de IA atingiu o limite de uso. ${MANUAL_IMPORT_HINT}`,
        firstRequest,
      );
    }
    if (!response.ok) {
      throw new AiProviderError(
        'AI_PROVIDER_ERROR',
        `O provedor de IA respondeu com erro (HTTP ${response.status}). ${MANUAL_IMPORT_HINT}`,
        firstRequest && response.status >= 500,
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = undefined;
    }
    const message = (data as { choices?: { message?: ChatMessage }[] } | undefined)?.choices?.[0]?.message;
    if (typeof message !== 'object' || message === null) {
      throw new AiProviderError(
        'AI_PROVIDER_BAD_RESPONSE',
        `O provedor de IA devolveu uma resposta inesperada. ${MANUAL_IMPORT_HINT}`,
      );
    }
    return message;
  }

  /** Itens do JSON final; se ele não faz parse, usa as questões já validadas pela tool; sem nenhuma, vira um item que falha o schema (será `rejected`). */
  private *parseFinalAnswer(
    content: string | null | undefined,
    validated: unknown[],
  ): Iterable<GeneratedDraftQuestion> {
    const questions = extractQuestions(content);
    if (questions === null && validated.length > 0) {
      // O modelo às vezes quebra o JSON ao reescrevê-lo; as questões já passaram por `validar_questao`.
      yield* validated as GeneratedDraftQuestion[];
      return;
    }
    if (questions === null) {
      yield {
        malformed: 'A resposta do modelo não é um JSON com a lista "questions".',
      } as unknown as GeneratedDraftQuestion;
      return;
    }
    yield* questions as GeneratedDraftQuestion[];
  }
}

function extractQuestions(content: string | null | undefined): unknown[] | null {
  if (typeof content !== 'string') {
    return null;
  }
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(content.trim());
  try {
    const parsed: unknown = JSON.parse(fenced ? fenced[1] : content);
    const questions = (parsed as { questions?: unknown } | null)?.questions;
    return Array.isArray(questions) ? questions : null;
  } catch {
    return null;
  }
}
