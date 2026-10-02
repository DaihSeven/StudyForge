import { Injectable } from '@nestjs/common';
import { IdGenerator } from '@studyforge/import/application';
import { randomUUID } from 'node:crypto';

/** `IdGenerator` com UUID v4 do Node. Fica na infra porque depende de API de runtime. */
@Injectable()
export class CryptoIdGeneratorAdapter implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}
