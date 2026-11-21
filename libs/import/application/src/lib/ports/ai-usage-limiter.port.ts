import { AiUsageLimitExceededError } from '@studyforge/import/domain';
import { EntityId, Result } from '@studyforge/shared/domain';

/** Quanto ainda pode ser gerado hoje: pelo mentor e no teto global da plataforma. */
export interface AiUsageRemaining {
  readonly mentor: number;
  readonly global: number;
}

/**
 * Controla o uso diário da geração por IA (limite por mentor e teto global).
 * `tryConsume` registra uma geração só se ambos os limites permitirem.
 */
export interface AiUsageLimiter {
  tryConsume(mentorId: EntityId): Promise<Result<void, AiUsageLimitExceededError>>;
  /** Gerações que ainda restam hoje (nunca negativo). */
  remaining(mentorId: EntityId): Promise<AiUsageRemaining>;
}

export const AI_USAGE_LIMITER_TOKEN = Symbol('AiUsageLimiter');
