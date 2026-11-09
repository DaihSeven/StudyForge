import { User } from '@studyforge/identity/domain';

/** Persistência de `User` (spec S5, ADR-003). A implementação (Prisma) fica na infra. */
export interface UserRepository {
  /** Busca um usuário pelo email. Devolve `null` quando não existe (E1). */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Persiste o usuário e o devolve. Lança `DuplicateEmailError` se o email já pertence a
   * outro User (E3); nesse caso nada é gravado.
   */
  save(user: User): Promise<User>;
}

export const USER_REPOSITORY_TOKEN = Symbol('UserRepository');
