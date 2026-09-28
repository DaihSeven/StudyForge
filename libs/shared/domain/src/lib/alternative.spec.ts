import { Alternative, AlternativeLetter } from './alternative';
import { DomainError } from './domain-error';

describe('Alternative', () => {
  it.each(['A', 'B', 'C', 'D', 'E'] as const)('accepts letter %s', (letter) => {
    const alternative = Alternative.create({ letter, text: 'Texto', isCorrect: true });

    expect(alternative).toMatchObject({ letter, text: 'Texto', isCorrect: true });
  });

  it.each(['F', 'a', ''])('rejects letter "%s" outside A–E', (letter) => {
    let error: unknown;
    try {
      Alternative.create({ letter: letter as AlternativeLetter, text: 'Texto', isCorrect: false });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ code: 'INVALID_ALTERNATIVE_LETTER' });
  });
});
