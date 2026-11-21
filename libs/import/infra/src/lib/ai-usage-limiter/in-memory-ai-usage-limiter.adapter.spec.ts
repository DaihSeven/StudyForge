import { Clock } from '@studyforge/import/application';
import { EntityId } from '@studyforge/shared/domain';
import { InMemoryAiUsageLimiterAdapter } from './in-memory-ai-usage-limiter.adapter';

class FakeClock implements Clock {
  constructor(public day = '2026-11-21') {}

  currentDay(): string {
    return this.day;
  }
}

const mentor = (n: number) => EntityId.create(`mentor-${n}`);

describe('InMemoryAiUsageLimiterAdapter', () => {
  let clock: FakeClock;

  beforeEach(() => {
    clock = new FakeClock();
  });

  it('allows up to the per-mentor limit and rejects the next one', async () => {
    const limiter = new InMemoryAiUsageLimiterAdapter({ clock, dailyLimitGlobal: 100, dailyLimitPerMentor: 3 });

    for (let i = 0; i < 3; i++) {
      expect((await limiter.tryConsume(mentor(1))).isOk()).toBe(true);
    }
    const result = await limiter.tryConsume(mentor(1));

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('AI_MENTOR_DAILY_LIMIT_EXCEEDED');
      expect(result.error.message).toContain('importação manual');
    }
  });

  it('uses 10 as the default per-mentor limit', async () => {
    const limiter = new InMemoryAiUsageLimiterAdapter({ clock, dailyLimitGlobal: 100 });

    for (let i = 0; i < 10; i++) {
      expect((await limiter.tryConsume(mentor(1))).isOk()).toBe(true);
    }
    expect((await limiter.tryConsume(mentor(1))).isErr()).toBe(true);
  });

  it('counts each mentor separately', async () => {
    const limiter = new InMemoryAiUsageLimiterAdapter({ clock, dailyLimitGlobal: 100, dailyLimitPerMentor: 1 });

    await limiter.tryConsume(mentor(1));

    expect((await limiter.tryConsume(mentor(1))).isErr()).toBe(true);
    expect((await limiter.tryConsume(mentor(2))).isOk()).toBe(true);
  });

  it('rejects when the global daily cap is reached, even for a mentor under their own limit', async () => {
    const limiter = new InMemoryAiUsageLimiterAdapter({ clock, dailyLimitGlobal: 2, dailyLimitPerMentor: 10 });

    await limiter.tryConsume(mentor(1));
    await limiter.tryConsume(mentor(2));
    const result = await limiter.tryConsume(mentor(3));

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('AI_GLOBAL_DAILY_LIMIT_EXCEEDED');
      expect(result.error.message).toContain('importação manual');
    }
  });

  it('does not consume the global cap when the mentor limit rejects the request', async () => {
    const limiter = new InMemoryAiUsageLimiterAdapter({ clock, dailyLimitGlobal: 2, dailyLimitPerMentor: 1 });

    await limiter.tryConsume(mentor(1));
    await limiter.tryConsume(mentor(1)); // rejeitado pelo limite do mentor
    await limiter.tryConsume(mentor(1)); // rejeitado pelo limite do mentor

    expect((await limiter.tryConsume(mentor(2))).isOk()).toBe(true);
  });

  it('resets every counter when the clock moves to another day', async () => {
    const limiter = new InMemoryAiUsageLimiterAdapter({ clock, dailyLimitGlobal: 1, dailyLimitPerMentor: 1 });

    await limiter.tryConsume(mentor(1));
    expect((await limiter.tryConsume(mentor(1))).isErr()).toBe(true);

    clock.day = '2026-11-22';

    expect((await limiter.tryConsume(mentor(1))).isOk()).toBe(true);
  });

  it.each([0, -1, 1.5, Number.NaN])('rejects an invalid limit (%p) at construction', (limit) => {
    expect(() => new InMemoryAiUsageLimiterAdapter({ clock, dailyLimitGlobal: limit })).toThrow(RangeError);
    expect(() => new InMemoryAiUsageLimiterAdapter({ clock, dailyLimitGlobal: 1, dailyLimitPerMentor: limit })).toThrow(RangeError);
  });
});
