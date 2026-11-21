import type { DraftEvent, GenerationError, GenerationEvent, RejectedEvent } from '@studyforge/shared/contracts';

export interface GenerationState {
  readonly status: 'idle' | 'streaming' | 'done' | 'error';
  /** Quantidade pedida (o "N" de "n de N prontas"). */
  readonly requested: number;
  readonly drafts: readonly DraftEvent[];
  readonly rejected: readonly RejectedEvent[];
  /** Só existe depois do evento `done`: antes disso não há número para mostrar. */
  readonly usage: { readonly mentor: number; readonly global: number } | null;
  readonly notice: string | null;
  readonly error: GenerationError | null;
}

export type GenerationAction =
  | { readonly type: 'start'; readonly requested: number }
  | { readonly type: 'event'; readonly event: GenerationEvent };

export const initialGenerationState: GenerationState = {
  status: 'idle',
  requested: 0,
  drafts: [],
  rejected: [],
  usage: null,
  notice: null,
  error: null,
};

export function generationReducer(state: GenerationState, action: GenerationAction): GenerationState {
  if (action.type === 'start') {
    return { ...initialGenerationState, status: 'streaming', requested: action.requested };
  }

  const { event } = action;
  switch (event.event) {
    case 'draft':
      return { ...state, drafts: [...state.drafts, event.data] };
    case 'rejected':
      return { ...state, rejected: [...state.rejected, event.data] };
    case 'done':
      return { ...state, status: 'done', usage: event.data.usage, notice: event.data.notice ?? null };
    case 'error':
      return { ...state, status: 'error', error: event.data };
  }
}
