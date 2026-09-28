import { DomainError } from './domain-error';

export const ALTERNATIVE_LETTERS = Object.freeze(['A', 'B', 'C', 'D', 'E'] as const);

export type AlternativeLetter = (typeof ALTERNATIVE_LETTERS)[number];

export class InvalidAlternativeError extends DomainError<'INVALID_ALTERNATIVE_LETTER'> {
  constructor(letter: unknown) {
    super('INVALID_ALTERNATIVE_LETTER', `Alternative letter must be one of A–E, got "${String(letter)}".`);
  }
}

export interface AlternativeProps {
  readonly letter: AlternativeLetter;
  readonly text: string;
  readonly isCorrect: boolean;
}

/**
 * Uma alternativa de questão. Só conhece a própria invariante (letra entre A e E);
 * quantas alternativas e quantas corretas é regra do tipo de questão.
 */
export class Alternative {
  private constructor(
    readonly letter: AlternativeLetter,
    readonly text: string,
    readonly isCorrect: boolean,
  ) {}

  static create(props: AlternativeProps): Alternative {
    if (!(ALTERNATIVE_LETTERS as readonly unknown[]).includes(props.letter)) {
      throw new InvalidAlternativeError(props.letter);
    }
    return Object.freeze(new Alternative(props.letter, props.text, props.isCorrect));
  }
}
