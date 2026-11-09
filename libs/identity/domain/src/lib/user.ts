import { DomainError, EntityId, InvalidEntityIdError } from '@studyforge/shared/domain';

export type InvalidUserCode = 'INVALID_EMAIL' | 'EMPTY_USER_NAME' | 'INVALID_CREATED_AT';

export class InvalidUserError extends DomainError<InvalidUserCode> {
  constructor(code: InvalidUserCode, message: string) {
    super(code, message);
  }
}

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface UserProps {
  readonly id: EntityId;
  readonly email: string;
  readonly name: string;
  readonly createdAt: Date;
}

/**
 * Identidade global do usuário. Não carrega `organizationId`: o vínculo com organizações
 * é modelado por `Membership` (README, seção 6.1).
 */
export class User {
  private constructor(
    readonly id: EntityId,
    readonly email: string,
    readonly name: string,
    readonly createdAt: Date,
  ) {}

  static create(props: UserProps): User {
    if (!(props.id instanceof EntityId)) {
      throw new InvalidEntityIdError();
    }
    const email = typeof props.email === 'string' ? props.email.trim() : '';
    if (!EMAIL_FORMAT.test(email)) {
      throw new InvalidUserError('INVALID_EMAIL', `Invalid email "${String(props.email)}".`);
    }
    if (typeof props.name !== 'string' || props.name.trim() === '') {
      throw new InvalidUserError('EMPTY_USER_NAME', 'User name cannot be empty.');
    }
    if (!(props.createdAt instanceof Date) || Number.isNaN(props.createdAt.getTime())) {
      throw new InvalidUserError('INVALID_CREATED_AT', 'User createdAt must be a valid date.');
    }
    return Object.freeze(new User(props.id, email, props.name, props.createdAt));
  }
}
