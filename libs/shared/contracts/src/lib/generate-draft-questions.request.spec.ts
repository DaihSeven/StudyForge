import { createGenerateDraftQuestionsRequestSchema, MAX_GENERATION_QUANTITY } from './generate-draft-questions.request';

const valid = { organizationId: 'org-1', mentorId: 'mentor-1', text: 'Texto do material', quantity: 3, alternativesPerQuestion: 4 };

describe('createGenerateDraftQuestionsRequestSchema', () => {
  const schema = createGenerateDraftQuestionsRequestSchema(100);

  it('accepts a well-formed request (4 and 5 alternatives)', () => {
    expect(schema.parse(valid)).toEqual(valid);
    expect(schema.parse({ ...valid, alternativesPerQuestion: 5 }).alternativesPerQuestion).toBe(5);
  });

  it('accepts text of exactly maxInputChars and rejects one more', () => {
    expect(schema.safeParse({ ...valid, text: 'a'.repeat(100) }).success).toBe(true);
    expect(schema.safeParse({ ...valid, text: 'a'.repeat(101) }).success).toBe(false);
  });

  it('rejects blank text', () => {
    expect(schema.safeParse({ ...valid, text: '   ' }).success).toBe(false);
  });

  it('accepts quantity 1 and MAX_GENERATION_QUANTITY, rejects 0, 11 and non-integers', () => {
    expect(MAX_GENERATION_QUANTITY).toBe(10);
    expect(schema.safeParse({ ...valid, quantity: 1 }).success).toBe(true);
    expect(schema.safeParse({ ...valid, quantity: 10 }).success).toBe(true);
    expect(schema.safeParse({ ...valid, quantity: 0 }).success).toBe(false);
    expect(schema.safeParse({ ...valid, quantity: 11 }).success).toBe(false);
    expect(schema.safeParse({ ...valid, quantity: 2.5 }).success).toBe(false);
  });

  it('rejects an alternatives count that no question type has (e.g. 3 and 6)', () => {
    expect(schema.safeParse({ ...valid, alternativesPerQuestion: 3 }).success).toBe(false);
    expect(schema.safeParse({ ...valid, alternativesPerQuestion: 6 }).success).toBe(false);
  });

  it('rejects missing organizationId or mentorId', () => {
    expect(schema.safeParse({ ...valid, organizationId: undefined }).success).toBe(false);
    expect(schema.safeParse({ ...valid, mentorId: undefined }).success).toBe(false);
  });
});
