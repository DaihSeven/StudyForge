import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(z.object({ name: z.string() }));

  it('returns the parsed value without unknown fields', () => {
    expect(pipe.transform({ name: 'ok', extra: true })).toEqual({ name: 'ok' });
  });

  it('throws 400 VALIDATION_ERROR with the failing paths', () => {
    let error: unknown;
    try {
      pipe.transform({ name: 42 });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: 'VALIDATION_ERROR',
      issues: [{ path: 'name' }],
    });
  });
});
