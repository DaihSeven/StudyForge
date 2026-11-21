import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RootLayout, { metadata } from '../src/app/layout';

describe('RootLayout', () => {
  it('wraps the children in an html/body shell with lang="pt-BR" and the three font variables', () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main>conteúdo</main>
      </RootLayout>,
    );

    expect(markup).toMatch(/^<html lang="pt-BR" class="[^"]+"><head><\/head><body><main>conteúdo<\/main><\/body><\/html>$/);
    expect(markup.match(/variable/g)).toHaveLength(3);
  });

  it('exposes the page metadata', () => {
    expect(metadata.title).toBe('StudyForge');
  });
});
