import { AiUsageLimiter, Clock } from '@studyforge/import/application';
import { AiUsageLimitExceededError } from '@studyforge/import/domain';
import { EntityId, Result } from '@studyforge/shared/domain';

export interface InMemoryAiUsageLimiterOptions {
  readonly clock: Clock;
  readonly dailyLimitGlobal: number;
  /** Padrão: 10 (ADR-010). */
  readonly dailyLimitPerMentor?: number;
}

/** Stub (RED): o comportamento real vem no commit green. */
export class InMemoryAiUsageLimiterAdapter implements AiUsageLimiter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub
  constructor(_options: InMemoryAiUsageLimiterOptions) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub
  async tryConsume(_mentorId: EntityId): Promise<Result<void, AiUsageLimitExceededError>> {
    throw new Error('InMemoryAiUsageLimiterAdapter ainda não implementado.');
  }
}
