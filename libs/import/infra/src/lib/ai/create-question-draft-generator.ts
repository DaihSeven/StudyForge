import { QuestionDraftGenerator } from '@studyforge/import/application';
import { AiConfig, AiConfigError } from '../ai-config/ai-config';
import { FetchLike, GroqQuestionDraftGeneratorAdapter } from '../groq/groq-question-draft-generator.adapter';
import { MockQuestionDraftGeneratorAdapter } from '../question-draft-generator/mock-question-draft-generator.adapter';

export interface CreateGeneratorDeps {
  readonly fetch?: FetchLike;
}

/** Escolhe o adaptador pelo `AI_PROVIDER`. Nunca cai em outro provedor em silêncio. */
export function createQuestionDraftGenerator(config: AiConfig, deps: CreateGeneratorDeps = {}): QuestionDraftGenerator {
  switch (config.provider) {
    case 'mock':
      return new MockQuestionDraftGeneratorAdapter();
    case 'groq':
      return new GroqQuestionDraftGeneratorAdapter({
        apiKey: config.apiKey ?? '',
        model: config.model,
        fetch: deps.fetch,
      });
    case 'google':
      throw new AiConfigError('AI_PROVIDER=google ainda não tem adaptador. Use AI_PROVIDER=groq ou AI_PROVIDER=mock.');
  }
}
