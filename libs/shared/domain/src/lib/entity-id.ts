import { DomainError } from './domain-error';

export class InvalidEntityIdError extends DomainError<'INVALID_ENTITY_ID'> {
  constructor() {
    super('INVALID_ENTITY_ID', 'Entity id must be a non-empty string.');
  }
}

/**
 * Identificador de uma entidade. Não gera valores: a geração é responsabilidade de
 * um port (`IdGenerator`) fora do domínio, que não depende de APIs de runtime.
 */
export class EntityId {
  private constructor(readonly value: string) {}

  static create(value: string): EntityId {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new InvalidEntityIdError();
    }
    return Object.freeze(new EntityId(value));
  }

  equals(other: EntityId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
