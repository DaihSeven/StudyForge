import { Logger, Module } from '@nestjs/common';
import { AI_USAGE_LIMITER_TOKEN, CLOCK_TOKEN, QUESTION_DRAFT_GENERATOR_TOKEN } from '@studyforge/import/application';
import { AI_CONFIG_TOKEN, AiConfig, buildAiStartupWarnings, loadAiConfig } from '../ai-config/ai-config';
import { InMemoryAiUsageLimiterAdapter } from '../ai-usage-limiter/in-memory-ai-usage-limiter.adapter';
import { SaoPauloClockAdapter } from '../clock/sao-paulo-clock.adapter';
import { createQuestionDraftGenerator } from './create-question-draft-generator';

/**
 * Liga os ports da geração por IA. Lê `process.env` na subida (falha sem chave do provedor escolhido).
 * O limiter é singleton do módulo: o contador em memória precisa viver entre requisições.
 */
@Module({
  providers: [
    {
      provide: AI_CONFIG_TOKEN,
      useFactory: (): AiConfig => loadAiConfig(process.env),
    },
    { provide: CLOCK_TOKEN, useFactory: () => new SaoPauloClockAdapter() },
    {
      provide: AI_USAGE_LIMITER_TOKEN,
      inject: [AI_CONFIG_TOKEN, CLOCK_TOKEN],
      useFactory: (config: AiConfig, clock: SaoPauloClockAdapter) =>
        new InMemoryAiUsageLimiterAdapter({
          clock,
          dailyLimitGlobal: config.dailyLimitGlobal,
          dailyLimitPerMentor: config.dailyLimitPerMentor,
        }),
    },
    {
      provide: QUESTION_DRAFT_GENERATOR_TOKEN,
      inject: [AI_CONFIG_TOKEN],
      useFactory: (config: AiConfig) => createQuestionDraftGenerator(config),
    },
  ],
  exports: [AI_CONFIG_TOKEN, CLOCK_TOKEN, AI_USAGE_LIMITER_TOKEN, QUESTION_DRAFT_GENERATOR_TOKEN],
})
export class AiModule {}
