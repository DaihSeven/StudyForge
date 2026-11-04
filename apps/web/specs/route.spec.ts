/**
 * @jest-environment node
 */
import { GET } from '../src/app/api/hello/route';

describe('GET /api/hello', () => {
  it('responds 200 with the greeting body', async () => {
    const response = await GET(new Request('http://localhost/api/hello'));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('Hello, from API!');
  });
});
