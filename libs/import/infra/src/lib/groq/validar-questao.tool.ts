import { validateDraftQuestionStructure } from '@studyforge/import/domain';
import { GeneratedDraftQuestionSchema } from '@studyforge/shared/contracts';
import { ALTERNATIVE_LETTERS, QuestionType } from '@studyforge/shared/domain';
import { VALIDATE_TOOL_NAME } from './system-prompt';

/** Máximo de rodadas de correção por questão (decisão do PR 2). */
export const MAX_CORRECTION_ROUNDS = 2;

export interface ToolResult {
  readonly valid: boolean;
  readonly code?: string;
  readonly message?: string;
  readonly correctionLimitReached?: boolean;
}

/** Definição da tool no formato OpenAI/Groq (`tools`). */
export const VALIDAR_QUESTAO_TOOL = {
  type: 'function',
  function: {
    name: VALIDATE_TOOL_NAME,
    description:
      'Valida a estrutura de uma questão (tipo, letras e número de alternativas, número de corretas, textos não vazios). Chame para cada questão antes da resposta final.',
    parameters: {
      type: 'object',
      properties: {
        question_number: {
          type: 'integer',
          description: 'Número da questão (1, 2, ...), o mesmo a cada nova tentativa da mesma questão.',
        },
        question: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: Object.values(QuestionType) },
            statement: { type: 'string' },
            alternatives: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  letter: { type: 'string', enum: [...ALTERNATIVE_LETTERS] },
                  text: { type: 'string' },
                  isCorrect: { type: 'boolean' },
                },
                required: ['letter', 'text', 'isCorrect'],
              },
            },
          },
          required: ['type', 'statement', 'alternatives'],
        },
      },
      required: ['question_number', 'question'],
    },
  },
} as const;

const LIMIT_MESSAGE = ' Limite de correções desta questão atingido: não tente corrigi-la de novo; siga para a próxima.';

/**
 * Executa `validar_questao` localmente (função pura do domínio + schema do contrato).
 * Conta as falhas por número de questão para respeitar o máximo de 2 rodadas de correção.
 */
export class ValidarQuestaoTool {
  private readonly failures = new Map<number, number>();
  private calls = 0;

  execute(rawArguments: string): ToolResult {
    this.calls += 1;

    let args: unknown;
    try {
      args = JSON.parse(rawArguments);
    } catch {
      return {
        valid: false,
        code: 'INVALID_TOOL_ARGUMENTS',
        message: 'Os argumentos da ferramenta não são um JSON válido.',
      };
    }
    const record = typeof args === 'object' && args !== null ? (args as Record<string, unknown>) : {};
    const questionNumber = Number.isInteger(record['question_number'])
      ? (record['question_number'] as number)
      : this.calls;

    const failure = this.check(record['question']);
    if (!failure) {
      return { valid: true };
    }

    const failures = (this.failures.get(questionNumber) ?? 0) + 1;
    this.failures.set(questionNumber, failures);
    if (failures > MAX_CORRECTION_ROUNDS) {
      return {
        valid: false,
        ...failure,
        message: failure.message + LIMIT_MESSAGE,
        correctionLimitReached: true,
      };
    }
    return { valid: false, ...failure };
  }

  private check(question: unknown): { code: string; message: string } | null {
    const parsed = GeneratedDraftQuestionSchema.safeParse(question);
    if (!parsed.success) {
      return {
        code: 'INVALID_GENERATED_FORMAT',
        message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      };
    }
    const result = validateDraftQuestionStructure(parsed.data);
    return result.isErr() ? { code: result.error.code, message: result.error.message } : null;
  }
}
