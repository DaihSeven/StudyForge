import { DomainError, InvalidOrganizationIdError, OrganizationId } from '@studyforge/shared/domain';

export class InvalidOrganizationError extends DomainError<'EMPTY_ORGANIZATION_NAME'> {
  constructor() {
    super('EMPTY_ORGANIZATION_NAME', 'Organization name cannot be empty.');
  }
}

export interface OrganizationProps {
  readonly id: OrganizationId;
  readonly name: string;
}

/**
 * A organização (tenant). O próprio `id` é o `OrganizationId` que os recursos da organização
 * carregam. Convite/aprovação/código de entrada estão fora de escopo (CLAUDE.md §4).
 */
export class Organization {
  private constructor(
    readonly id: OrganizationId,
    readonly name: string,
  ) {}

  static create(props: OrganizationProps): Organization {
    if (!(props.id instanceof OrganizationId)) {
      throw new InvalidOrganizationIdError();
    }
    if (typeof props.name !== 'string' || props.name.trim() === '') {
      throw new InvalidOrganizationError();
    }
    return Object.freeze(new Organization(props.id, props.name));
  }
}
