import type { DraftEvent } from '@studyforge/shared/contracts';
import styles from './generate-drafts-screen.module.css';

/** Texto acessível dos botões desabilitados: eles chegam com a revisão e publicação (Marco 3.5). */
export const MARCO_3_5_NOTE = '(chega no Marco 3.5, revisão e publicação)';

export function DraftCard({ draft }: { draft: DraftEvent }) {
  const headingId = `draft-${draft.id}`;

  return (
    <article className={styles.card} aria-labelledby={headingId}>
      <div className={styles.cardTop}>
        <span id={headingId} className={`${styles.chip} ${styles.bitcount}`}>
          {`RASCUNHO ${draft.index + 1}`}
        </span>
        <span className={styles.validated}>
          <span aria-hidden="true">✓ </span>
          <span>Validada</span>
        </span>
      </div>
      <p className={styles.statement}>{draft.statement}</p>
      <ol className={styles.alternatives}>
        {draft.alternatives.map((alternative) => (
          <li key={alternative.letter} className={alternative.isCorrect ? styles.correct : styles.alternative}>
            <span className={styles.letter}>{alternative.letter}.</span>
            <span className={styles.altText}>{alternative.text}</span>
            {alternative.isCorrect && <span className={`${styles.correctBadge} ${styles.bitcount}`}>CORRETA</span>}
          </li>
        ))}
      </ol>
      <div className={styles.actions}>
        <button type="button" disabled className={`${styles.edit} ${styles.bitcount}`}>
          Editar<span className="sr-only"> {MARCO_3_5_NOTE}</span>
        </button>
        <button type="button" disabled className={`${styles.discard} ${styles.bitcount}`}>
          Descartar<span className="sr-only"> {MARCO_3_5_NOTE}</span>
        </button>
      </div>
    </article>
  );
}
