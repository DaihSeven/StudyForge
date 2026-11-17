import { PrismaService } from './prisma.service';

/** Fumaça: prova que o PrismaService conecta no banco de `DATABASE_URL` e executa uma consulta. */
describe('PrismaService (integration)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  it('runs SELECT 1 against the database', async () => {
    const rows = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1::int AS ok`;

    expect(rows).toEqual([{ ok: 1 }]);
  });
});
