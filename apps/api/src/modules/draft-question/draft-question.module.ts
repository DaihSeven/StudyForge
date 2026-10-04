import { Module } from '@nestjs/common';
import { ImportInfraModule } from '@studyforge/import/infra';
import { DraftQuestionController } from './draft-question.controller';

/** Expõe o CreateDraftQuestionUseCase (ligado aos ports pelo ImportInfraModule) via HTTP. */
@Module({
  imports: [ImportInfraModule],
  controllers: [DraftQuestionController],
})
export class DraftQuestionModule {}
