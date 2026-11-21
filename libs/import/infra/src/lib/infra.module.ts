import { Module } from '@nestjs/common';
import { CreateDraftQuestionUseCase, GenerateDraftQuestionsUseCase } from '@studyforge/import/application';
import { AiModule } from './ai/ai.module';
import { DraftQuestionModule } from './draft-question/draft-question.module';
import { IdGeneratorModule } from './id-generator/id-generator.module';

/**
 * Wiring do contexto import: liga os ports de application às implementações da infra
 * e expõe os use cases para a api.
 */
@Module({
  imports: [IdGeneratorModule, DraftQuestionModule, AiModule],
  providers: [CreateDraftQuestionUseCase, GenerateDraftQuestionsUseCase],
  exports: [CreateDraftQuestionUseCase, GenerateDraftQuestionsUseCase, AiModule],
})
export class ImportInfraModule {}
