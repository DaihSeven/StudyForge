/**
 * Gera identificadores para novas entidades. A implementação (ex.: `crypto.randomUUID()`)
 * fica na infra, porque depende de API de runtime.
 */
export interface IdGenerator {
  generate(): string;
}

export const ID_GENERATOR_TOKEN = Symbol('IdGenerator');
