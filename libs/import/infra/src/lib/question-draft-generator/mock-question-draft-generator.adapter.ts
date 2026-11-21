import { QuestionDraftGenerationInput, QuestionDraftGenerator } from '@studyforge/import/application';
import { GeneratedDraftQuestion } from '@studyforge/shared/contracts';

export interface MockQuestionDraftGeneratorOptions {
  /** Atraso entre rascunhos, em ms. Padrão 0 (testes). */
  readonly delayMs?: number;
  /** Substituível nos testes para não esperar de verdade. */
  readonly sleep?: (ms: number) => Promise<void>;
}

/** Stub (RED): o comportamento real vem no commit green. */
export class MockQuestionDraftGeneratorAdapter implements QuestionDraftGenerator {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub
  constructor(_options: MockQuestionDraftGeneratorOptions = {}) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, require-yield -- stub
  async *generate(_input: QuestionDraftGenerationInput): AsyncIterable<GeneratedDraftQuestion> {
    throw new Error('MockQuestionDraftGeneratorAdapter ainda não implementado.');
  }
}
