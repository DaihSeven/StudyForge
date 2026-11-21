import { AiUsageLimitExceededError, DraftQuestion } from '@studyforge/import/domain';
import { GeneratedDraftQuestion } from '@studyforge/shared/contracts';
import { EntityId, err, ok, QuestionType, Result } from '@studyforge/shared/domain';
import { AiUsageLimiter } from '../ports/ai-usage-limiter.port';
import { DraftQuestionRepository } from '../ports/draft-question.repository';
import { IdGenerator } from '../ports/id-generator.port';
import { QuestionDraftGenerationInput, QuestionDraftGenerator } from '../ports/question-draft-generator.port';
import { CreateDraftQuestionUseCase } from './create-draft-question.use-case';
import { GenerateDraftQuestionsCommand, GenerateDraftQuestionsUseCase } from './generate-draft-questions.use-case';

class InMemoryDraftQuestionRepository implements DraftQuestionRepository {
  readonly saved: DraftQuestion[] = [];

  async save(draft: DraftQuestion): Promise<void> {
    this.saved.push(draft);
  }
}

class SequentialIdGenerator implements IdGenerator {
  private count = 0;

  generate(): string {
    this.count += 1;
    return `fake-uuid-${this.count}`;
  }
}

class FakeGenerator implements QuestionDraftGenerator {
  readonly inputs: QuestionDraftGenerationInput[] = [];

  constructor(private readonly items: readonly unknown[], private readonly failure?: Error) {}

  async *generate(input: QuestionDraftGenerationInput): AsyncIterable<GeneratedDraftQuestion> {
    this.inputs.push(input);
    for (const item of this.items) {
      yield item as GeneratedDraftQuestion;
    }
    if (this.failure) {
      throw this.failure;
    }
  }
}

class FakeLimiter implements AiUsageLimiter {
  readonly consumed: string[] = [];

  constructor(private readonly verdict: Result<void, AiUsageLimitExceededError> = ok(undefined)) {}

  async tryConsume(mentorId: EntityId): Promise<Result<void, AiUsageLimitExceededError>> {
    this.consumed.push(mentorId.value);
    return this.verdict;
  }
}

const generated = (overrides: Partial<GeneratedDraftQuestion> = {}): GeneratedDraftQuestion => ({
  type: QuestionType.SINGLE_CHOICE,
  statement: 'O que é AWS?',
  alternatives: [
    { letter: 'A', text: 'Amazon Web Services', isCorrect: true },
    { letter: 'B', text: 'B', isCorrect: false },
    { letter: 'C', text: 'C', isCorrect: false },
    { letter: 'D', text: 'D', isCorrect: false },
  ],
  ...overrides,
});

const twoCorrect = generated({
  alternatives: [
    { letter: 'A', text: 'A', isCorrect: true },
    { letter: 'B', text: 'B', isCorrect: true },
    { letter: 'C', text: 'C', isCorrect: false },
    { letter: 'D', text: 'D', isCorrect: false },
  ],
});

const badLetter = { ...generated(), alternatives: [{ letter: 'Z', text: 'Z', isCorrect: true }] };

const command = (overrides: Partial<GenerateDraftQuestionsCommand> = {}): GenerateDraftQuestionsCommand => ({
  organizationId: 'org-123',
  mentorId: 'mentor-1',
  text: 'AWS é um provedor de nuvem.',
  quantity: 3,
  alternativesPerQuestion: 4,
  ...overrides,
});

function build(items: readonly unknown[], limiter = new FakeLimiter(), failure?: Error) {
  const repository = new InMemoryDraftQuestionRepository();
  const generator = new FakeGenerator(items, failure);
  const createDraft = new CreateDraftQuestionUseCase(new SequentialIdGenerator(), repository);
  const useCase = new GenerateDraftQuestionsUseCase(generator, limiter, createDraft);
  return { useCase, repository, generator, limiter };
}

describe('GenerateDraftQuestionsUseCase', () => {
  it('saves every valid generated item as a DraftQuestion carrying the command organizationId', async () => {
    const { useCase, repository } = build([generated(), generated(), generated()]);

    const output = (await useCase.execute(command())).getOrThrow();

    expect(output.drafts).toHaveLength(3);
    expect(output.rejected).toEqual([]);
    expect(repository.saved).toEqual(output.drafts);
    for (const draft of repository.saved) {
      expect(draft).toBeInstanceOf(DraftQuestion);
      expect(draft.organizationId.value).toBe('org-123');
    }
  });

  it('never publishes: the result is only DraftQuestion, with no published/status state', async () => {
    const { useCase } = build([generated()]);

    const [draft] = (await useCase.execute(command({ quantity: 1 }))).getOrThrow().drafts;

    expect(draft).toBeInstanceOf(DraftQuestion);
    expect(Object.keys(draft)).not.toEqual(expect.arrayContaining(['published']));
    expect(Object.keys(draft)).not.toEqual(expect.arrayContaining(['status']));
  });

  it('passes the text and the options to the generator', async () => {
    const { useCase, generator } = build([generated()]);

    await useCase.execute(command({ quantity: 1 }));

    expect(generator.inputs).toEqual([{ text: 'AWS é um provedor de nuvem.', options: { quantity: 1, alternativesPerQuestion: 4 } }]);
  });

  it('rejects an item that breaks the domain rule without saving it, and keeps the valid ones', async () => {
    const { useCase, repository } = build([generated(), twoCorrect, generated()]);

    const output = (await useCase.execute(command())).getOrThrow();

    expect(output.drafts).toHaveLength(2);
    expect(repository.saved).toHaveLength(2);
    expect(output.rejected).toEqual([expect.objectContaining({ index: 1, code: 'INVALID_CORRECT_COUNT' })]);
  });

  it('rejects an item that does not match the contract schema', async () => {
    const { useCase, repository } = build([badLetter, generated()]);

    const output = (await useCase.execute(command())).getOrThrow();

    expect(repository.saved).toHaveLength(1);
    expect(output.rejected).toEqual([expect.objectContaining({ index: 0, code: 'INVALID_GENERATED_FORMAT' })]);
  });

  it('stops after `quantity` items even if the generator emits more', async () => {
    const { useCase, repository } = build([generated(), generated(), generated(), generated()]);

    await useCase.execute(command({ quantity: 2 }));

    expect(repository.saved).toHaveLength(2);
  });

  it('consumes the usage limiter once per execution, for the given mentor', async () => {
    const { useCase, limiter } = build([generated(), generated(), generated()]);

    await useCase.execute(command({ mentorId: 'mentor-9' }));

    expect(limiter.consumed).toEqual(['mentor-9']);
  });

  it('returns the limiter error without calling the generator or saving anything', async () => {
    const limited = new FakeLimiter(err(AiUsageLimitExceededError.forMentor(10)));
    const { useCase, generator, repository } = build([generated()], limited);

    const result = await useCase.execute(command());

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('AI_MENTOR_DAILY_LIMIT_EXCEEDED');
      expect(result.error.message).toContain('importação manual');
    }
    expect(generator.inputs).toEqual([]);
    expect(repository.saved).toEqual([]);
  });

  it.each([
    ['EMPTY_TEXT', { text: '   ' }],
    ['INVALID_QUANTITY', { quantity: 0 }],
    ['INVALID_QUANTITY', { quantity: 1.5 }],
    ['INVALID_ALTERNATIVES_PER_QUESTION', { alternativesPerQuestion: 3 }],
  ])('returns Err %s for an invalid request, without consuming the limiter', async (code, overrides) => {
    const { useCase, limiter, generator } = build([generated()]);

    const result = await useCase.execute(command(overrides));

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe(code);
    }
    expect(limiter.consumed).toEqual([]);
    expect(generator.inputs).toEqual([]);
  });

  it('returns Err for an invalid organizationId or mentorId, without calling the generator', async () => {
    const { useCase, generator } = build([generated()]);

    expect((await useCase.execute(command({ organizationId: ' ' }))).isErr()).toBe(true);
    expect((await useCase.execute(command({ mentorId: '' }))).isErr()).toBe(true);
    expect(generator.inputs).toEqual([]);
  });

  it('rethrows unexpected generator failures (they are not domain errors)', async () => {
    const { useCase } = build([generated()], new FakeLimiter(), new Error('provider down'));

    await expect(useCase.execute(command())).rejects.toThrow('provider down');
  });
});
