import { Injectable } from '@nestjs/common';
import { DuplicateEmailError, UserRepository } from '@studyforge/identity/application';
import { User } from '@studyforge/identity/domain';
import { EntityId } from '@studyforge/shared/domain';
import { Prisma, PrismaService } from '@studyforge/shared/prisma';

type UserRow = { id: string; email: string; name: string; createdAt: Date };

/** Linha da tabela `users` → entidade de domínio (o tipo gerado pelo Prisma não sai da infra). */
function toDomain(row: UserRow): User {
  return User.create({ id: EntityId.create(row.id), email: row.email, name: row.name, createdAt: row.createdAt });
}

/** P2002: o banco recusou a escrita por violar um índice único (aqui, `users_email_key`). */
function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/** `UserRepository` em PostgreSQL. */
@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? toDomain(row) : null;
  }

  async save(user: User): Promise<User> {
    try {
      await this.prisma.user.create({
        data: { id: user.id.value, email: user.email, name: user.name, createdAt: user.createdAt },
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new DuplicateEmailError(user.email);
      }
      throw error;
    }
    return user;
  }
}
