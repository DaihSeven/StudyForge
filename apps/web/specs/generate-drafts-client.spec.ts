import type { GenerationEvent } from '@studyforge/shared/contracts';
import { GENERATE_ENDPOINT, streamGeneration } from '../src/lib/generate-drafts-client';
import { errorResponse, fakeFetch, sampleDone, sampleDraft, sse, streamResponse } from './helpers/fake-fetch';

const request = { organizationId: 'org-demo', mentorId: 'mentor-demo', text: 'Material', quantity: 3, alternativesPerQuestion: 4 };

async function run(outcome: Parameters<typeof fakeFetch>[0], signal?: AbortSignal) {
  const fake = fakeFetch(outcome);
  const events: GenerationEvent[] = [];
  await streamGeneration({ request, onEvent: (e) => events.push(e), fetchImpl: fake.fetch, signal });
  return { events, calls: fake.calls };
}

describe('streamGeneration', () => {
  it('POSTs the request as JSON to the generate endpoint', async () => {
    const { calls } = await run(streamResponse([sse('done', sampleDone)]));

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(GENERATE_ENDPOINT);
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(JSON.parse(String(calls[0].init.body))).toEqual(request);
  });

  it('emits draft, rejected and done events in order', async () => {
    const rejected = { index: 1, code: 'INVALID_CORRECT_COUNT', message: 'Sem alternativa correta.' };
    const { events } = await run(
      streamResponse([sse('draft', sampleDraft), sse('rejected', rejected), sse('done', { ...sampleDone, rejectedCount: 1 })]),
    );

    expect(events.map((e) => e.event)).toEqual(['draft', 'rejected', 'done']);
    expect(events[0].data).toEqual(sampleDraft);
  });

  it('reassembles an event split across chunks', async () => {
    const text = sse('draft', sampleDraft) + sse('done', sampleDone);
    const cut = 25;
    const { events } = await run(streamResponse([text.slice(0, cut), text.slice(cut, 90), text.slice(90)]));

    expect(events.map((e) => e.event)).toEqual(['draft', 'done']);
  });

  it('flushes a last block that has no trailing blank line', async () => {
    const { events } = await run(streamResponse([`event: done\ndata: ${JSON.stringify(sampleDone)}`]));

    expect(events.map((e) => e.event)).toEqual(['done']);
  });

  it('ignores events with invalid JSON, unknown names or the wrong shape', async () => {
    const { events } = await run(
      streamResponse([
        'event: draft\ndata: {not json}\n\n',
        sse('ping', {}),
        sse('draft', { ...sampleDraft, type: 'TRUE_FALSE' }),
        sse('done', sampleDone),
      ]),
    );

    expect(events.map((e) => e.event)).toEqual(['done']);
  });

  it('forwards an error event from the stream and does not add another one', async () => {
    const data = { code: 'AI_PROVIDER_TIMEOUT', message: 'Demorou demais. Esta tentativa contou no seu limite diário.' };
    const { events } = await run(streamResponse([sse('draft', sampleDraft), sse('error', data)]));

    expect(events.map((e) => e.event)).toEqual(['draft', 'error']);
    expect(events[1].data).toEqual(data);
  });

  it('turns an HTTP error with the server body into an error event with the server message', async () => {
    const body = { code: 'AI_MENTOR_DAILY_LIMIT_EXCEEDED', message: 'Você atingiu o limite de 10 gerações por IA hoje.' };
    const { events } = await run(errorResponse(429, body));

    expect(events).toEqual([{ event: 'error', data: body }]);
  });

  it('uses a generic message when the HTTP error body is not the expected JSON', async () => {
    const { events } = await run(errorResponse(500, 'Internal Server Error'));

    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('error');
    expect(events[0].data).toMatchObject({ code: 'HTTP_500' });
    expect((events[0].data as { message: string }).message).toContain('500');
  });

  it('reports a network failure without claiming whether the attempt counted', async () => {
    const { events } = await run(new TypeError('Failed to fetch'));

    expect(events).toHaveLength(1);
    expect(events[0].data).toMatchObject({ code: 'NETWORK_ERROR' });
    expect((events[0].data as { message: string }).message).toContain('não foi possível confirmar se a tentativa contou');
  });

  it('reports an interruption when the stream ends without done or error', async () => {
    const { events } = await run(streamResponse([sse('draft', sampleDraft)]));

    expect(events.map((e) => e.event)).toEqual(['draft', 'error']);
    expect(events[1].data).toMatchObject({ code: 'STREAM_INTERRUPTED' });
  });

  it('reports an interruption when a 200 response has no body', async () => {
    const { events } = await run({ ok: true, status: 200, body: null } as unknown as ReturnType<typeof streamResponse>);

    expect(events[0].data).toMatchObject({ code: 'STREAM_INTERRUPTED' });
  });

  it('emits nothing when the request is aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const { events } = await run(abort, controller.signal);

    expect(events).toEqual([]);
  });
});
