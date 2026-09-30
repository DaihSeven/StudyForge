import { DomainError } from './domain-error';
import { err, ok, Result } from './result';

class TestError extends DomainError<'TEST'> {
  constructor() {
    super('TEST', 'Test error.');
  }
}

describe('Result', () => {
  describe('Ok', () => {
    it('holds a value', () => {
      const result: Result<number, string> = ok(42);

      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);
      expect(result.isOk() && result.value).toBe(42);
    });

    it('maps the value', () => {
      expect(ok(5).map((v) => v * 2).getOrThrow()).toBe(10);
    });

    it('ignores mapErr', () => {
      expect(ok<number, string>(42).mapErr((e) => `Error: ${e}`).getOrThrow()).toBe(42);
    });

    it('returns the value on getOrThrow', () => {
      expect(ok(42).getOrThrow()).toBe(42);
    });

    it('is immutable', () => {
      expect(Object.isFrozen(ok(42))).toBe(true);
    });
  });

  describe('Err', () => {
    it('holds an error', () => {
      const result: Result<number, string> = err('something failed');

      expect(result.isOk()).toBe(false);
      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error).toBe('something failed');
    });

    it('ignores map', () => {
      const result = err<number, string>('failed').map((v) => v * 2);

      expect(result.isErr() && result.error).toBe('failed');
    });

    it('maps the error', () => {
      const result = err<number, string>('failed').mapErr((e) => `Error: ${e}`);

      expect(result.isErr() && result.error).toBe('Error: failed');
    });

    it('throws the error itself on getOrThrow when it is an Error', () => {
      const error = new TestError();

      expect(() => err(error).getOrThrow()).toThrow(error);
    });

    it('wraps a non-Error value on getOrThrow', () => {
      expect(() => err('something failed').getOrThrow()).toThrow('Called getOrThrow on an Err: something failed');
    });
  });
});
