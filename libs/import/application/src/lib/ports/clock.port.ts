/**
 * Relógio injetado. `currentDay()` devolve a chave do dia corrente (`YYYY-MM-DD`);
 * em qual fuso o dia vira é decisão da implementação (em aberto no ADR-010), não deste port.
 */
export interface Clock {
  currentDay(): string;
}

export const CLOCK_TOKEN = Symbol('Clock');
