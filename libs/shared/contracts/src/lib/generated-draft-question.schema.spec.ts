import { QUESTION_TYPE_RULES, QuestionType } from '@studyforge/shared/domain';
import { GeneratedDraftQuestionSchema } from './generated-draft-question.schema';

const valid = {
  type: QuestionType.SINGLE_CHOICE,
  statement: 'O que é AWS?',
  alternatives: [
    { letter: 'A', text: 'Amazon Web Services', isCorrect: true },
    { letter: 'B', text: 'B', isCorrect: false },
    { letter: 'C', text: 'C', isCorrect: false },
    { letter: 'D', text: 'D', isCorrect: false },
  ],
};

describe('GeneratedDraftQuestionSchema', () => {
  it('accepts a well-formed generated question', () => {
    expect(GeneratedDraftQuestionSchema.parse(valid)).toEqual(valid);
  });

  it('rejects an unknown question type', () => {
    expect(GeneratedDraftQuestionSchema.safeParse({ ...valid, type: 'TRUE_FALSE' }).success).toBe(false);
  });

  it('rejects a missing statement', () => {
    const withoutStatement = { type: valid.type, alternatives: valid.alternatives };
    expect(GeneratedDraftQuestionSchema.safeParse(withoutStatement).success).toBe(false);
  });

  it('rejects a letter outside A–E', () => {
    const alternatives = valid.alternatives.map((a, i) => (i === 0 ? { ...a, letter: 'F' } : a));
    expect(GeneratedDraftQuestionSchema.safeParse({ ...valid, alternatives }).success).toBe(false);
  });

  it('rejects fewer alternatives than the minimum of the smallest question type', () => {
    const min = Math.min(...Object.values(QUESTION_TYPE_RULES).map((r) => r.letters.length));
    const alternatives = valid.alternatives.slice(0, min - 1);
    expect(GeneratedDraftQuestionSchema.safeParse({ ...valid, alternatives }).success).toBe(false);
  });

  it('rejects more alternatives than the maximum of the largest question type', () => {
    const max = Math.max(...Object.values(QUESTION_TYPE_RULES).map((r) => r.letters.length));
    const alternatives = Array.from({ length: max + 1 }, (_, i) => ({ letter: 'ABCDE'[i % 5], text: 't', isCorrect: i === 0 }));
    expect(GeneratedDraftQuestionSchema.safeParse({ ...valid, alternatives }).success).toBe(false);
  });
});
