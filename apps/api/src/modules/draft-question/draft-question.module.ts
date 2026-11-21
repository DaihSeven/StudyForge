import { Module } from '@nestjs/common';
import { ImportInfraModule } from '@studyforge/import/infra';
import { DraftQuestionController } from './draft-question.controller';
import { GenerateDraftQuestionsController } from './generate-draft-questions.controller';

/** Expõe o CreateDraftQuestionUseCase (ligado aos ports pelo ImportInfraModule) via HTTP. */
@Module({
  imports: [ImportInfraModule],
  controllers: [DraftQuestionController, GenerateDraftQuestionsController],
})
export class DraftQuestionModule {}
