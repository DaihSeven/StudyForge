import { Module } from '@nestjs/common';
import { CreateDraftQuestionUseCase } from '@studyforge/import/application';
import { DraftQuestionModule } from './draft-question/draft-question.module';
import { IdGeneratorModule } from './id-generator/id-generator.module';

/**
 * Wiring do contexto import: liga os ports de application às implementações da infra
 * e expõe os use cases para a api.
 */
@Module({
  imports: [IdGeneratorModule, DraftQuestionModule],
  providers: [CreateDraftQuestionUseCase],
  exports: [CreateDraftQuestionUseCase],
})
export class ImportInfraModule {}
