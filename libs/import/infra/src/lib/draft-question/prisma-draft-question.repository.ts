import { Injectable } from '@nestjs/common';
import { DraftQuestionRepository } from '@studyforge/import/application';
import { DraftQuestion } from '@studyforge/import/domain';
import { PrismaService } from '@studyforge/shared/prisma';

/** `DraftQuestionRepository` em PostgreSQL. Grava a questão e as alternativas numa única operação. */
@Injectable()
export class PrismaDraftQuestionRepository implements DraftQuestionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(draft: DraftQuestion): Promise<void> {
    await this.prisma.draftQuestion.create({
      data: {
        id: draft.id.value,
        organizationId: draft.organizationId.value,
        type: draft.type,
        statement: draft.statement,
        alternatives: {
          create: draft.alternatives.map((alternative) => ({
            letter: alternative.letter,
            text: alternative.text,
            isCorrect: alternative.isCorrect,
          })),
        },
      },
    });
  }
}
