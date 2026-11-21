import { AiConfig, AiConfigError } from '../ai-config/ai-config';
import { GroqQuestionDraftGeneratorAdapter } from '../groq/groq-question-draft-generator.adapter';
import { MockQuestionDraftGeneratorAdapter } from '../question-draft-generator/mock-question-draft-generator.adapter';
import { createQuestionDraftGenerator } from './create-question-draft-generator';

const base: AiConfig = {
  provider: 'mock',
  maxInputChars: 8000,
  dailyLimitPerMentor: 10,
  dailyLimitGlobal: 100,
};

describe('createQuestionDraftGenerator', () => {
  it('builds the mock adapter by default', () => {
    expect(createQuestionDraftGenerator(base)).toBeInstanceOf(MockQuestionDraftGeneratorAdapter);
  });

  it('builds the Groq adapter with the configured key and model', async () => {
    const fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { role: 'assistant', content: '{"questions":[]}' } }],
        }),
      ),
    );
    const generator = createQuestionDraftGenerator(
      { ...base, provider: 'groq', apiKey: 'k-1', model: 'm-1' },
      { fetch },
    );

    expect(generator).toBeInstanceOf(GroqQuestionDraftGeneratorAdapter);
    for await (const item of generator.generate({
      text: 't',
      options: { quantity: 1, alternativesPerQuestion: 4 },
    })) {
      void item;
    }
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.model).toBe('m-1');
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer k-1');
  });

  it('fails clearly for google, whose adapter does not exist yet, instead of falling back to another provider', () => {
    expect(() =>
      createQuestionDraftGenerator({
        ...base,
        provider: 'google',
        apiKey: 'k',
      }),
    ).toThrow(AiConfigError);
    expect(() =>
      createQuestionDraftGenerator({
        ...base,
        provider: 'google',
        apiKey: 'k',
      }),
    ).toThrow(/google/i);
  });
});
