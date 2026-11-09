import { Injectable } from '@nestjs/common';
import { UserRepository } from '@studyforge/identity/application';
import { User } from '@studyforge/identity/domain';
import { PrismaService } from '@studyforge/shared/prisma';
import { EntityId } from '@studyforge/shared/domain';

/** `UserRepository` em PostgreSQL. */
@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return User.create({ id: EntityId.create(row!.id), email: row!.email, name: row!.name, createdAt: row!.createdAt });
  }
}
