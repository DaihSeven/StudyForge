import { QuestionDraftGenerator } from '@studyforge/import/application';
import { AiConfig } from '../ai-config/ai-config';
import { FetchLike } from '../groq/groq-question-draft-generator.adapter';

export interface CreateGeneratorDeps {
  readonly fetch?: FetchLike;
}

export function createQuestionDraftGenerator(config: AiConfig, deps: CreateGeneratorDeps = {}): QuestionDraftGenerator {
  void config;
  void deps;
  throw new Error('createQuestionDraftGenerator ainda não implementado.');
}
