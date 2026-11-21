import { DomainError } from '@studyforge/shared/domain';

export type InvalidGenerationRequestCode = 'EMPTY_TEXT' | 'INVALID_QUANTITY' | 'INVALID_ALTERNATIVES_PER_QUESTION';

/** Pedido de geração de rascunhos mal formado (texto vazio, quantidade ou nº de alternativas inválidos). */
export class InvalidGenerationRequestError extends DomainError<InvalidGenerationRequestCode> {
  constructor(code: InvalidGenerationRequestCode, message: string) {
    super(code, message);
  }
}
