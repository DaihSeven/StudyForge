import { AiUsageLimiter, AiUsageRemaining, Clock } from '@studyforge/import/application';
import { AiUsageLimitExceededError } from '@studyforge/import/domain';
import { EntityId, err, ok, Result } from '@studyforge/shared/domain';

export const DEFAULT_DAILY_LIMIT_PER_MENTOR = 10;

export interface InMemoryAiUsageLimiterOptions {
  readonly clock: Clock;
  readonly dailyLimitGlobal: number;
  /** Padrão: 10 (ADR-010). */
  readonly dailyLimitPerMentor?: number;
}

function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer, got ${String(value)}.`);
  }
}

/**
 * `AiUsageLimiter` com contadores em memória (ADR-010). Zera a cada reinício e não é
 * compartilhado entre instâncias, então o limite é aproximado. Os limites chegam por construtor;
 * a leitura de variáveis de ambiente fica fora desta classe.
 */
export class InMemoryAiUsageLimiterAdapter implements AiUsageLimiter {
  private readonly clock: Clock;
  private readonly dailyLimitGlobal: number;
  private readonly dailyLimitPerMentor: number;
  private day: string;
  private globalCount = 0;
  private readonly perMentorCount = new Map<string, number>();

  constructor(options: InMemoryAiUsageLimiterOptions) {
    this.dailyLimitGlobal = options.dailyLimitGlobal;
    this.dailyLimitPerMentor = options.dailyLimitPerMentor ?? DEFAULT_DAILY_LIMIT_PER_MENTOR;
    assertPositiveInteger('dailyLimitGlobal', this.dailyLimitGlobal);
    assertPositiveInteger('dailyLimitPerMentor', this.dailyLimitPerMentor);
    this.clock = options.clock;
    this.day = this.clock.currentDay();
  }

  async tryConsume(mentorId: EntityId): Promise<Result<void, AiUsageLimitExceededError>> {
    this.resetIfNewDay();

    const mentorCount = this.perMentorCount.get(mentorId.value) ?? 0;
    if (mentorCount >= this.dailyLimitPerMentor) {
      return err(AiUsageLimitExceededError.forMentor(this.dailyLimitPerMentor));
    }
    if (this.globalCount >= this.dailyLimitGlobal) {
      return err(AiUsageLimitExceededError.forGlobal(this.dailyLimitGlobal));
    }

    this.perMentorCount.set(mentorId.value, mentorCount + 1);
    this.globalCount += 1;
    return ok(undefined);
  }

  async remaining(mentorId: EntityId): Promise<AiUsageRemaining> {
    this.resetIfNewDay();
    const mentorCount = this.perMentorCount.get(mentorId.value) ?? 0;
    return {
      mentor: Math.max(0, this.dailyLimitPerMentor - mentorCount),
      global: Math.max(0, this.dailyLimitGlobal - this.globalCount),
    };
  }

  private resetIfNewDay(): void {
    const today = this.clock.currentDay();
    if (today !== this.day) {
      this.day = today;
      this.globalCount = 0;
      this.perMentorCount.clear();
    }
  }
}
