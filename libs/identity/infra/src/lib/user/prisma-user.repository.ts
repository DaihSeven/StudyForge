import { Injectable } from '@nestjs/common';
import { UserRepository } from '@studyforge/identity/application';
import { User } from '@studyforge/identity/domain';
import { EntityId } from '@studyforge/shared/domain';
import { PrismaService } from '@studyforge/shared/prisma';

type UserRow = { id: string; email: string; name: string; createdAt: Date };

/** Linha da tabela `users` → entidade de domínio (o tipo gerado pelo Prisma não sai da infra). */
function toDomain(row: UserRow): User {
  return User.create({ id: EntityId.create(row.id), email: row.email, name: row.name, createdAt: row.createdAt });
}

/** `UserRepository` em PostgreSQL. */
@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return toDomain(row!);
  }
}
