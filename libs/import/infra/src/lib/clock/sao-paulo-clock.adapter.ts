import { Clock } from '@studyforge/import/application';

export class SaoPauloClockAdapter implements Clock {
  constructor(private readonly now: () => Date = () => new Date()) {}

  currentDay(): string {
    void this.now;
    throw new Error('SaoPauloClockAdapter ainda não implementado.');
  }
}
