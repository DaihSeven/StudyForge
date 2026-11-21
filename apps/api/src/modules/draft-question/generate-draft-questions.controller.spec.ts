import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DRAFT_QUESTION_REPOSITORY_TOKEN, QUESTION_DRAFT_GENERATOR_TOKEN } from '@studyforge/import/application';
import { AiProviderError } from '@studyforge/import/infra';
import { PrismaService } from '@studyforge/shared/prisma';
import { DraftQuestionModule } from './draft-question.module';

const AI_VARIABLES = [
  'AI_PROVIDER',
  'GROQ_API_KEY',
  'AI_MAX_INPUT_CHARS',
  'AI_DAILY_LIMIT_PER_MENTOR',
  'AI_DAILY_LIMIT_GLOBAL',
];

const alt = (letter: string, isCorrect: boolean) => ({ letter, text: `Alternativa ${letter}`, isCorrect });
const validItem = (statement = 'O que é AWS?') => ({
  type: 'SINGLE_CHOICE',
  statement,
  alternatives: [alt('A', true), alt('B', false), alt('C', false), alt('D', false)],
});
const invalidItem = { ...validItem(), alternatives: [alt('A', true), alt('B', true), alt('C', false), alt('D', false)] };

const body = (overrides: Record<string, unknown> = {}) => ({
  organizationId: 'org-1',
  mentorId: 'mentor-1',
  text: 'AWS é um provedor de nuvem.',
  quantity: 3,
  alternativesPerQuestion: 4,
  ...overrides,
});

interface SseEvent {
  event: string;
  data: any;
}

function parseSse(raw: string): SseEvent[] {
  return raw
    .split('\n\n')
    .filter((block) => block.trim() !== '')
    .map((block) => {
      const event = /^event: (.*)$/m.exec(block)?.[1] ?? '';
      const data = JSON.parse(/^data: (.*)$/m.exec(block)?.[1] ?? 'null');
      return { event, data };
    });
}

class FakeGenerator {
  constructor(
    private readonly items: unknown[],
    private readonly failure?: Error,
  ) {}

  async *generate() {
    for (const item of this.items) {
      yield item;
    }
    if (this.failure) {
      throw this.failure;
    }
  }
}

describe('POST /api/draft-questions/generate', () => {
  const saved: Record<string, string | undefined> = {};
  const repositorySaves: any[] = [];
  let app: INestApplication;
  let url: string;

  beforeEach(() => {
    repositorySaves.length = 0;
    for (const name of AI_VARIABLES) {
      saved[name] = process.env[name];
      delete process.env[name];
    }
  });

  afterEach(async () => {
    await app?.close();
    for (const name of AI_VARIABLES) {
      if (saved[name] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = saved[name];
      }
    }
  });

  async function start(env: Record<string, string> = {}, generator?: unknown) {
    Object.assign(process.env, env);
    let builder = Test.createTestingModule({ imports: [DraftQuestionModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(DRAFT_QUESTION_REPOSITORY_TOKEN)
      .useValue({ save: async (draft: unknown) => void repositorySaves.push(draft) });
    if (generator) {
      builder = builder.overrideProvider(QUESTION_DRAFT_GENERATOR_TOKEN).useValue(generator);
    }
    const moduleRef = await builder.compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0);
    url = `${await app.getUrl()}/api/draft-questions/generate`.replace('[::1]', 'localhost');
  }

  const post = (payload: unknown) =>
    fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });

  it('streams text/event-stream with one draft event per question and a final done event (mock provider)', async () => {
    await start();

    const response = await post(body());
    const events = parseSse(await response.text());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(events.map((e) => e.event)).toEqual(['draft', 'draft', 'draft', 'done']);
    expect(events[0].data).toMatchObject({ index: 0, type: 'SINGLE_CHOICE', alternatives: expect.any(Array) });
    expect(events[0].data.alternatives[0]).toEqual({ letter: 'A', text: expect.any(String), isCorrect: expect.any(Boolean) });
    expect(events[3].data).toEqual({ draftCount: 3, rejectedCount: 0, usage: { mentor: 9, global: 99 } });
  });

  it('saves the drafts under the request organizationId and never publishes', async () => {
    await start();

    await (await post(body({ quantity: 2, organizationId: 'org-77' }))).text();

    expect(repositorySaves).toHaveLength(2);
    expect(repositorySaves[0].organizationId.value).toBe('org-77');
    expect(Object.keys(repositorySaves[0])).not.toEqual(expect.arrayContaining(['published']));
  });

  it('sends rejected events for invalid items and a notice in done when every item was rejected', async () => {
    await start({}, new FakeGenerator([invalidItem, { nonsense: true }]));

    const events = parseSse(await (await post(body({ quantity: 2 }))).text());

    expect(events.map((e) => e.event)).toEqual(['rejected', 'rejected', 'done']);
    expect(events[0].data).toMatchObject({ index: 0, code: 'INVALID_CORRECT_COUNT' });
    expect(events[1].data).toMatchObject({ index: 1, code: 'INVALID_GENERATED_FORMAT' });
    expect(events[2].data).toMatchObject({ draftCount: 0, rejectedCount: 2, usage: { mentor: 9 } });
    expect(events[2].data.notice).toContain('contou');
  });

  it('keeps valid drafts when some are rejected, with no notice', async () => {
    await start({}, new FakeGenerator([validItem(), invalidItem]));

    const events = parseSse(await (await post(body({ quantity: 2 }))).text());

    expect(events.map((e) => e.event)).toEqual(['draft', 'rejected', 'done']);
    expect(events[2].data.notice).toBeUndefined();
  });

  it.each([
    ['quantity above 10', { quantity: 11 }],
    ['quantity below 1', { quantity: 0 }],
    ['an alternatives count no question type has', { alternativesPerQuestion: 3 }],
    ['a missing organizationId', { organizationId: undefined }],
    ['blank text', { text: '  ' }],
  ])('answers 400 VALIDATION_ERROR for %s, without consuming the limit', async (_name, overrides) => {
    await start();

    const response = await post(body(overrides));

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect((await response.json()).code).toBe('VALIDATION_ERROR');
    const ok = parseSse(await (await post(body())).text());
    expect(ok.at(-1)?.data.usage.mentor).toBe(9);
  });

  it('rejects text longer than AI_MAX_INPUT_CHARS with 400', async () => {
    await start({ AI_MAX_INPUT_CHARS: '20' });

    expect((await post(body({ text: 'a'.repeat(21) }))).status).toBe(400);
    expect((await post(body({ text: 'a'.repeat(20) }))).status).toBe(200);
  });

  it('answers 429 pointing to manual import when the mentor daily limit is exceeded', async () => {
    await start({ AI_DAILY_LIMIT_PER_MENTOR: '1' });

    await (await post(body())).text();
    const response = await post(body());

    expect(response.status).toBe(429);
    const error = await response.json();
    expect(error.code).toBe('AI_MENTOR_DAILY_LIMIT_EXCEEDED');
    expect(error.message).toContain('importação manual');
  });

  it('answers 429 when the global daily limit is exceeded, even for another mentor', async () => {
    await start({ AI_DAILY_LIMIT_GLOBAL: '1' });

    await (await post(body())).text();
    const response = await post(body({ mentorId: 'mentor-2' }));

    expect(response.status).toBe(429);
    expect((await response.json()).code).toBe('AI_GLOBAL_DAILY_LIMIT_EXCEEDED');
  });

  it('answers 429 when the provider itself is rate limited, before any event was sent', async () => {
    await start({}, new FakeGenerator([], new AiProviderError('AI_PROVIDER_RATE_LIMITED', 'Limite do provedor. Use a importação manual.')));

    const response = await post(body());

    expect(response.status).toBe(429);
    expect((await response.json()).code).toBe('AI_PROVIDER_RATE_LIMITED');
  });

  it('answers 502 for other provider failures before any event was sent, without leaking details', async () => {
    await start({}, new FakeGenerator([], new Error('boom gsk_secret')));

    const response = await post(body());
    const text = await response.text();

    expect(response.status).toBe(502);
    expect(text).toContain('GENERATION_FAILED');
    expect(text).not.toContain('gsk_secret');
  });

  it('sends an error event and ends the stream when the generator fails after some drafts', async () => {
    await start({}, new FakeGenerator([validItem()], new AiProviderError('AI_PROVIDER_TIMEOUT', 'Demorou demais. Use a importação manual.')));

    const response = await post(body());
    const events = parseSse(await response.text());

    expect(response.status).toBe(200);
    expect(events.map((e) => e.event)).toEqual(['draft', 'error']);
    expect(events[1].data).toEqual({ code: 'AI_PROVIDER_TIMEOUT', message: 'Demorou demais. Use a importação manual.' });
  });
});
