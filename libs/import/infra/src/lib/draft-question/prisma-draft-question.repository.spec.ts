import { DraftQuestion } from '@studyforge/import/domain';
import { Alternative, EntityId, OrganizationId, QuestionType } from '@studyforge/shared/domain';
import { PrismaService } from '@studyforge/shared/prisma';
import { PrismaDraftQuestionRepository } from './prisma-draft-question.repository';

/** Teste unitário do mapeamento domínio → Prisma, sem banco (o caminho real fica no teste de integração). */
describe('PrismaDraftQuestionRepository', () => {
  const create = jest.fn();
  const repository = new PrismaDraftQuestionRepository({ draftQuestion: { create } } as unknown as PrismaService);

  const draft = DraftQuestion.create({
    id: EntityId.create('draft-1'),
    organizationId: OrganizationId.create('org-1'),
    type: QuestionType.SINGLE_CHOICE,
    statement: 'What is AWS?',
    alternatives: (['A', 'B', 'C', 'D'] as const).map((letter) =>
      Alternative.create({ letter, text: `Alternativa ${letter}`, isCorrect: letter === 'C' }),
    ),
  });

  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue(undefined);
  });

  it('saves the question and all alternatives in a single create call', async () => {
    await repository.save(draft);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: {
        id: 'draft-1',
        organizationId: 'org-1',
        type: QuestionType.SINGLE_CHOICE,
        statement: 'What is AWS?',
        alternatives: {
          create: [
            { letter: 'A', text: 'Alternativa A', isCorrect: false },
            { letter: 'B', text: 'Alternativa B', isCorrect: false },
            { letter: 'C', text: 'Alternativa C', isCorrect: true },
            { letter: 'D', text: 'Alternativa D', isCorrect: false },
          ],
        },
      },
    });
  });

  it('propagates persistence failures', async () => {
    create.mockRejectedValue(new Error('unique constraint'));

    await expect(repository.save(draft)).rejects.toThrow('unique constraint');
  });
});
