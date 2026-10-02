import { DraftQuestion } from '@studyforge/import/domain';
import { Alternative, EntityId, OrganizationId, QuestionType } from '@studyforge/shared/domain';
import { PrismaService } from '@studyforge/shared/prisma';
import { randomUUID } from 'node:crypto';
import { PrismaDraftQuestionRepository } from './prisma-draft-question.repository';

/** Grava no banco de `DATABASE_URL`. Cada execução usa uma organização própria e apaga o que criou. */
describe('PrismaDraftQuestionRepository (integration)', () => {
  const organizationId = `it-org-${randomUUID()}`;
  let prisma: PrismaService;
  let repository: PrismaDraftQuestionRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    repository = new PrismaDraftQuestionRepository(prisma);
  });

  afterAll(async () => {
    await prisma.draftQuestion.deleteMany({ where: { organizationId } });
    await prisma.onModuleDestroy();
  });

  function draft(correct: string): DraftQuestion {
    return DraftQuestion.create({
      id: EntityId.create(randomUUID()),
      organizationId: OrganizationId.create(organizationId),
      type: QuestionType.SINGLE_CHOICE,
      statement: 'What is AWS?',
      alternatives: (['A', 'B', 'C', 'D'] as const).map((letter) =>
        Alternative.create({ letter, text: `Alternativa ${letter}`, isCorrect: letter === correct }),
      ),
    });
  }

  it('persists the question with its alternatives', async () => {
    const question = draft('B');

    await repository.save(question);

    const row = await prisma.draftQuestion.findUnique({
      where: { id: question.id.value },
      include: { alternatives: { orderBy: { letter: 'asc' } } },
    });
    expect(row).toMatchObject({
      id: question.id.value,
      organizationId,
      type: 'SINGLE_CHOICE',
      statement: 'What is AWS?',
    });
    expect(row?.alternatives.map((a) => [a.letter, a.text, a.isCorrect])).toEqual([
      ['A', 'Alternativa A', false],
      ['B', 'Alternativa B', true],
      ['C', 'Alternativa C', false],
      ['D', 'Alternativa D', false],
    ]);
  });

  it('rejects saving the same id twice', async () => {
    const question = draft('A');
    await repository.save(question);

    await expect(repository.save(question)).rejects.toThrow();
  });
});
