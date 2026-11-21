import type { GenerationEvent } from '@studyforge/shared/contracts';
import { generationReducer, initialGenerationState, type GenerationState } from '../src/lib/generation-state';
import { sampleDone, sampleDraft } from './helpers/fake-fetch';

const draftEvent = (index: number): GenerationEvent => ({
  event: 'draft',
  data: { ...sampleDraft, index, id: `d${index}`, type: 'SINGLE_CHOICE' },
});

const apply = (state: GenerationState, event: GenerationEvent) => generationReducer(state, { type: 'event', event });

describe('generationReducer', () => {
  it('starts streaming with the requested quantity and clears the previous run', () => {
    const previous = apply(generationReducer(initialGenerationState, { type: 'start', requested: 3 }), draftEvent(0));
    const state = generationReducer(previous, { type: 'start', requested: 5 });

    expect(state).toEqual({ ...initialGenerationState, status: 'streaming', requested: 5 });
  });

  it('appends drafts in arrival order', () => {
    let state = generationReducer(initialGenerationState, { type: 'start', requested: 3 });
    state = apply(state, draftEvent(0));
    state = apply(state, draftEvent(1));

    expect(state.drafts.map((d) => d.index)).toEqual([0, 1]);
    expect(state.status).toBe('streaming');
  });

  it('collects rejected items without turning them into drafts', () => {
    let state = generationReducer(initialGenerationState, { type: 'start', requested: 2 });
    state = apply(state, { event: 'rejected', data: { index: 1, code: 'INVALID_CORRECT_COUNT', message: 'Sem correta.' } });

    expect(state.rejected).toHaveLength(1);
    expect(state.drafts).toHaveLength(0);
  });

  it('has no usage numbers until the done event', () => {
    let state = generationReducer(initialGenerationState, { type: 'start', requested: 1 });
    state = apply(state, draftEvent(0));
    expect(state.usage).toBeNull();

    state = apply(state, { event: 'done', data: sampleDone });
    expect(state.status).toBe('done');
    expect(state.usage).toEqual({ mentor: 9, global: 39 });
    expect(state.notice).toBeNull();
  });

  it('keeps the notice sent with done', () => {
    const state = apply(generationReducer(initialGenerationState, { type: 'start', requested: 1 }), {
      event: 'done',
      data: { ...sampleDone, notice: 'Esta tentativa contou.' },
    });

    expect(state.notice).toBe('Esta tentativa contou.');
  });

  it('keeps the drafts already received when an error arrives, and shows no usage', () => {
    let state = generationReducer(initialGenerationState, { type: 'start', requested: 3 });
    state = apply(state, draftEvent(0));
    state = apply(state, { event: 'error', data: { code: 'AI_PROVIDER_TIMEOUT', message: 'Demorou. Esta tentativa contou.' } });

    expect(state.status).toBe('error');
    expect(state.error?.message).toContain('contou');
    expect(state.drafts).toHaveLength(1);
    expect(state.usage).toBeNull();
  });
});
