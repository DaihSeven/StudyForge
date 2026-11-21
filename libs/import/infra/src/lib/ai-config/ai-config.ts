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

export function loadAiConfig(env: AiEnv): AiConfig {
  void env;
  throw new Error('loadAiConfig ainda não implementado.');
}

/** Resumo seguro para log: nunca contém a chave. */
export function describeAiConfig(config: AiConfig): string {
  void config;
  throw new Error('describeAiConfig ainda não implementado.');
}
