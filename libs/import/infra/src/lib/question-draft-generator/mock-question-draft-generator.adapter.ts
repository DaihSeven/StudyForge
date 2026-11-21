import { QuestionDraftGenerationInput, QuestionDraftGenerator } from '@studyforge/import/application';
import { GeneratedDraftQuestion } from '@studyforge/shared/contracts';
import { QUESTION_TYPE_RULES, QuestionType } from '@studyforge/shared/domain';

export interface MockQuestionDraftGeneratorOptions {
  /** Atraso antes de cada rascunho, em ms. Padrão 0 (testes). */
  readonly delayMs?: number;
  /** Substituível nos testes para não esperar de verdade. */
  readonly sleep?: (ms: number) => Promise<void>;
}

const realSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const EXCERPT_LENGTH = 40;

/**
 * Gerador determinístico, sem rede: é o padrão (`mock`) do ADR-010 e o único usado em testes e CI.
 * Emite os rascunhos um a um, com atraso configurável, para exercitar o streaming.
 */
export class MockQuestionDraftGeneratorAdapter implements QuestionDraftGenerator {
  private readonly delayMs: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: MockQuestionDraftGeneratorOptions = {}) {
    this.delayMs = options.delayMs ?? 0;
    this.sleep = options.sleep ?? realSleep;
  }

  async *generate({ text, options }: QuestionDraftGenerationInput): AsyncIterable<GeneratedDraftQuestion> {
    const type = (Object.values(QuestionType) as QuestionType[]).find(
      (candidate) => QUESTION_TYPE_RULES[candidate].letters.length === options.alternativesPerQuestion,
    );
    if (!type) {
      throw new RangeError(`No question type has ${options.alternativesPerQuestion} alternatives.`);
    }
    const { letters, correctCount } = QUESTION_TYPE_RULES[type];
    const excerpt = text.trim().slice(0, EXCERPT_LENGTH);

    for (let index = 0; index < options.quantity; index++) {
      if (this.delayMs > 0) {
        await this.sleep(this.delayMs);
      }
      const correctLetters = Array.from({ length: correctCount }, (_, offset) => letters[(index + offset) % letters.length]);
      yield {
        type,
        statement: `Questão ${index + 1} (mock) sobre: ${excerpt}`,
        alternatives: letters.map((letter) => ({
          letter,
          text: `Alternativa ${letter} da questão ${index + 1}`,
          isCorrect: correctLetters.includes(letter),
        })),
      };
    }
  }
}
