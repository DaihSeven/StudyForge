/** Resultado de uma operação que pode falhar: `Ok` com um valor ou `Err` com um erro. */
export type Result<T, E> = Ok<T, E> | Err<T, E>;

export class Ok<T, E = never> {
  constructor(readonly value: T) {
    Object.freeze(this);
  }

  isOk(): this is Ok<T, E> {
    return true;
  }

  isErr(): this is Err<T, E> {
    return false;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return ok(fn(this.value));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- no-op em Ok; o parâmetro mantém a assinatura igual à de Err
  mapErr<F>(_fn: (error: E) => F): Result<T, F> {
    return ok(this.value);
  }

  getOrThrow(): T {
    return this.value;
  }
}

export class Err<T, E> {
  constructor(readonly error: E) {
    Object.freeze(this);
  }

  isOk(): this is Ok<T, E> {
    return false;
  }

  isErr(): this is Err<T, E> {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- no-op em Err; o parâmetro mantém a assinatura igual à de Ok
  map<U>(_fn: (value: T) => U): Result<U, E> {
    return err(this.error);
  }

  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return err(fn(this.error));
  }

  /** Lança o próprio erro quando ele é um `Error` (ex.: `DomainError`); senão, embrulha em um. */
  getOrThrow(): never {
    throw this.error instanceof Error ? this.error : new Error(`Called getOrThrow on an Err: ${String(this.error)}`);
  }
}

export const ok = <T, E = never>(value: T): Ok<T, E> => new Ok(value);
export const err = <T = never, E = unknown>(error: E): Err<T, E> => new Err(error);
