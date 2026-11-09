import { User } from '@studyforge/identity/domain';

/** Persistência de `User` (spec S5, ADR-003). A implementação (Prisma) fica na infra. */
export interface UserRepository {
  /** Busca um usuário pelo email. Devolve `null` quando não existe (E1). */
  findByEmail(email: string): Promise<User | null>;
}

export const USER_REPOSITORY_TOKEN = Symbol('UserRepository');
