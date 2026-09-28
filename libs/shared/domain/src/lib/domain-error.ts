/**
 * Base de todos os erros de domínio. O `code` é o contrato estável que outras
 * camadas (e os testes) devem usar; a mensagem é apenas informativa.
 */
export abstract class DomainError<TCode extends string = string> extends Error {
  protected constructor(
    readonly code: TCode,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
