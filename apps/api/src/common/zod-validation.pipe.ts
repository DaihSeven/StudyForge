import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodType } from 'zod';

/**
 * Valida a entrada com um schema Zod de `shared/contracts` (o mesmo que o `web` usa).
 * Campos desconhecidos são descartados; entrada fora do formato vira 400 `VALIDATION_ERROR`.
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request body does not match the expected format.',
        issues: result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      });
    }
    return result.data;
  }
}
