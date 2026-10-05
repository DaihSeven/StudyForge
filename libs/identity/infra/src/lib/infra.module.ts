import { Module } from '@nestjs/common';

/**
 * Wiring do contexto identity: liga os ports de application às implementações da infra
 * e expõe os use cases para a api. Vazio até existir o primeiro use case.
 */
@Module({
  imports: [],
  providers: [],
  exports: [],
})
export class IdentityInfraModule {}
