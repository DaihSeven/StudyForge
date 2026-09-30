import { Alternative, AlternativeLetter, EntityId, OrganizationId, QuestionType } from '@studyforge/shared/domain';
import { DraftQuestion, DraftQuestionProps } from './draft-question';

const id = EntityId.create('draft-1');
const organizationId = OrganizationId.create('org-1');

/** Monta alternativas a partir das letras; as letras em `correct` são as corretas. */
function alternatives(letters: string, correct: string): Alternative[] {
  return [...letters].map((letter) =>
    Alternative.create({
      letter: letter as AlternativeLetter,
      text: `Alternativa ${letter}`,
      isCorrect: correct.includes(letter),
    }),
  );
}

function create(type: QuestionType, letters: string, correct: string, overrides: Partial<DraftQuestionProps> = {}) {
  return DraftQuestion.create({
    id,
    organizationId,
    type,
    statement: 'Enunciado',
    alternatives: alternatives(letters, correct),
    ...overrides,
  });
}

function errorOf(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected function to throw');
}

describe('DraftQuestion', () => {
  describe('SINGLE_CHOICE', () => {
    const type = QuestionType.SINGLE_CHOICE;

    it('accepts 4 alternatives A–D with exactly 1 correct', () => {
      const draft = create(type, 'ABCD', 'B');

      expect(draft.id).toBe(id);
      expect(draft.organizationId).toBe(organizationId);
      expect(draft.type).toBe(type);
      expect(draft.statement).toBe('Enunciado');
      expect(draft.alternatives.map((a) => a.letter)).toEqual(['A', 'B', 'C', 'D']);
      expect(draft.alternatives.filter((a) => a.isCorrect).map((a) => a.letter)).toEqual(['B']);
    });

    it.each(['ABC', 'ABCDE'])('rejects %s (wrong number of alternatives)', (letters) => {
      expect(errorOf(() => create(type, letters, 'A'))).toMatchObject({ code: 'INVALID_ALTERNATIVE_COUNT' });
    });

    it.each(['A', 'B', 'C', 'D'])('accepts %s as the single correct alternative', (correct) => {
      expect(() => create(type, 'ABCD', correct)).not.toThrow();
    });

    it.each([
      ['0 correct', ''],
      ['2 correct', 'AB'],
    ])('rejects %s', (_, correct) => {
      expect(errorOf(() => create(type, 'ABCD', correct))).toMatchObject({ code: 'INVALID_CORRECT_COUNT' });
    });

    it.each([
      ['a repeated letter', 'AABC'],
      ['a letter outside A–D', 'ABCE'],
    ])('rejects %s', (_, letters) => {
      expect(errorOf(() => create(type, letters, 'A'))).toMatchObject({ code: 'INVALID_ALTERNATIVE_LETTERS' });
    });
  });

  describe('MULTIPLE_CHOICE', () => {
    const type = QuestionType.MULTIPLE_CHOICE;

    it('accepts 5 alternatives A–E with exactly 2 correct', () => {
      const draft = create(type, 'ABCDE', 'AC');

      expect(draft.alternatives.map((a) => a.letter)).toEqual(['A', 'B', 'C', 'D', 'E']);
      expect(draft.alternatives.filter((a) => a.isCorrect).map((a) => a.letter)).toEqual(['A', 'C']);
    });

    it.each(['ABCD', 'ABCDEA'])('rejects %s (wrong number of alternatives)', (letters) => {
      expect(errorOf(() => create(type, letters, 'AB'))).toMatchObject({ code: 'INVALID_ALTERNATIVE_COUNT' });
    });

    it.each(['AB', 'DE', 'BE'])('accepts %s as the 2 correct alternatives', (correct) => {
      expect(() => create(type, 'ABCDE', correct)).not.toThrow();
    });

    it.each([
      ['0 correct', ''],
      ['1 correct', 'A'],
      ['3 correct', 'ABC'],
      ['4 correct', 'ABCD'],
      ['5 correct', 'ABCDE'],
    ])('rejects %s', (_, correct) => {
      expect(errorOf(() => create(type, 'ABCDE', correct))).toMatchObject({ code: 'INVALID_CORRECT_COUNT' });
    });

    it('rejects a repeated letter', () => {
      expect(errorOf(() => create(type, 'ABCDD', 'AB'))).toMatchObject({ code: 'INVALID_ALTERNATIVE_LETTERS' });
    });
  });

  it('accepts alternatives in any order and keeps them sorted by letter', () => {
    const draft = create(QuestionType.SINGLE_CHOICE, 'DBAC', 'C');

    expect(draft.alternatives.map((a) => a.letter)).toEqual(['A', 'B', 'C', 'D']);
    expect(draft.alternatives.find((a) => a.isCorrect)?.letter).toBe('C');
  });

  it('requires an organizationId', () => {
    const error = errorOf(() =>
      create(QuestionType.SINGLE_CHOICE, 'ABCD', 'A', { organizationId: undefined as unknown as OrganizationId }),
    );

    expect(error).toMatchObject({ code: 'INVALID_ORGANIZATION_ID' });
  });

  it('requires an id', () => {
    const error = errorOf(() =>
      create(QuestionType.SINGLE_CHOICE, 'ABCD', 'A', { id: undefined as unknown as EntityId }),
    );

    expect(error).toMatchObject({ code: 'INVALID_ENTITY_ID' });
  });

  it.each(['', '   '])('rejects an empty statement ("%s")', (statement) => {
    expect(errorOf(() => create(QuestionType.SINGLE_CHOICE, 'ABCD', 'A', { statement }))).toMatchObject({
      code: 'EMPTY_STATEMENT',
    });
  });

  it.each(['', '   '])('rejects an alternative with empty text ("%s")', (text) => {
    const withEmptyText = [...alternatives('ABC', 'A'), Alternative.create({ letter: 'D', text, isCorrect: false })];

    expect(
      errorOf(() => create(QuestionType.SINGLE_CHOICE, 'ABCD', 'A', { alternatives: withEmptyText })),
    ).toMatchObject({
      code: 'EMPTY_ALTERNATIVE_TEXT',
    });
  });

  it('rejects a question type other than SINGLE_CHOICE or MULTIPLE_CHOICE', () => {
    const error = errorOf(() => create('TRUE_FALSE' as QuestionType, 'AB', 'A'));

    expect(error).toMatchObject({ code: 'INVALID_QUESTION_TYPE' });
  });
});
