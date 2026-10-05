import { Test } from '@nestjs/testing';
import { IdentityInfraModule } from './infra.module';

describe('IdentityInfraModule', () => {
  it('compiles', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [IdentityInfraModule] }).compile();

    expect(moduleRef.get(IdentityInfraModule)).toBeInstanceOf(IdentityInfraModule);
  });
});
