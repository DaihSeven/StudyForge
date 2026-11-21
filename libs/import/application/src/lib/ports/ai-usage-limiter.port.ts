import { AiUsageLimitExceededError } from '@studyforge/import/domain';
import { EntityId, Result } from '@studyforge/shared/domain';

/**
 * Controla o uso diário da geração por IA (limite por mentor e teto global).
 * `tryConsume` registra uma geração só se ambos os limites permitirem.
 */
export interface AiUsageLimiter {
  tryConsume(mentorId: EntityId): Promise<Result<void, AiUsageLimitExceededError>>;
}

export const AI_USAGE_LIMITER_TOKEN = Symbol('AiUsageLimiter');
