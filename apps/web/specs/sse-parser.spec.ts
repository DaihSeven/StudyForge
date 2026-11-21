import { parseSseBuffer } from '../src/lib/sse-parser';

describe('parseSseBuffer', () => {
  it('parses one complete block into event and data', () => {
    const result = parseSseBuffer('event: draft\ndata: {"index":0}\n\n');

    expect(result.messages).toEqual([{ event: 'draft', data: '{"index":0}' }]);
    expect(result.remainder).toBe('');
  });

  it('parses several blocks in order', () => {
    const result = parseSseBuffer('event: draft\ndata: 1\n\nevent: done\ndata: 2\n\n');

    expect(result.messages.map((m) => m.event)).toEqual(['draft', 'done']);
  });

  it('keeps an incomplete block as remainder until it is completed', () => {
    const first = parseSseBuffer('event: draft\ndata: {"ind');
    expect(first.messages).toEqual([]);
    expect(first.remainder).toBe('event: draft\ndata: {"ind');

    const second = parseSseBuffer(first.remainder + 'ex":0}\n\n');
    expect(second.messages).toEqual([{ event: 'draft', data: '{"index":0}' }]);
    expect(second.remainder).toBe('');
  });

  it('handles CRLF line endings', () => {
    const result = parseSseBuffer('event: done\r\ndata: x\r\n\r\n');

    expect(result.messages).toEqual([{ event: 'done', data: 'x' }]);
  });

  it('joins multiple data lines with a newline', () => {
    const result = parseSseBuffer('event: draft\ndata: a\ndata: b\n\n');

    expect(result.messages[0].data).toBe('a\nb');
  });

  it('defaults the event name to "message"', () => {
    expect(parseSseBuffer('data: oi\n\n').messages).toEqual([{ event: 'message', data: 'oi' }]);
  });

  it('accepts "data:" with and without the space after the colon', () => {
    expect(parseSseBuffer('data:sem-espaco\n\n').messages[0].data).toBe('sem-espaco');
    expect(parseSseBuffer('data: com-espaco\n\n').messages[0].data).toBe('com-espaco');
  });

  it('ignores comments, id, retry and unknown fields', () => {
    const result = parseSseBuffer(': keep-alive\nid: 7\nretry: 100\nfoo: bar\nevent: done\ndata: ok\n\n');

    expect(result.messages).toEqual([{ event: 'done', data: 'ok' }]);
  });

  it('skips blocks without data', () => {
    expect(parseSseBuffer(': só comentário\n\nevent: x\n\n').messages).toEqual([]);
  });

  it('returns nothing for an empty buffer', () => {
    expect(parseSseBuffer('')).toEqual({ messages: [], remainder: '' });
  });
});
