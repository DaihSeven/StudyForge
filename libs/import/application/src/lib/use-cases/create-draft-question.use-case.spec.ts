import { DraftQuestion, InvalidDraftQuestionError } from '@studyforge/import/domain';
import { CreateDraftQuestionCommand } from '@studyforge/shared/contracts';
import { QuestionType } from '@studyforge/shared/domain';
import { DraftQuestionRepository } from '../ports/draft-question.repository';
import { IdGenerator } from '../ports/id-generator.port';
import { CreateDraftQuestionUseCase } from './create-draft-question.use-case';

/** Repositório em memória: guarda o que foi salvo para as asserções. */
class InMemoryDraftQuestionRepository implements DraftQuestionRepository {
  readonly saved: DraftQuestion[] = [];

  async save(draft: DraftQuestion): Promise<void> {
    this.saved.push(draft);
  }
}

/** Gera ids previsíveis: fake-uuid-1, fake-uuid-2, ... */
class SequentialIdGenerator implements IdGenerator {
  private count = 0;

  generate(): string {
    this.count += 1;
    return `fake-uuid-${this.count}`;
  }
}

function singleChoice(overrides: Partial<CreateDraftQuestionCommand> = {}): CreateDraftQuestionCommand {
  return {
    organizationId: 'org-123',
    type: QuestionType.SINGLE_CHOICE,
    statement: 'What is AWS?',
    alternatives: [
      { letter: 'A', text: 'Amazon Web Services', isCorrect: true },
      { letter: 'B', text: 'American Web Standard', isCorrect: false },
      { letter: 'C', text: 'Application Web Server', isCorrect: false },
      { letter: 'D', text: 'Automated Web System', isCorrect: false },
    ],
    ...overrides,
  };
}

describe('CreateDraftQuestionUseCase', () => {
  let repository: InMemoryDraftQuestionRepository;
  let useCase: CreateDraftQuestionUseCase;

  beforeEach(() => {
    repository = new InMemoryDraftQuestionRepository();
    useCase = new CreateDraftQuestionUseCase(new SequentialIdGenerator(), repository);
  });

  it('creates a SINGLE_CHOICE question with valid input', async () => {
    const draft = (await useCase.execute(singleChoice())).getOrThrow();

    expect(draft).toBeInstanceOf(DraftQuestion);
    expect(draft.id.value).toBe('fake-uuid-1');
    expect(draft.organizationId.value).toBe('org-123');
    expect(draft.type).toBe(QuestionType.SINGLE_CHOICE);
    expect(draft.statement).toBe('What is AWS?');
  });

  it('creates a MULTIPLE_CHOICE question', async () => {
    const result = await useCase.execute({
      organizationId: 'org-456',
      type: QuestionType.MULTIPLE_CHOICE,
      statement: 'Which are AWS services?',
      alternatives: [
        { letter: 'A', text: 'EC2', isCorrect: true },
        { letter: 'B', text: 'S3', isCorrect: true },
        { letter: 'C', text: 'Docker', isCorrect: false },
        { letter: 'D', text: 'Kubernetes', isCorrect: false },
        { letter: 'E', text: 'RDS', isCorrect: false },
      ],
    });

    const draft = result.getOrThrow();
    expect(draft.type).toBe(QuestionType.MULTIPLE_CHOICE);
    expect(draft.alternatives).toHaveLength(5);
  });

  it('generates a distinct id for each question', async () => {
    const first = (await useCase.execute(singleChoice({ statement: 'Question 1' }))).getOrThrow();
    const second = (await useCase.execute(singleChoice({ statement: 'Question 2' }))).getOrThrow();

    expect(first.id.value).toBe('fake-uuid-1');
    expect(second.id.value).toBe('fake-uuid-2');
    expect(first.id.equals(second.id)).toBe(false);
  });

  it('persists the created question', async () => {
    const draft = (await useCase.execute(singleChoice())).getOrThrow();

    expect(repository.saved).toEqual([draft]);
  });

  it('returns Err when the statement is empty', async () => {
    const result = await useCase.execute(singleChoice({ statement: '' }));

    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error).toBeInstanceOf(InvalidDraftQuestionError);
    expect(result.isErr() && result.error.code).toBe('EMPTY_STATEMENT');
  });

  it('returns Err when an alternative text is empty', async () => {
    const alternatives = singleChoice().alternatives.map((a) => (a.letter === 'A' ? { ...a, text: '' } : a));

    const result = await useCase.execute(singleChoice({ alternatives }));

    expect(result.isErr() && result.error.code).toBe('EMPTY_ALTERNATIVE_TEXT');
  });

  it('returns Err when SINGLE_CHOICE has the wrong number of correct answers', async () => {
    const alternatives = singleChoice().alternatives.map((a) => (a.letter === 'B' ? { ...a, isCorrect: true } : a));

    const result = await useCase.execute(singleChoice({ alternatives }));

    expect(result.isErr() && result.error.code).toBe('INVALID_CORRECT_COUNT');
  });

  it('returns Err when the organizationId is empty', async () => {
    const result = await useCase.execute(singleChoice({ organizationId: '' }));

    expect(result.isErr() && result.error.code).toBe('INVALID_ORGANIZATION_ID');
  });

  it('does not persist the question when validation fails', async () => {
    await useCase.execute(singleChoice({ statement: '' }));

    expect(repository.saved).toEqual([]);
  });

  it('rethrows unexpected persistence failures', async () => {
    const failure = new Error('database down');
    repository.save = async () => {
      throw failure;
    };

    await expect(useCase.execute(singleChoice())).rejects.toBe(failure);
  });

  it('rethrows non-domain errors raised while building the draft and persists nothing', async () => {
    const malformed = singleChoice({ alternatives: undefined as unknown as CreateDraftQuestionCommand['alternatives'] });

    await expect(useCase.execute(malformed)).rejects.toBeInstanceOf(TypeError);
    expect(repository.saved).toEqual([]);
  });
});
