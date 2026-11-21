import { GeneratedDraftQuestionSchema } from '@studyforge/shared/contracts';
import { validateDraftQuestionStructure } from '@studyforge/import/domain';
import { QuestionType } from '@studyforge/shared/domain';
import { MockQuestionDraftGeneratorAdapter } from './mock-question-draft-generator.adapter';

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterable) {
    items.push(item);
  }
  return items;
}

const input = (quantity: number, alternativesPerQuestion = 4) => ({
  text: 'AWS é um provedor de nuvem.',
  options: { quantity, alternativesPerQuestion },
});

describe('MockQuestionDraftGeneratorAdapter', () => {
  it('emits exactly `quantity` drafts', async () => {
    const generator = new MockQuestionDraftGeneratorAdapter();

    expect(await collect(generator.generate(input(3)))).toHaveLength(3);
  });

  it('is deterministic: same input, same drafts', async () => {
    const generator = new MockQuestionDraftGeneratorAdapter();

    expect(await collect(generator.generate(input(4)))).toEqual(await collect(new MockQuestionDraftGeneratorAdapter().generate(input(4))));
  });

  it('emits SINGLE_CHOICE drafts with 4 alternatives that satisfy the schema and the domain rule', async () => {
    const drafts = await collect(new MockQuestionDraftGeneratorAdapter().generate(input(5, 4)));

    for (const draft of drafts) {
      expect(draft.type).toBe(QuestionType.SINGLE_CHOICE);
      expect(GeneratedDraftQuestionSchema.safeParse(draft).success).toBe(true);
      expect(validateDraftQuestionStructure(draft).isOk()).toBe(true);
    }
  });

  it('emits MULTIPLE_CHOICE drafts when 5 alternatives are requested', async () => {
    const drafts = await collect(new MockQuestionDraftGeneratorAdapter().generate(input(5, 5)));

    for (const draft of drafts) {
      expect(draft.type).toBe(QuestionType.MULTIPLE_CHOICE);
      expect(validateDraftQuestionStructure(draft).isOk()).toBe(true);
    }
  });

  it('varies the correct alternative and the statement across drafts', async () => {
    const drafts = await collect(new MockQuestionDraftGeneratorAdapter().generate(input(4)));

    expect(new Set(drafts.map((d) => d.statement)).size).toBe(4);
    expect(new Set(drafts.map((d) => d.alternatives.find((a) => a.isCorrect)?.letter)).size).toBeGreaterThan(1);
  });

  it('emits lazily, waiting `delayMs` before each draft', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    const generator = new MockQuestionDraftGeneratorAdapter({ delayMs: 50, sleep });

    const iterator = generator.generate(input(3))[Symbol.asyncIterator]();
    await iterator.next();

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(50);

    await iterator.next();
    await iterator.next();
    expect(sleep).toHaveBeenCalledTimes(3);
  });

  it('does not wait when delayMs is 0 (default)', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);

    await collect(new MockQuestionDraftGeneratorAdapter({ sleep }).generate(input(3)));

    expect(sleep).not.toHaveBeenCalled();
  });

  it('rejects an alternatives-per-question count no question type supports', async () => {
    const generator = new MockQuestionDraftGeneratorAdapter();

    await expect(collect(generator.generate(input(1, 3)))).rejects.toThrow(RangeError);
  });
});
