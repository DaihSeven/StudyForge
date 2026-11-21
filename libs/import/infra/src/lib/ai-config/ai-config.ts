import { z } from 'zod';

export const AI_CONFIG_TOKEN = Symbol('AiConfig');

export type AiProviderName = 'mock' | 'groq' | 'google';

export interface AiConfig {
  readonly provider: AiProviderName;
  readonly model?: string;
  /** Chave do provedor escolhido. Nunca logar nem devolver. */
  readonly apiKey?: string;
  readonly maxInputChars: number;
  readonly dailyLimitPerMentor: number;
  readonly dailyLimitGlobal: number;
}

export type AiEnv = Readonly<Record<string, string | undefined>>;

export class AiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiConfigError';
  }
}

/** Teto global padrão (gerações/dia), abaixo da cota gratuita da Groq; reconferir no console do provedor. */
export const DEFAULT_DAILY_LIMIT_GLOBAL = 100;

const optionalText = z.preprocess((value) => (value === '' ? undefined : value), z.string().optional());
const positiveInt = (fallback: number) =>
  z.preprocess(
    (value) => (value === undefined || value === '' ? fallback : Number(value)),
    z.number().int().min(1),
  );

const EnvSchema = z.object({
  AI_PROVIDER: z.preprocess((value) => (value === '' ? undefined : value), z.enum(['mock', 'groq', 'google']).default('mock')),
  AI_MODEL: optionalText,
  GROQ_API_KEY: optionalText,
  GOOGLE_GENERATIVE_AI_API_KEY: optionalText,
  AI_MAX_INPUT_CHARS: positiveInt(8000),
  AI_DAILY_LIMIT_PER_MENTOR: positiveInt(10),
  AI_DAILY_LIMIT_GLOBAL: positiveInt(DEFAULT_DAILY_LIMIT_GLOBAL),
});

const KEY_VARIABLE = { groq: 'GROQ_API_KEY', google: 'GOOGLE_GENERATIVE_AI_API_KEY' } as const;

/**
 * Lê e valida a configuração de IA. Sem a chave do provedor escolhido lança `AiConfigError`
 * (nunca cai em outro provedor). As mensagens citam só o nome da variável, nunca o valor.
 */
export function loadAiConfig(env: AiEnv): AiConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))];
    throw new AiConfigError(`Invalid AI configuration: check ${names.join(', ')}.`);
  }
  const values = parsed.data;
  const keyVariable = values.AI_PROVIDER === 'mock' ? undefined : KEY_VARIABLE[values.AI_PROVIDER];
  const apiKey = keyVariable ? values[keyVariable] : undefined;
  if (keyVariable && !apiKey) {
    throw new AiConfigError(`AI_PROVIDER=${values.AI_PROVIDER} requires ${keyVariable}. Set it or use AI_PROVIDER=mock.`);
  }
  return {
    provider: values.AI_PROVIDER,
    ...(values.AI_MODEL ? { model: values.AI_MODEL } : {}),
    ...(apiKey ? { apiKey } : {}),
    maxInputChars: values.AI_MAX_INPUT_CHARS,
    dailyLimitPerMentor: values.AI_DAILY_LIMIT_PER_MENTOR,
    dailyLimitGlobal: values.AI_DAILY_LIMIT_GLOBAL,
  };
}

/** Resumo seguro para log: nunca contém a chave. */
export function describeAiConfig(config: AiConfig): string {
  return [
    `provider=${config.provider}`,
    `model=${config.model ?? 'default'}`,
    `maxInputChars=${config.maxInputChars}`,
    `dailyLimitPerMentor=${config.dailyLimitPerMentor}`,
    `dailyLimitGlobal=${config.dailyLimitGlobal}`,
    `apiKey=${config.apiKey ? '[set]' : '[none]'}`,
  ].join(' ');
}
