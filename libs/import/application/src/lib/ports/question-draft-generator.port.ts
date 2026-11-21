import { GeneratedDraftQuestion } from '@studyforge/shared/contracts';

export interface GenerationOptions {
  /** Quantas questões gerar. */
  readonly quantity: number;
  /** Alternativas por questão (hoje: 4 = SINGLE_CHOICE, 5 = MULTIPLE_CHOICE). */
  readonly alternativesPerQuestion: number;
}

export interface QuestionDraftGenerationInput {
  readonly text: string;
  readonly options: GenerationOptions;
}

/**
 * Gera rascunhos de questões a partir de um texto. Devolve um `AsyncIterable` para que
 * as camadas acima possam transmitir (streaming) cada rascunho assim que ele existe.
 * Quem chama valida cada item: a saída de um gerador nunca é confiável.
 */
export interface QuestionDraftGenerator {
  generate(input: QuestionDraftGenerationInput): AsyncIterable<GeneratedDraftQuestion>;
}

export const QUESTION_DRAFT_GENERATOR_TOKEN = Symbol('QuestionDraftGenerator');
