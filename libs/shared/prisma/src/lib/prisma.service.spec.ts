import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  const original = process.env['DATABASE_URL'];

  afterEach(() => {
    process.env['DATABASE_URL'] = original;
  });

  it('fails fast when DATABASE_URL is not set', () => {
    delete process.env['DATABASE_URL'];

    expect(() => new PrismaService()).toThrow('DATABASE_URL is not set.');
  });

  // O Prisma 7 devolve um Proxy no construtor (`instanceof` falha), por isso a checagem é
  // pelos hooks de ciclo de vida que o Nest chama e pelo delegate do model.
  it('builds a client without connecting when DATABASE_URL is set', () => {
    process.env['DATABASE_URL'] = 'postgresql://user:pass@localhost:5432/db';

    const service = new PrismaService();

    expect(typeof service.onModuleInit).toBe('function');
    expect(typeof service.onModuleDestroy).toBe('function');
    expect(service.draftQuestion).toBeDefined();
  });
});
