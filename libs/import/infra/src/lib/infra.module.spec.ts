import { Test } from '@nestjs/testing';
import {
  AI_USAGE_LIMITER_TOKEN,
  CLOCK_TOKEN,
  CreateDraftQuestionUseCase,
  GenerateDraftQuestionsUseCase,
  QUESTION_DRAFT_GENERATOR_TOKEN,
} from '@studyforge/import/application';
import { PrismaService } from '@studyforge/shared/prisma';
import { AiConfigError } from './ai-config/ai-config';
import { SaoPauloClockAdapter } from './clock/sao-paulo-clock.adapter';
import { ImportInfraModule } from './infra.module';
import { InMemoryAiUsageLimiterAdapter } from './ai-usage-limiter/in-memory-ai-usage-limiter.adapter';
import { MockQuestionDraftGeneratorAdapter } from './question-draft-generator/mock-question-draft-generator.adapter';

const AI_VARIABLES = ['AI_PROVIDER', 'AI_MODEL', 'GROQ_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'AI_MAX_INPUT_CHARS'];

describe('ImportInfraModule', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const name of AI_VARIABLES) {
      saved[name] = process.env[name];
      delete process.env[name];
    }
  });

  afterEach(() => {
    for (const name of AI_VARIABLES) {
      if (saved[name] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = saved[name];
      }
    }
  });

  const compile = () =>
    Test.createTestingModule({ imports: [ImportInfraModule] }).overrideProvider(PrismaService).useValue({}).compile();

  it('resolves CreateDraftQuestionUseCase with its ports wired', async () => {
    const moduleRef = await compile();

    expect(moduleRef.get(CreateDraftQuestionUseCase)).toBeInstanceOf(CreateDraftQuestionUseCase);
  });

  it('wires GenerateDraftQuestionsUseCase with mock, in-memory limiter and São Paulo clock by default', async () => {
    const moduleRef = await compile();

    expect(moduleRef.get(GenerateDraftQuestionsUseCase)).toBeInstanceOf(GenerateDraftQuestionsUseCase);
    expect(moduleRef.get(QUESTION_DRAFT_GENERATOR_TOKEN)).toBeInstanceOf(MockQuestionDraftGeneratorAdapter);
    expect(moduleRef.get(AI_USAGE_LIMITER_TOKEN)).toBeInstanceOf(InMemoryAiUsageLimiterAdapter);
    expect(moduleRef.get(CLOCK_TOKEN)).toBeInstanceOf(SaoPauloClockAdapter);
  });

  it('shares one limiter instance (the counter must live across requests)', async () => {
    const moduleRef = await compile();

    expect(moduleRef.get(AI_USAGE_LIMITER_TOKEN)).toBe(moduleRef.get(AI_USAGE_LIMITER_TOKEN));
  });

  it('fails on startup when AI_PROVIDER=groq has no GROQ_API_KEY', async () => {
    process.env['AI_PROVIDER'] = 'groq';

    await expect(compile()).rejects.toThrow(AiConfigError);
    await expect(compile()).rejects.toThrow(/GROQ_API_KEY/);
  });
});
