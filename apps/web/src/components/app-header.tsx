import Link from 'next/link';
import styles from './app-header.module.css';

const SOON = '(ainda não disponível)';

export function AppHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          <span>STUDYFORGE</span>
          <span className={styles.arrows} aria-hidden="true">
            &gt;&gt;&gt;&gt;
          </span>
        </div>
        <nav aria-label="Principal">
          <ul className={styles.nav}>
            <li>
              <Link href="/rascunhos/novo" aria-current="page" className={`${styles.item} ${styles.active}`}>
                Rascunhos
              </Link>
            </li>
            {['Simulados', 'Resultados'].map((label) => (
              <li key={label}>
                <span aria-disabled="true" className={`${styles.item} ${styles.soon}`}>
                  <span>{label}</span>
                  <span className="sr-only"> {SOON}</span>
                </span>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.mentor}>
          <span>[NOME DO MENTOR]</span>
          <span className={styles.chip}>MENTOR</span>
        </div>
      </div>
    </header>
  );
}
