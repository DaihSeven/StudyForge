import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { GenerateDraftsScreen } from '../src/components/generate-drafts-screen';
import {
  controlledStream,
  errorResponse,
  fakeFetch,
  sampleDone,
  sampleDraft,
  sse,
  streamResponse,
} from './helpers/fake-fetch';

const LGPD = 'O texto é enviado ao provedor de IA configurado no servidor. Não cole dados pessoais de estudantes.';

function setup(outcome: Parameters<typeof fakeFetch>[0] = streamResponse([sse('done', sampleDone)]), props = {}) {
  const fake = fakeFetch(outcome);
  const view = render(
    <GenerateDraftsScreen organizationId="org-demo" mentorId="mentor-demo" fetchImpl={fake.fetch} {...props} />,
  );
  return { ...view, fake };
}

const writeText = (value: string) =>
  fireEvent.change(screen.getByLabelText('Texto de estudo'), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Gerar rascunhos' }));
const liveRegion = (container: HTMLElement) => container.querySelector('[aria-live="polite"]') as HTMLElement;

describe('GenerateDraftsScreen — formulário', () => {
  it('shows the page title, the intro and the two column headings', () => {
    setup();

    expect(screen.getByRole('heading', { level: 1, name: 'Novos rascunhos' })).toBeTruthy();
    expect(
      screen.getByText(
        'Traga o material do seu curso. O sistema transforma em questões editáveis, e você decide o que vira simulado. Nada é publicado sozinho.',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: '1. Material' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '2. Revisão' })).toBeTruthy();
  });

  it('offers "Tipo de questão" with the real alternative counts and "Escolha única" as the default', () => {
    setup();

    const select = screen.getByLabelText('Tipo de questão') as HTMLSelectElement;
    const options = within(select).getAllByRole('option').map((o) => o.textContent ?? '');
    expect(options).toEqual(['Escolha única (4 alternativas)', 'Múltipla escolha (5 alternativas)']);
    expect(select.value).toBe('SINGLE_CHOICE');
    expect(screen.queryByText('Alternativas por questão')).toBeNull();
  });

  it('offers the quantities 3, 5 and 10, with 5 selected by default', () => {
    setup();

    const group = screen.getByRole('group', { name: 'Quantidade de questões' });
    expect(within(group).getAllByRole('radio').map((r) => (r as HTMLInputElement).value)).toEqual(['3', '5', '10']);
    expect((within(group).getByRole('radio', { name: '5' }) as HTMLInputElement).checked).toBe(true);
  });

  it('shows "Gerar com IA" as the active tab and "Importar arquivo" disabled, saying it arrives in Marco 3.3', () => {
    setup();

    expect(screen.getByRole('tab', { name: 'Gerar com IA' }).getAttribute('aria-selected')).toBe('true');
    const upload = screen.getByRole('tab', { name: /Importar arquivo/ }) as HTMLButtonElement;
    expect(upload.disabled).toBe(true);
    expect(upload.textContent).toContain('Marco 3.3');
  });

  it('always shows the LGPD notice below the generate button', () => {
    setup();

    const notice = screen.getByText(LGPD);
    const button = screen.getByRole('button', { name: 'Gerar rascunhos' });
    expect(button.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('counts characters and blocks text above the limit, without calling the API', () => {
    const { fake } = setup(undefined, { maxInputChars: 8000 });
    expect(screen.getByText('0 de 8.000 caracteres')).toBeTruthy();

    writeText('a'.repeat(8000));
    expect(screen.getByText('8.000 de 8.000 caracteres')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Gerar rascunhos' }) as HTMLButtonElement).disabled).toBe(false);

    writeText('a'.repeat(8001));
    expect(screen.getByText('8.001 de 8.000 caracteres')).toBeTruthy();
    expect(screen.getByText('O texto passou do limite em 1 caractere. Reduza o texto para gerar.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Gerar rascunhos' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByLabelText('Texto de estudo').getAttribute('aria-invalid')).toBe('true');

    submit();
    expect(fake.calls).toHaveLength(0);
  });

  it('asks for text instead of calling the API when the text is blank', () => {
    const { fake } = setup();

    writeText('   ');
    submit();

    expect(screen.getByText('Escreva ou cole o texto de estudo antes de gerar.')).toBeTruthy();
    expect(fake.calls).toHaveLength(0);
  });

  it('disables generation and explains when the temporary demo ids are not configured', () => {
    setup(undefined, { organizationId: null, mentorId: null });

    expect(screen.getByText(/NEXT_PUBLIC_DEMO_ORGANIZATION_ID/)).toBeTruthy();
    expect(screen.getByText(/NEXT_PUBLIC_DEMO_MENTOR_ID/)).toBeTruthy();
    writeText('Material');
    expect((screen.getByRole('button', { name: 'Gerar rascunhos' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('has a polite live region for progress and errors', () => {
    const { container } = setup();

    expect(liveRegion(container)).toBeTruthy();
  });
});

describe('GenerateDraftsScreen — geração', () => {
  it('sends the chosen type, quantity and the demo ids', async () => {
    const { fake } = setup();

    writeText('Material sobre S3');
    fireEvent.change(screen.getByLabelText('Tipo de questão'), { target: { value: 'MULTIPLE_CHOICE' } });
    fireEvent.click(screen.getByRole('radio', { name: '3' }));
    submit();

    await waitFor(() => expect(fake.calls).toHaveLength(1));
    expect(JSON.parse(String(fake.calls[0].init.body))).toEqual({
      organizationId: 'org-demo',
      mentorId: 'mentor-demo',
      text: 'Material sobre S3',
      quantity: 3,
      alternativesPerQuestion: 5,
    });
  });

  it('shows "Gerando: n de N prontas" while streaming, one card per draft, and no usage number yet', async () => {
    const stream = controlledStream();
    const { container } = setup(stream.response as unknown as ReturnType<typeof streamResponse>);

    writeText('Material');
    fireEvent.click(screen.getByRole('radio', { name: '3' }));
    submit();

    expect(await screen.findByText('Gerando: 0 de 3 prontas')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Gerar rascunhos' }) as HTMLButtonElement).disabled).toBe(true);

    await act(async () => stream.push(sse('draft', sampleDraft)));
    expect(await screen.findByText('Gerando: 1 de 3 prontas')).toBeTruthy();
    expect(screen.getByText('RASCUNHO 1')).toBeTruthy();
    expect(screen.getByText('Validada')).toBeTruthy();
    expect(screen.getByText('Qual serviço da AWS armazena objetos?')).toBeTruthy();
    expect(screen.queryByText(/gerações hoje|geração hoje/)).toBeNull();
    expect(liveRegion(container).textContent).toContain('Gerando: 1 de 3 prontas');

    await act(async () => {
      stream.push(sse('done', sampleDone));
      stream.end();
    });
    expect(await screen.findByText('Restam 9 gerações hoje')).toBeTruthy();
    expect(screen.queryByText(/Gerando:/)).toBeNull();
    expect((screen.getByRole('button', { name: 'Gerar rascunhos' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('marks the correct alternative with the text CORRETA (once for single choice, twice for multiple choice)', async () => {
    const multiple = {
      ...sampleDraft,
      index: 1,
      id: 'draft-2',
      type: 'MULTIPLE_CHOICE',
      alternatives: ['A', 'B', 'C', 'D', 'E'].map((letter, i) => ({ letter, text: `Opção ${letter}`, isCorrect: i < 2 })),
    };
    setup(streamResponse([sse('draft', sampleDraft), sse('draft', multiple), sse('done', { ...sampleDone, draftCount: 2 })]));

    writeText('Material');
    submit();

    await screen.findByText('RASCUNHO 2');
    const cards = screen.getAllByRole('article');
    expect(within(cards[0]).getAllByText('CORRETA')).toHaveLength(1);
    expect(within(cards[1]).getAllByText('CORRETA')).toHaveLength(2);
    expect(within(cards[0]).getByText('Amazon S3').closest('li')?.textContent).toContain('CORRETA');
    expect(within(cards[0]).getByText('Amazon RDS').closest('li')?.textContent).not.toContain('CORRETA');
  });

  it('lists rejected items under "Itens descartados pela validação" with the reason', async () => {
    const rejected = { index: 1, code: 'INVALID_CORRECT_COUNT', message: 'SINGLE_CHOICE requires exactly 1 correct alternative(s), got 0.' };
    setup(streamResponse([sse('draft', sampleDraft), sse('rejected', rejected), sse('done', { ...sampleDone, rejectedCount: 1 })]));

    writeText('Material');
    submit();

    expect(await screen.findByText('Itens descartados pela validação')).toBeTruthy();
    expect(screen.getByText(/SINGLE_CHOICE requires exactly 1 correct alternative\(s\), got 0\./)).toBeTruthy();
    expect(screen.getByText(/Item 2/)).toBeTruthy();
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('does not show the rejected list when nothing was rejected', async () => {
    setup(streamResponse([sse('draft', sampleDraft), sse('done', sampleDone)]));

    writeText('Material');
    submit();

    await screen.findByText('RASCUNHO 1');
    expect(screen.queryByText('Itens descartados pela validação')).toBeNull();
  });

  it('uses the singular when one generation is left, and shows the notice sent with done', async () => {
    setup(streamResponse([sse('done', { draftCount: 0, rejectedCount: 0, usage: { mentor: 1, global: 5 }, notice: 'Esta tentativa contou no seu limite diário.' })]));

    writeText('Material');
    submit();

    expect(await screen.findByText('Resta 1 geração hoje')).toBeTruthy();
    expect(screen.getByText('Esta tentativa contou no seu limite diário.')).toBeTruthy();
  });

  it('shows the server message of a 429, including whether the attempt counted, in the live region', async () => {
    const message = 'O provedor limitou as chamadas. Esta tentativa não contou no seu limite diário.';
    const { container } = setup(errorResponse(429, { code: 'AI_PROVIDER_RATE_LIMITED', message }));

    writeText('Material');
    submit();

    await waitFor(() => expect(liveRegion(container).textContent).toContain(message));
    expect(screen.queryByText(/gerações hoje|geração hoje/)).toBeNull();
    expect((screen.getByRole('button', { name: 'Gerar rascunhos' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows the message of an error event and keeps the drafts already received', async () => {
    const message = 'Demorou demais. Esta tentativa contou no seu limite diário.';
    const { container } = setup(streamResponse([sse('draft', sampleDraft), sse('error', { code: 'AI_PROVIDER_TIMEOUT', message })]));

    writeText('Material');
    submit();

    await waitFor(() => expect(liveRegion(container).textContent).toContain(message));
    expect(screen.getByText('RASCUNHO 1')).toBeTruthy();
  });

  it('renders Editar, Descartar and Revisar e publicar disabled, saying they arrive in Marco 3.5', async () => {
    setup(streamResponse([sse('draft', sampleDraft), sse('done', sampleDone)]));

    writeText('Material');
    submit();
    await screen.findByText('RASCUNHO 1');

    for (const name of [/Editar/, /Descartar/, /Revisar e publicar/]) {
      const button = screen.getByRole('button', { name }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.textContent).toContain('Marco 3.5');
    }
  });

  it('aborts the request when the screen unmounts', async () => {
    const stream = controlledStream();
    const { fake, unmount } = setup(stream.response as unknown as ReturnType<typeof streamResponse>);

    writeText('Material');
    submit();
    await waitFor(() => expect(fake.calls).toHaveLength(1));
    const signal = fake.calls[0].init.signal as AbortSignal;
    expect(signal.aborted).toBe(false);

    unmount();

    expect(signal.aborted).toBe(true);
  });
});
