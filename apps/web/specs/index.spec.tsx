import Page from '../src/app/page';

describe('Page "/"', () => {
  it('redirects to /rascunhos/novo', () => {
    let thrown: unknown;
    try {
      Page();
    } catch (error) {
      thrown = error;
    }

    // `redirect()` do Next interrompe a renderização lançando um erro cujo `digest` carrega o destino.
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as { digest?: string }).digest).toMatch(/^NEXT_REDIRECT;[^;]*;\/rascunhos\/novo;/);
  });
});
