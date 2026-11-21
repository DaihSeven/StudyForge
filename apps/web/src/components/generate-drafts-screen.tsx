'use client';

import {
  createGenerateDraftQuestionsRequestSchema,
  MAX_GENERATION_QUANTITY,
  QUESTION_TYPE_CHOICES,
  type GenerateDraftQuestionsRequest,
} from '@studyforge/shared/contracts';
import { useEffect, useId, useReducer, useRef, useState, type FormEvent } from 'react';
import { streamGeneration } from '../lib/generate-drafts-client';
import { generationReducer, initialGenerationState } from '../lib/generation-state';
import { DraftCard, MARCO_3_5_NOTE } from './draft-card';
import styles from './generate-drafts-screen.module.css';

/** Mesmo valor padrão de AI_MAX_INPUT_CHARS na API; se o servidor tiver outro, ele responde 400 com a mensagem. */
export const DEFAULT_MAX_INPUT_CHARS = 8000;

const QUANTITIES = [3, 5, MAX_GENERATION_QUANTITY];
const TYPE_LABELS: Record<string, string> = { SINGLE_CHOICE: 'Escolha única', MULTIPLE_CHOICE: 'Múltipla escolha' };

export interface GenerateDraftsScreenProps {
  /** TEMPORÁRIO até o Marco 3.2 (autenticação): vem de NEXT_PUBLIC_DEMO_ORGANIZATION_ID. */
  readonly organizationId: string | null;
  /** TEMPORÁRIO até o Marco 3.2 (autenticação): vem de NEXT_PUBLIC_DEMO_MENTOR_ID. */
  readonly mentorId: string | null;
  readonly maxInputChars?: number;
  readonly fetchImpl?: typeof fetch;
}

const formatNumber = (value: number) => value.toLocaleString('pt-BR');
const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

function typeOptionLabel(type: string, alternatives: number, correct: number): string {
  const last = String.fromCharCode(64 + alternatives);
  return `${TYPE_LABELS[type] ?? type}: ${alternatives} alternativas (A–${last}), ${correct} ${plural(correct, 'correta', 'corretas')}`;
}

export function GenerateDraftsScreen({
  organizationId,
  mentorId,
  maxInputChars = DEFAULT_MAX_INPUT_CHARS,
  fetchImpl,
}: GenerateDraftsScreenProps) {
  const ids = useId();
  const [text, setText] = useState('');
  const [typeValue, setTypeValue] = useState<string>(QUESTION_TYPE_CHOICES[0].type);
  const [quantity, setQuantity] = useState(5);
  const [blank, setBlank] = useState(false);
  const [state, dispatch] = useReducer(generationReducer, initialGenerationState);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const identityMissing = !organizationId || !mentorId;
  const streaming = state.status === 'streaming';
  const over = Math.max(0, text.length - maxInputChars);
  const submitDisabled = streaming || over > 0 || identityMissing;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitDisabled) {
      return;
    }
    if (text.trim() === '') {
      setBlank(true);
      return;
    }

    const choice = QUESTION_TYPE_CHOICES.find((c) => c.type === typeValue) ?? QUESTION_TYPE_CHOICES[0];
    const request: GenerateDraftQuestionsRequest = createGenerateDraftQuestionsRequestSchema(maxInputChars).parse({
      organizationId,
      mentorId,
      text,
      quantity,
      alternativesPerQuestion: choice.alternativesPerQuestion,
    });

    controller.current?.abort();
    controller.current = new AbortController();
    dispatch({ type: 'start', requested: quantity });
    await streamGeneration({
      request,
      fetchImpl,
      signal: controller.current.signal,
      onEvent: (generationEvent) => dispatch({ type: 'event', event: generationEvent }),
    });
  }

  const progress = streaming ? 'Gerando' : state.status === 'done' ? 'Concluído' : null;
  const mentorLeft = state.usage?.mentor;

  return (
    <div className={styles.page}>
      <section className={styles.band}>
        <div className={styles.bandInner}>
          <h1 className={styles.h1}>Novos rascunhos</h1>
          <p className={styles.intro}>
            Traga o material do seu curso. O sistema transforma em questões editáveis, e você decide o que vira simulado.
            Nada é publicado sozinho.
          </p>
        </div>
      </section>

      <div className={styles.columns}>
        <section className={styles.panel} aria-labelledby={`${ids}-material`}>
          <h2 id={`${ids}-material`} className={styles.h2}>
            1. Material
          </h2>

          <div role="tablist" aria-label="Origem do material" className={styles.tabs}>
            <button type="button" role="tab" aria-selected="true" aria-controls={`${ids}-panel`} className={`${styles.tab} ${styles.tabActive} ${styles.bitcount}`}>
              Gerar com IA
            </button>
            <button type="button" role="tab" aria-selected="false" disabled className={`${styles.tab} ${styles.tabDisabled} ${styles.bitcount}`}>
              Importar arquivo<span className="sr-only"> (chega no Marco 3.3)</span>
            </button>
          </div>

          <form id={`${ids}-panel`} role="tabpanel" onSubmit={onSubmit} noValidate>
            <label htmlFor={`${ids}-text`} className={`${styles.label} ${styles.bitcount}`}>
              Texto de estudo
            </label>
            <textarea
              id={`${ids}-text`}
              className={styles.textarea}
              rows={10}
              value={text}
              aria-invalid={over > 0 || blank}
              aria-describedby={`${ids}-count ${ids}-text-error`}
              onChange={(e) => {
                setText(e.target.value);
                setBlank(false);
              }}
            />
            <p id={`${ids}-count`} className={styles.counter}>
              {`${formatNumber(text.length)} de ${formatNumber(maxInputChars)} caracteres`}
            </p>
            <p id={`${ids}-text-error`} className={styles.fieldError}>
              {over > 0 &&
                `O texto passou do limite em ${formatNumber(over)} ${plural(over, 'caractere', 'caracteres')}. Reduza o texto para gerar.`}
              {blank && 'Escreva ou cole o texto de estudo antes de gerar.'}
            </p>

            <label htmlFor={`${ids}-type`} className={styles.label}>
              Tipo de questão
            </label>
            <select id={`${ids}-type`} className={styles.select} value={typeValue} onChange={(e) => setTypeValue(e.target.value)}>
              {QUESTION_TYPE_CHOICES.map((choice) => (
                <option key={choice.type} value={choice.type}>
                  {typeOptionLabel(choice.type, choice.alternativesPerQuestion, choice.correctCount)}
                </option>
              ))}
            </select>

            <fieldset className={styles.fieldset}>
              <legend className={styles.label}>Quantidade de questões</legend>
              <div className={styles.quantities}>
                {QUANTITIES.map((value) => (
                  <label key={value} className={styles.quantity}>
                    <input type="radio" name={`${ids}-quantity`} value={value} checked={quantity === value} onChange={() => setQuantity(value)} />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {identityMissing && (
              <p className={styles.fieldError}>
                Configuração temporária ausente: defina NEXT_PUBLIC_DEMO_ORGANIZATION_ID e NEXT_PUBLIC_DEMO_MENTOR_ID no ambiente
                do web (vale só até o Marco 3.2).
              </p>
            )}

            <button type="submit" className={`${styles.primary} ${styles.bitcount}`} disabled={submitDisabled}>
              Gerar rascunhos
            </button>
            {mentorLeft !== undefined && (
              <p className={styles.usage}>
                {mentorLeft === 0
                  ? 'Você não tem mais gerações hoje'
                  : `${plural(mentorLeft, 'Resta', 'Restam')} ${formatNumber(mentorLeft)} ${plural(mentorLeft, 'geração', 'gerações')} hoje`}
              </p>
            )}
            <p className={styles.lgpd}>
              O texto é enviado ao provedor de IA configurado no servidor. Não cole dados pessoais de estudantes.
            </p>
          </form>
        </section>

        <section className={styles.panel} aria-labelledby={`${ids}-review`}>
          <h2 id={`${ids}-review`} className={styles.h2}>
            2. Revisão
          </h2>

          <div aria-live="polite" aria-atomic="false" className={styles.live}>
            {progress && (
              <p className={`${styles.pill} ${styles.bitcount}`}>
                {`${progress}: ${state.drafts.length} de ${state.requested} prontas`}
              </p>
            )}
            {state.status === 'error' && state.error && <p className={styles.errorBox}>{state.error.message}</p>}
            {state.status === 'done' && state.notice && <p className={styles.noticeBox}>{state.notice}</p>}
          </div>

          {state.status === 'idle' && <p className={styles.empty}>Os rascunhos aparecem aqui, um a um, conforme ficam prontos.</p>}
          {state.status === 'done' && state.drafts.length === 0 && <p className={styles.empty}>Nenhum rascunho foi aproveitado.</p>}

          <div className={styles.cards}>
            {state.drafts.map((draft) => (
              <DraftCard key={draft.id} draft={draft} />
            ))}
          </div>

          {state.rejected.length > 0 && (
            <section className={styles.rejected} aria-labelledby={`${ids}-rejected`}>
              <h3 id={`${ids}-rejected`} className={styles.rejectedTitle}>
                Itens descartados pela validação
              </h3>
              <ul>
                {state.rejected.map((item) => (
                  <li key={item.index}>{`Item ${item.index + 1}: ${item.message}`}</li>
                ))}
              </ul>
            </section>
          )}

          <div className={styles.footer}>
            <p>Você revisa cada rascunho antes de publicar.</p>
            <button type="button" disabled className={`${styles.review} ${styles.bitcount}`}>
              Revisar e publicar<span className="sr-only"> {MARCO_3_5_NOTE}</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
