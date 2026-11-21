/**
 * Falha de um `QuestionDraftGenerator` (provedor de IA). `refundable` diz se a falha ocorreu antes
 * de o provedor responder qualquer coisa (429, 5xx, timeout, rede): só nesse caso a cota é devolvida.
 */
export class QuestionDraftGeneratorError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly refundable: boolean,
  ) {
    super(message);
    this.name = 'QuestionDraftGeneratorError';
  }
}

/** Lançado por `GenerateDraftQuestions` quando o gerador falha; diz ao mentor se a tentativa contou. */
export class GenerationFailedError extends Error {
  readonly code: string;

  constructor(
    readonly generatorError: QuestionDraftGeneratorError,
    readonly quotaRefunded: boolean,
  ) {
    super(
      `${generatorError.message} ${
        quotaRefunded ? 'Esta tentativa não contou no seu limite diário.' : 'Esta tentativa contou no seu limite diário.'
      }`,
    );
    this.name = 'GenerationFailedError';
    this.code = generatorError.code;
  }
}
