import { QUESTION_TYPE_RULES, QuestionType } from '@studyforge/shared/domain';
import { QUESTION_TYPE_CHOICES } from './question-type-choices';

describe('QUESTION_TYPE_CHOICES', () => {
  it('has one choice per question type, in the order of the domain rules', () => {
    expect(QUESTION_TYPE_CHOICES.map((c) => c.type)).toEqual(Object.keys(QUESTION_TYPE_RULES));
  });

  it('mirrors the domain: SINGLE_CHOICE 4 alternatives / 1 correct, MULTIPLE_CHOICE 5 / 2', () => {
    expect(QUESTION_TYPE_CHOICES.find((c) => c.type === QuestionType.SINGLE_CHOICE)).toEqual({
      type: QuestionType.SINGLE_CHOICE,
      alternativesPerQuestion: 4,
      correctCount: 1,
    });
    expect(QUESTION_TYPE_CHOICES.find((c) => c.type === QuestionType.MULTIPLE_CHOICE)).toEqual({
      type: QuestionType.MULTIPLE_CHOICE,
      alternativesPerQuestion: 5,
      correctCount: 2,
    });
  });
});
