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

  describe('lifecycle hooks', () => {
    let service: PrismaService;

    beforeEach(() => {
      process.env['DATABASE_URL'] = 'postgresql://user:pass@localhost:5432/db';
      service = new PrismaService();
    });

    it('connects to the database on module init', async () => {
      const connect = jest.spyOn(service, '$connect').mockResolvedValue();

      await service.onModuleInit();

      expect(connect).toHaveBeenCalledTimes(1);
    });

    it('propagates connection failures on module init', async () => {
      jest.spyOn(service, '$connect').mockRejectedValue(new Error('connection refused'));

      await expect(service.onModuleInit()).rejects.toThrow('connection refused');
    });

    it('disconnects from the database on module destroy', async () => {
      const disconnect = jest.spyOn(service, '$disconnect').mockResolvedValue();

      await service.onModuleDestroy();

      expect(disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
