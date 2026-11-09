import { Injectable } from '@nestjs/common';
import { UserRepository } from '@studyforge/identity/application';
import { User } from '@studyforge/identity/domain';
import { PrismaService } from '@studyforge/shared/prisma';

/** `UserRepository` em PostgreSQL. */
@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Contrato apenas: o comportamento entra no ciclo red/green do cenário 1 (LOG-RED-GREEN-REFACTOR-1.md).
  async findByEmail(): Promise<User | null> {
    return null;
  }
}
