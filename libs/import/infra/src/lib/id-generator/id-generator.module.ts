import { Module } from '@nestjs/common';
import { ID_GENERATOR_TOKEN } from '@studyforge/import/application';
import { CryptoIdGeneratorAdapter } from './crypto-id-generator.adapter';

@Module({
  providers: [{ provide: ID_GENERATOR_TOKEN, useClass: CryptoIdGeneratorAdapter }],
  exports: [ID_GENERATOR_TOKEN],
})
export class IdGeneratorModule {}
