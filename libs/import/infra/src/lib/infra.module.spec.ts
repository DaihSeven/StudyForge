import { Test } from '@nestjs/testing';
import { CreateDraftQuestionUseCase } from '@studyforge/import/application';
import { PrismaService } from '@studyforge/shared/prisma';
import { ImportInfraModule } from './infra.module';

describe('ImportInfraModule', () => {
  it('resolves CreateDraftQuestionUseCase with its ports wired', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ImportInfraModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(moduleRef.get(CreateDraftQuestionUseCase)).toBeInstanceOf(CreateDraftQuestionUseCase);
  });
});
