import { DomainError } from './domain-error';

export class InvalidOrganizationIdError extends DomainError<'INVALID_ORGANIZATION_ID'> {
  constructor() {
    super('INVALID_ORGANIZATION_ID', 'Organization id must be a non-empty string.');
  }
}

/** Identificador da organização dona de um recurso. Apenas garante que não é vazio. */
export class OrganizationId {
  private constructor(readonly value: string) {}

  static create(value: string): OrganizationId {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new InvalidOrganizationIdError();
    }
    return Object.freeze(new OrganizationId(value));
  }
}
