import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaService } from './prisma.service';

// Repassa para o PrismaPg real (o client continua sendo construído de verdade), mas
// registra com que configuração o PrismaService criou o adapter.
jest.mock('@prisma/adapter-pg', () => {
  const actual = jest.requireActual<typeof import('@prisma/adapter-pg')>('@prisma/adapter-pg');
  return {
    ...actual,
    PrismaPg: jest.fn((...args: ConstructorParameters<typeof actual.PrismaPg>) => new actual.PrismaPg(...args)),
  };
});

describe('PrismaService', () => {
  const original = process.env['DATABASE_URL'];

  afterEach(() => {
    process.env['DATABASE_URL'] = original;
  });

  it('fails fast when DATABASE_URL is not set', () => {
    delete process.env['DATABASE_URL'];

    expect(() => new PrismaService()).toThrow('DATABASE_URL is not set.');
  });

  it('builds the pg adapter from DATABASE_URL without connecting', () => {
    process.env['DATABASE_URL'] = 'postgresql://user:pass@localhost:5432/db';
    jest.mocked(PrismaPg).mockClear();
    const connect = jest.spyOn(PrismaService.prototype, '$connect');

    new PrismaService();

    expect(PrismaPg).toHaveBeenCalledTimes(1);
    expect(PrismaPg).toHaveBeenCalledWith({ connectionString: 'postgresql://user:pass@localhost:5432/db' });
    expect(connect).not.toHaveBeenCalled();
    connect.mockRestore();
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
