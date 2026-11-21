import { QuestionDraftGenerationInput, QuestionDraftGenerator } from '@studyforge/import/application';
import { GeneratedDraftQuestion } from '@studyforge/shared/contracts';

export const GROQ_DEFAULT_MODEL = 'openai/gpt-oss-120b';
export const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const MAX_CORRECTION_ROUNDS = 2;

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface GroqQuestionDraftGeneratorOptions {
  readonly apiKey: string;
  readonly model?: string;
  readonly fetch?: FetchLike;
  readonly timeoutMs?: number;
}

export class GroqQuestionDraftGeneratorAdapter implements QuestionDraftGenerator {
  constructor(options: GroqQuestionDraftGeneratorOptions) {
    void options;
  }

  // eslint-disable-next-line require-yield
  async *generate(input: QuestionDraftGenerationInput): AsyncIterable<GeneratedDraftQuestion> {
    void input;
    throw new Error('GroqQuestionDraftGeneratorAdapter ainda não implementado.');
  }
}
