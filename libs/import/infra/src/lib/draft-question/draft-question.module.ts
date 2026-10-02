import { Module } from '@nestjs/common';
import { DRAFT_QUESTION_REPOSITORY_TOKEN } from '@studyforge/import/application';
import { PrismaModule } from '@studyforge/shared/prisma';
import { PrismaDraftQuestionRepository } from './prisma-draft-question.repository';

@Module({
  imports: [PrismaModule],
  providers: [{ provide: DRAFT_QUESTION_REPOSITORY_TOKEN, useClass: PrismaDraftQuestionRepository }],
  exports: [DRAFT_QUESTION_REPOSITORY_TOKEN],
})
export class DraftQuestionModule {}
