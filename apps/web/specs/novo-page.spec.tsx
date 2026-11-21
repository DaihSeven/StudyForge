import React from 'react';
import { render, screen } from '@testing-library/react';
import NewDraftsPage, { metadata } from '../src/app/rascunhos/novo/page';

const ORG = 'NEXT_PUBLIC_DEMO_ORGANIZATION_ID';
const MENTOR = 'NEXT_PUBLIC_DEMO_MENTOR_ID';

describe('/rascunhos/novo', () => {
  const saved = { org: process.env[ORG], mentor: process.env[MENTOR] };

  afterEach(() => {
    process.env[ORG] = saved.org;
    process.env[MENTOR] = saved.mentor;
  });

  it('renders the header and the generation screen without the missing-config warning when the env vars are set', () => {
    process.env[ORG] = 'org-demo';
    process.env[MENTOR] = 'mentor-demo';

    render(<NewDraftsPage />);

    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Novos rascunhos' })).toBeTruthy();
    expect(screen.queryByText(/Configuração temporária ausente/)).toBeNull();
  });

  it('warns about the missing temporary ids when the env vars are not set', () => {
    delete process.env[ORG];
    delete process.env[MENTOR];

    render(<NewDraftsPage />);

    expect(screen.getByText(/Configuração temporária ausente/)).toBeTruthy();
  });

  it('sets the page title', () => {
    expect(metadata.title).toBe('Novos rascunhos — StudyForge');
  });
});
