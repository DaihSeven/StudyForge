import { DomainError, EntityId, InvalidEntityIdError } from '@studyforge/shared/domain';

export type InvalidUserCode = 'INVALID_EMAIL' | 'EMPTY_USER_NAME';

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
    return Object.freeze(new User(props.id, email, props.name));
  }
}
