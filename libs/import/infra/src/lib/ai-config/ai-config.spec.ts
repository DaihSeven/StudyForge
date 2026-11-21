import { AiConfigError, buildAiStartupWarnings, describeAiConfig, loadAiConfig } from './ai-config';

const SECRET = 'gsk_super-secret-value';

describe('loadAiConfig', () => {
  it('defaults to the mock provider with 8000 chars, 10 per mentor and no key needed', () => {
    const config = loadAiConfig({});

    expect(config).toMatchObject({ provider: 'mock', maxInputChars: 8000, dailyLimitPerMentor: 10 });
    expect(config.dailyLimitGlobal).toBe(40);
    expect(config.apiKey).toBeUndefined();
  });

  it('treats empty strings as unset', () => {
    expect(loadAiConfig({ AI_PROVIDER: '', AI_MODEL: '', AI_MAX_INPUT_CHARS: '' })).toMatchObject({
      provider: 'mock',
      maxInputChars: 8000,
    });
    expect(loadAiConfig({ AI_MODEL: '' }).model).toBeUndefined();
  });

  it('reads groq with its key and an optional model override', () => {
    const config = loadAiConfig({ AI_PROVIDER: 'groq', GROQ_API_KEY: SECRET, AI_MODEL: 'openai/gpt-oss-20b' });

    expect(config).toMatchObject({ provider: 'groq', apiKey: SECRET, model: 'openai/gpt-oss-20b' });
  });

  it('reads google with its own key variable', () => {
    const config = loadAiConfig({ AI_PROVIDER: 'google', GOOGLE_GENERATIVE_AI_API_KEY: SECRET });

    expect(config).toMatchObject({ provider: 'google', apiKey: SECRET });
  });

  it('fails on startup when the chosen provider has no key, naming the variable', () => {
    expect(() => loadAiConfig({ AI_PROVIDER: 'groq' })).toThrow(AiConfigError);
    expect(() => loadAiConfig({ AI_PROVIDER: 'groq' })).toThrow(/GROQ_API_KEY/);
    expect(() => loadAiConfig({ AI_PROVIDER: 'google' })).toThrow(/GOOGLE_GENERATIVE_AI_API_KEY/);
  });

  it('never falls back silently: the other provider key does not satisfy the chosen one', () => {
    expect(() => loadAiConfig({ AI_PROVIDER: 'groq', GOOGLE_GENERATIVE_AI_API_KEY: SECRET })).toThrow(/GROQ_API_KEY/);
    expect(() => loadAiConfig({ AI_PROVIDER: 'google', GROQ_API_KEY: SECRET })).toThrow(/GOOGLE_GENERATIVE_AI_API_KEY/);
  });

  it('rejects an unknown provider', () => {
    expect(() => loadAiConfig({ AI_PROVIDER: 'openai' })).toThrow(/AI_PROVIDER/);
  });

  it.each([
    ['AI_MAX_INPUT_CHARS', '0'],
    ['AI_MAX_INPUT_CHARS', 'abc'],
    ['AI_DAILY_LIMIT_PER_MENTOR', '-1'],
    ['AI_DAILY_LIMIT_PER_MENTOR', '1.5'],
    ['AI_DAILY_LIMIT_GLOBAL', '0'],
  ])('rejects %s=%s naming the variable', (name, value) => {
    expect(() => loadAiConfig({ [name]: value })).toThrow(new RegExp(name));
  });

  it('reads numeric limits from the environment', () => {
    expect(
      loadAiConfig({ AI_MAX_INPUT_CHARS: '500', AI_DAILY_LIMIT_PER_MENTOR: '3', AI_DAILY_LIMIT_GLOBAL: '40' }),
    ).toMatchObject({ maxInputChars: 500, dailyLimitPerMentor: 3, dailyLimitGlobal: 40 });
  });

  it('never puts the key in an error message', () => {
    const attempts = [
      { AI_PROVIDER: 'openai', GROQ_API_KEY: SECRET },
      { AI_PROVIDER: 'groq', GROQ_API_KEY: SECRET, AI_MAX_INPUT_CHARS: 'x' },
      { AI_PROVIDER: 'google', GROQ_API_KEY: SECRET },
    ];
    for (const env of attempts) {
      expect(() => loadAiConfig(env)).toThrow(AiConfigError);
      try {
        loadAiConfig(env);
      } catch (error) {
        expect((error as Error).message).not.toContain(SECRET);
      }
    }
  });
});

describe('describeAiConfig', () => {
  it('summarizes the config without the key', () => {
    const summary = describeAiConfig(loadAiConfig({ AI_PROVIDER: 'groq', GROQ_API_KEY: SECRET }));

    expect(summary).toContain('groq');
    expect(summary).toContain('8000');
    expect(summary).not.toContain(SECRET);
  });
});

describe('buildAiStartupWarnings', () => {
  it('has no warning for the mock provider', () => {
    expect(buildAiStartupWarnings(loadAiConfig({}))).toEqual([]);
  });

  it('warns that the endpoint has no authentication until Marco 3.2 when a real provider is on', () => {
    const warnings = buildAiStartupWarnings(loadAiConfig({ AI_PROVIDER: 'groq', GROQ_API_KEY: SECRET }));

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('endpoint sem autenticação até o Marco 3.2');
    expect(warnings[0]).toContain('não expor publicamente');
  });

  it('never includes the key in a warning', () => {
    const warnings = buildAiStartupWarnings(loadAiConfig({ AI_PROVIDER: 'groq', GROQ_API_KEY: SECRET }));

    expect(warnings.join(' ')).not.toContain(SECRET);
  });
});
