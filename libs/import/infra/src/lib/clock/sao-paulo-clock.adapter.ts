import { Clock } from '@studyforge/import/application';

const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';

// `en-CA` formata a data como YYYY-MM-DD.
const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SAO_PAULO_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** `Clock` cujo dia vira à meia-noite de America/Sao_Paulo (decisão 2 do ADR-010). */
export class SaoPauloClockAdapter implements Clock {
  constructor(private readonly now: () => Date = () => new Date()) {}

  currentDay(): string {
    return dayFormatter.format(this.now());
  }
}
