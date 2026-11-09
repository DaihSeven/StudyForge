import { DomainError } from '@studyforge/shared/domain';

/**
 * Já existe um User com esse email (invariante 4 da S5: email único). Lançado por
 * `UserRepository.save`; quem detecta a colisão é a persistência, não a entidade.
 */
export class DuplicateEmailError extends DomainError<'DUPLICATE_EMAIL'> {
  constructor(email: string) {
    super('DUPLICATE_EMAIL', `Email already in use: ${email}`);
  }
}
