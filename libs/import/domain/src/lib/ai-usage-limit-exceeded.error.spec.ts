import { DomainError } from '@studyforge/shared/domain';
import { AiUsageLimitExceededError } from './ai-usage-limit-exceeded.error';

describe('AiUsageLimitExceededError', () => {
  it('forMentor carries a stable code, the limit and the manual-import guidance', () => {
    const error = AiUsageLimitExceededError.forMentor(10);

    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe('AI_MENTOR_DAILY_LIMIT_EXCEEDED');
    expect(error.message).toContain('10');
    expect(error.message).toContain('importação manual');
  });

  it('forGlobal carries a stable code, the limit and the manual-import guidance', () => {
    const error = AiUsageLimitExceededError.forGlobal(200);

    expect(error.code).toBe('AI_GLOBAL_DAILY_LIMIT_EXCEEDED');
    expect(error.message).toContain('200');
    expect(error.message).toContain('importação manual');
  });
});
