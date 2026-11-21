import { DomainError } from '@studyforge/shared/domain';

export type AiUsageLimitExceededCode = 'AI_MENTOR_DAILY_LIMIT_EXCEEDED' | 'AI_GLOBAL_DAILY_LIMIT_EXCEEDED';

const MANUAL_IMPORT_HINT = 'Use a importação manual (JSON ou Markdown) para continuar.';

/** Limite diário de uso da geração por IA atingido. A mensagem orienta o mentor à importação manual. */
export class AiUsageLimitExceededError extends DomainError<AiUsageLimitExceededCode> {
  private constructor(code: AiUsageLimitExceededCode, message: string) {
    super(code, message);
  }

  static forMentor(limit: number): AiUsageLimitExceededError {
    return new AiUsageLimitExceededError(
      'AI_MENTOR_DAILY_LIMIT_EXCEEDED',
      `Você atingiu o limite de ${limit} gerações por IA hoje. ${MANUAL_IMPORT_HINT}`,
    );
  }

  static forGlobal(limit: number): AiUsageLimitExceededError {
    return new AiUsageLimitExceededError(
      'AI_GLOBAL_DAILY_LIMIT_EXCEEDED',
      `O limite diário de ${limit} gerações por IA da plataforma foi atingido. ${MANUAL_IMPORT_HINT}`,
    );
  }
}
