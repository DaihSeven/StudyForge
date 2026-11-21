import { QuestionType } from '@studyforge/shared/domain';
import { validateDraftQuestionStructure } from './validate-draft-question-structure';

const alt = (letter: 'A' | 'B' | 'C' | 'D' | 'E', isCorrect = false, text = `Texto ${letter}`) => ({ letter, text, isCorrect });

const single = () => ({
  type: QuestionType.SINGLE_CHOICE,
  statement: 'Enunciado',
  alternatives: [alt('A', true), alt('B'), alt('C'), alt('D')],
});

const multiple = () => ({
  type: QuestionType.MULTIPLE_CHOICE,
  statement: 'Enunciado',
  alternatives: [alt('A', true), alt('B', true), alt('C'), alt('D'), alt('E')],
});

describe('validateDraftQuestionStructure (validar_questao)', () => {
  it('accepts a valid SINGLE_CHOICE and returns the alternatives sorted by letter', () => {
    const shuffled = { ...single(), alternatives: [alt('D'), alt('B'), alt('A', true), alt('C')] };

    const result = validateDraftQuestionStructure(shuffled);

    expect(result.isOk()).toBe(true);
    expect(result.getOrThrow().map((a) => a.letter)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('accepts a valid MULTIPLE_CHOICE', () => {
    expect(validateDraftQuestionStructure(multiple()).isOk()).toBe(true);
  });

  it.each([
    ['INVALID_QUESTION_TYPE', { ...single(), type: 'TRUE_FALSE' as QuestionType }],
    ['INVALID_ALTERNATIVE_COUNT', { ...single(), alternatives: [alt('A', true), alt('B'), alt('C')] }],
    ['INVALID_ALTERNATIVE_LETTERS', { ...single(), alternatives: [alt('A', true), alt('B'), alt('C'), alt('E')] }],
    ['INVALID_CORRECT_COUNT', { ...single(), alternatives: [alt('A'), alt('B'), alt('C'), alt('D')] }],
    ['INVALID_CORRECT_COUNT', { ...single(), alternatives: [alt('A', true), alt('B', true), alt('C'), alt('D')] }],
    ['EMPTY_STATEMENT', { ...single(), statement: '   ' }],
    ['EMPTY_ALTERNATIVE_TEXT', { ...single(), alternatives: [alt('A', true, ' '), alt('B'), alt('C'), alt('D')] }],
  ])('returns Err with code %s', (code, candidate) => {
    const result = validateDraftQuestionStructure(candidate);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe(code);
      expect(result.error.message).not.toBe('');
    }
  });

  it('does not throw on non-string text coming from a model', () => {
    const bad = { ...single(), alternatives: [{ ...alt('A', true), text: 42 as unknown as string }, alt('B'), alt('C'), alt('D')] };

    expect(validateDraftQuestionStructure(bad).isErr()).toBe(true);
  });
});
