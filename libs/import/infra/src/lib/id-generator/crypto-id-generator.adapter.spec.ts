import { CryptoIdGeneratorAdapter } from './crypto-id-generator.adapter';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('CryptoIdGeneratorAdapter', () => {
  const generator = new CryptoIdGeneratorAdapter();

  it('generates UUID v4 values', () => {
    expect(generator.generate()).toMatch(UUID_V4);
  });

  it('generates a different value on each call', () => {
    expect(generator.generate()).not.toBe(generator.generate());
  });
});
