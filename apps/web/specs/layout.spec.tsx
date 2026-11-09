import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RootLayout, { metadata } from '../src/app/layout';

describe('RootLayout', () => {
  it('wraps the children in an html/body shell with lang="en"', () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main>conteúdo</main>
      </RootLayout>,
    );

    expect(markup).toBe('<html lang="en"><head></head><body><main>conteúdo</main></body></html>');
  });

  it('exposes the page metadata', () => {
    expect(metadata.title).toBe('Welcome to web');
  });
});
