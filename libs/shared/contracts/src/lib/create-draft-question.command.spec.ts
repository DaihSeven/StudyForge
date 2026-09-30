import { CreateDraftQuestionCommandSchema } from './create-draft-question.command';

const valid = {
  organizationId: 'org-1',
  type: 'SINGLE_CHOICE',
  statement: 'Enunciado',
  alternatives: [
    { letter: 'A', text: 'Alternativa A', isCorrect: true },
    { letter: 'B', text: 'Alternativa B', isCorrect: false },
  ],
};

describe('CreateDraftQuestionCommandSchema', () => {
  it('accepts a well-formed command', () => {
    expect(CreateDraftQuestionCommandSchema.parse(valid)).toEqual(valid);
  });

  it('rejects an unknown question type', () => {
    expect(CreateDraftQuestionCommandSchema.safeParse({ ...valid, type: 'TRUE_FALSE' }).success).toBe(false);
  });

  it('rejects a letter outside A–E', () => {
    const alternatives = [{ letter: 'F', text: 'Alternativa F', isCorrect: true }];

    expect(CreateDraftQuestionCommandSchema.safeParse({ ...valid, alternatives }).success).toBe(false);
  });

  it('rejects a missing field', () => {
    const withoutStatement: Partial<typeof valid> = { ...valid };
    delete withoutStatement.statement;

    expect(CreateDraftQuestionCommandSchema.safeParse(withoutStatement).success).toBe(false);
  });
});
