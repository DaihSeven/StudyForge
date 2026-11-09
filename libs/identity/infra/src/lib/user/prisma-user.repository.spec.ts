import { DuplicateEmailError } from '@studyforge/identity/application';
import { User } from '@studyforge/identity/domain';
import { EntityId } from '@studyforge/shared/domain';
import { Prisma, PrismaService } from '@studyforge/shared/prisma';
import { PrismaUserRepository } from './prisma-user.repository';

/**
 * Cenários BDD da spec S5 (docs/specs/s5-identity-repositories.md), um teste por cenário.
 *
 * Roda sem PostgreSQL: o que é simulado é só a fronteira com o banco (o delegate
 * `prisma.user`), como uma tabela em memória que responde pelo `where` recebido. O
 * código exercitado é o do `PrismaUserRepository` real (consulta, mapeamento da linha
 * para o domínio, tradução de erros), e os asserts olham o que ele devolve ou lança.
 */
type UserRow = { id: string; email: string; name: string; createdAt: Date };

const mentor: UserRow = {
  id: 'user-uuid-123',
  email: 'mentor@studyforge.com',
  name: 'Mentor',
  createdAt: new Date('2026-10-13T10:00:00Z'),
};

describe('S5 — identity repositories', () => {
  let table: UserRow[];
  let repository: PrismaUserRepository;

  beforeEach(() => {
    table = [];
    const userDelegate = {
      findUnique: jest.fn(async ({ where }: { where: { email?: string; id?: string } }) => {
        return table.find((row) => (where.email !== undefined ? row.email === where.email : row.id === where.id)) ?? null;
      }),
      // Como o PostgreSQL com o índice único `users_email_key`: email repetido não grava e
      // o Prisma lança P2002.
      create: jest.fn(async ({ data }: { data: UserRow }) => {
        if (table.some((row) => row.email === data.email)) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`email`)', {
            code: 'P2002',
            clientVersion: Prisma.prismaVersion.client,
            meta: { modelName: 'User', target: ['email'] },
          });
        }
        table.push(data);
        return data;
      }),
    };
    repository = new PrismaUserRepository({ user: userDelegate } as unknown as PrismaService);
  });

  it('Scenario 1: Encontrar User existente por email (Caso Feliz)', async () => {
    // Given um User com email "mentor@studyforge.com" existe no banco
    // And o email é único
    table.push(mentor);

    // When chamo UserRepository.findByEmail("mentor@studyforge.com")
    // (And nenhum erro é lançado: um erro aqui rejeitaria a promise e falharia o teste)
    const user = await repository.findByEmail('mentor@studyforge.com');

    // Then retorna um User { id, email, createdAt }
    expect(user).toBeInstanceOf(User);
    expect(user?.id.value).toBe(mentor.id);
    expect(user?.createdAt).toEqual(mentor.createdAt);
    // And o email retornado é "mentor@studyforge.com"
    expect(user?.email).toBe('mentor@studyforge.com');
  });

  it('Scenario 2: Validação falha — Email não encontrado', async () => {
    // Given nenhum User com email "notexist@studyforge.com" existe no banco
    table.push(mentor);

    // When chamo UserRepository.findByEmail("notexist@studyforge.com")
    // Then retorna null
    // And nenhum erro é lançado (findByEmail é lenient)
    await expect(repository.findByEmail('notexist@studyforge.com')).resolves.toBeNull();
  });

  it('Scenario 3: SaveUser falha — Email duplicado (Edge Case)', async () => {
    // Given um User com email "mentor@studyforge.com" já existe no banco
    table.push(mentor);

    // When tento salvar novo User com email "mentor@studyforge.com"
    const newUser = User.create({
      id: EntityId.create('user-uuid-456'),
      email: 'mentor@studyforge.com',
      name: 'Outro Mentor',
      createdAt: new Date('2026-11-09T10:00:00Z'),
    });
    const saving = repository.save(newUser);

    // Then lança DuplicateEmailError
    await expect(saving).rejects.toBeInstanceOf(DuplicateEmailError);
    // And a mensagem de erro contém "Email already in use"
    await expect(saving).rejects.toThrow('Email already in use');
    // And nenhuma alteração é feita no banco: sem PostgreSQL no CI, isso não é verificável
    // aqui de forma honesta (seria checar a tabela fake). Quem garante é o índice único
    // `users_email_key` da migration; ver LOG-RED-GREEN-REFACTOR-3.md.
  });
});
