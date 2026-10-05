import {
  DomainError,
  EntityId,
  InvalidEntityIdError,
  InvalidOrganizationIdError,
  OrganizationId,
} from '@studyforge/shared/domain';
import { isMembershipRole, MembershipRole } from './membership-role';

export class InvalidMembershipError extends DomainError<'INVALID_MEMBERSHIP_ROLE'> {
  constructor(role: unknown) {
    super('INVALID_MEMBERSHIP_ROLE', `Unknown membership role "${String(role)}".`);
  }
}

export interface MembershipProps {
  readonly id: EntityId;
  readonly userId: EntityId;
  readonly organizationId: OrganizationId;
  readonly role: MembershipRole;
}

/** Vínculo de um `User` com uma `Organization`, com o papel que ele exerce nela. */
export class Membership {
  private constructor(
    readonly id: EntityId,
    readonly userId: EntityId,
    readonly organizationId: OrganizationId,
    readonly role: MembershipRole,
  ) {}

  static create(props: MembershipProps): Membership {
    if (!(props.id instanceof EntityId) || !(props.userId instanceof EntityId)) {
      throw new InvalidEntityIdError();
    }
    if (!(props.organizationId instanceof OrganizationId)) {
      throw new InvalidOrganizationIdError();
    }
    if (!isMembershipRole(props.role)) {
      throw new InvalidMembershipError(props.role);
    }
    return Object.freeze(new Membership(props.id, props.userId, props.organizationId, props.role));
  }
}
