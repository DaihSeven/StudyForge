import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppHeader } from '../src/components/app-header';

describe('AppHeader', () => {
  it('shows the logo and the mentor placeholder with the MENTOR chip', () => {
    render(<AppHeader />);

    expect(screen.getByText('STUDYFORGE')).toBeTruthy();
    expect(screen.getByText('[NOME DO MENTOR]')).toBeTruthy();
    expect(screen.getByText('MENTOR')).toBeTruthy();
  });

  it('marks Rascunhos as the current page', () => {
    render(<AppHeader />);

    const link = screen.getByRole('link', { name: 'Rascunhos' });
    expect(link.getAttribute('aria-current')).toBe('page');
    expect(link.getAttribute('href')).toBe('/rascunhos/novo');
  });

  it('shows Simulados and Resultados as not available yet, without fake links', () => {
    render(<AppHeader />);

    expect(screen.queryByRole('link', { name: /Simulados/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Resultados/ })).toBeNull();
    expect(screen.getByText('Simulados').parentElement?.getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText('Resultados').parentElement?.getAttribute('aria-disabled')).toBe('true');
  });
});
