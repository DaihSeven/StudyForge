import { parseGenerationEvent } from './generation-events';

const draft = {
  index: 0,
  id: 'abc',
  type: 'SINGLE_CHOICE',
  statement: 'O que é S3?',
  alternatives: [
    { letter: 'A', text: 'Armazenamento de objetos', isCorrect: true },
    { letter: 'B', text: 'Banco relacional', isCorrect: false },
  ],
};

describe('parseGenerationEvent', () => {
  it('accepts a draft event', () => {
    expect(parseGenerationEvent('draft', draft)).toEqual({ event: 'draft', data: draft });
  });

  it('accepts a rejected event', () => {
    const data = { index: 1, code: 'INVALID_CORRECT_COUNT', message: 'Sem alternativa correta.' };
    expect(parseGenerationEvent('rejected', data)).toEqual({ event: 'rejected', data });
  });

  it('accepts a done event with and without notice', () => {
    const base = { draftCount: 3, rejectedCount: 0, usage: { mentor: 9, global: 39 } };
    expect(parseGenerationEvent('done', base)).toEqual({ event: 'done', data: base });
    expect(parseGenerationEvent('done', { ...base, notice: 'Aviso.' })?.data).toMatchObject({ notice: 'Aviso.' });
  });

  it('accepts an error event', () => {
    const data = { code: 'AI_PROVIDER_TIMEOUT', message: 'Demorou. Esta tentativa contou no seu limite diário.' };
    expect(parseGenerationEvent('error', data)).toEqual({ event: 'error', data });
  });

  it('returns null for an unknown event name', () => {
    expect(parseGenerationEvent('ping', {})).toBeNull();
  });

  it('returns null when the payload has the wrong shape', () => {
    expect(parseGenerationEvent('draft', { ...draft, type: 'TRUE_FALSE' })).toBeNull();
    expect(parseGenerationEvent('done', { draftCount: 1 })).toBeNull();
    expect(parseGenerationEvent('done', { draftCount: 1, rejectedCount: 0, usage: { mentor: -1, global: 0 } })).toBeNull();
    expect(parseGenerationEvent('error', null)).toBeNull();
  });
});
