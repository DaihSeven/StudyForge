# Teste que não prova nada — `PrismaService`: "builds a client without connecting when DATABASE_URL is set"

**Arquivo:** `libs/shared/prisma/src/lib/prisma.service.spec.ts`
**Origem:** escrito na própria Semana 8 (commit `72a1967 test: cobre gaps de import-application, shared-prisma, import-infra e web`), para levar o `shared-prisma` de 33% para 100% de funções e passar no threshold de 80%.

## Padrão: 3 — cobertura alta sem valor

O teste executa o construtor inteiro do `PrismaService`, o que dá 100% de cobertura de linha, mas os asserts só confirmam que "algo existe": `typeof … === 'function'` e `toBeDefined()`. Nenhum deles depende do comportamento do construtor, que é **criar o adapter `pg` com a `DATABASE_URL`**. Os métodos `onModuleInit` e `onModuleDestroy` vêm da classe, e `draftQuestion` vem do client gerado: estariam lá com qualquer configuração.

## Antes

```ts
  it('builds a client without connecting when DATABASE_URL is set', () => {
    process.env['DATABASE_URL'] = 'postgresql://user:pass@localhost:5432/db';

    const service = new PrismaService();

    expect(typeof service.onModuleInit).toBe('function');
    expect(typeof service.onModuleDestroy).toBe('function');
    expect(service.draftQuestion).toBeDefined();
  });
```

## Prova de que ele não detectava quebra

Quebra proposital: o construtor continua exigindo `DATABASE_URL`, mas **ignora o valor** e conecta num banco fixo, errado.

```diff
diff --git a/libs/shared/prisma/src/lib/prisma.service.ts b/libs/shared/prisma/src/lib/prisma.service.ts
index 9fc034f..9701f40 100644
--- a/libs/shared/prisma/src/lib/prisma.service.ts
+++ b/libs/shared/prisma/src/lib/prisma.service.ts
@@ -13,7 +13,7 @@ export class PrismaService extends PrismaClient implements OnModuleInit, OnModul
     if (!connectionString) {
       throw new Error('DATABASE_URL is not set.');
     }
-    super({ adapter: new PrismaPg({ connectionString }) });
+    super({ adapter: new PrismaPg({ connectionString: 'postgresql://outro:outro@db-errado:5432/outro_banco' }) }); // QUEBRA PROPOSITAL
   }
 
   async onModuleInit(): Promise<void> {
```

Os 5 testes continuam verdes (saída real):

```
$ npx nx test shared-prisma --skip-nx-cache -- --testPathPatterns=prisma.service
> nx run shared-prisma:test --testPathPatterns=prisma.service

> jest --testPathPatterns=prisma.service

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        4.299 s, estimated 5 s
Ran all test suites matching prisma.service.



 NX   Successfully ran target test for project shared-prisma and 1 task it depends on


  Run duration:      7.0s
  Cache:             Skipped (--skip-nx-cache)
  Critical path:     6.9s (2 tasks)
  Recoverable time:  <1ms

$ npx jest -c libs/shared/prisma/jest.config.cts --testPathPatterns=prisma.service --json | jq -r ...
PASSED  PrismaService › fails fast when DATABASE_URL is not set
PASSED  PrismaService › builds a client without connecting when DATABASE_URL is set
PASSED  PrismaService › lifecycle hooks › connects to the database on module init
PASSED  PrismaService › lifecycle hooks › propagates connection failures on module init
PASSED  PrismaService › lifecycle hooks › disconnects from the database on module destroy
```

E a cobertura continua 100% com o código quebrado (`npx jest -c libs/shared/prisma/jest.config.cts --coverage --coverageReporters=text`):

```
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |     100 |      100 |     100 |     100 |                   
 prisma.service.ts |     100 |      100 |     100 |     100 |                   
-------------------|---------|----------|---------|---------|-------------------
```

Ou seja: em produção, o serviço poderia apontar para outro banco e nenhum verificador (teste nem threshold de cobertura) acusaria. A quebra foi revertida (`git checkout libs/shared/prisma/src/lib/prisma.service.ts`) antes de corrigir o teste.

## Depois

```diff
diff --git a/libs/shared/prisma/src/lib/prisma.service.spec.ts b/libs/shared/prisma/src/lib/prisma.service.spec.ts
index 94add0a..124e8a0 100644
--- a/libs/shared/prisma/src/lib/prisma.service.spec.ts
+++ b/libs/shared/prisma/src/lib/prisma.service.spec.ts
@@ -1,5 +1,16 @@
+import { PrismaPg } from '@prisma/adapter-pg';
 import { PrismaService } from './prisma.service';
 
+// Repassa para o PrismaPg real (o client continua sendo construído de verdade), mas
+// registra com que configuração o PrismaService criou o adapter.
+jest.mock('@prisma/adapter-pg', () => {
+  const actual = jest.requireActual<typeof import('@prisma/adapter-pg')>('@prisma/adapter-pg');
+  return {
+    ...actual,
+    PrismaPg: jest.fn((...args: ConstructorParameters<typeof actual.PrismaPg>) => new actual.PrismaPg(...args)),
+  };
+});
+
 describe('PrismaService', () => {
   const original = process.env['DATABASE_URL'];
 
@@ -13,16 +24,17 @@ describe('PrismaService', () => {
     expect(() => new PrismaService()).toThrow('DATABASE_URL is not set.');
   });
 
-  // O Prisma 7 devolve um Proxy no construtor (`instanceof` falha), por isso a checagem é
-  // pelos hooks de ciclo de vida que o Nest chama e pelo delegate do model.
-  it('builds a client without connecting when DATABASE_URL is set', () => {
+  it('builds the pg adapter from DATABASE_URL without connecting', () => {
     process.env['DATABASE_URL'] = 'postgresql://user:pass@localhost:5432/db';
+    jest.mocked(PrismaPg).mockClear();
+    const connect = jest.spyOn(PrismaService.prototype, '$connect');
 
-    const service = new PrismaService();
+    new PrismaService();
 
-    expect(typeof service.onModuleInit).toBe('function');
-    expect(typeof service.onModuleDestroy).toBe('function');
-    expect(service.draftQuestion).toBeDefined();
+    expect(PrismaPg).toHaveBeenCalledTimes(1);
+    expect(PrismaPg).toHaveBeenCalledWith({ connectionString: 'postgresql://user:pass@localhost:5432/db' });
+    expect(connect).not.toHaveBeenCalled();
+    connect.mockRestore();
   });
 
   describe('lifecycle hooks', () => {
```

O que mudou:

- `@prisma/adapter-pg` passa por um `jest.mock` que **repassa para o `PrismaPg` real**. O client continua sendo construído de verdade; o mock só registra com que configuração o adapter foi criado. É mock da dependência, não da coisa testada (a correção sugerida no padrão 1).
- O assert compara contra o valor exato: `PrismaPg` chamado uma vez com `{ connectionString: <DATABASE_URL> }`.
- O "without connecting" do nome agora também é verificado: `$connect` não pode ser chamado no construtor.
- O teste foi renomeado para `builds the pg adapter from DATABASE_URL without connecting`, que é o que ele de fato verifica.

Com o código correto, verde (saída real):

```
$ npx nx test shared-prisma --skip-nx-cache -- --testPathPatterns=prisma.service
> nx run shared-prisma:test --testPathPatterns=prisma.service

> jest --testPathPatterns=prisma.service

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        4.381 s, estimated 5 s
Ran all test suites matching prisma.service.



 NX   Successfully ran target test for project shared-prisma and 1 task it depends on


  Run duration:      7.0s
  Cache:             Skipped (--skip-nx-cache)
  Critical path:     7.0s (2 tasks)
  Recoverable time:  <1ms

$ npx jest -c libs/shared/prisma/jest.config.cts --testPathPatterns=prisma.service --json | jq -r ...
PASSED  PrismaService › fails fast when DATABASE_URL is not set
PASSED  PrismaService › builds the pg adapter from DATABASE_URL without connecting
PASSED  PrismaService › lifecycle hooks › connects to the database on module init
PASSED  PrismaService › lifecycle hooks › propagates connection failures on module init
PASSED  PrismaService › lifecycle hooks › disconnects from the database on module destroy
```

Cobertura com o teste corrigido (continua 100%, agora medindo algo):

```
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |     100 |      100 |     100 |     100 |                   
 prisma.service.ts |     100 |      100 |     100 |     100 |                   
-------------------|---------|----------|---------|---------|-------------------
Tests:       5 passed, 5 total
```

## Prova de que agora ele detecta a quebra

Mesma quebra de antes (banco fixo no construtor). Agora o teste falha e o diff aponta o banco errado (saída real):

```
$ npx nx test shared-prisma --skip-nx-cache -- --testPathPatterns=prisma.service
> nx run shared-prisma:test --testPathPatterns=prisma.service

> jest --testPathPatterns=prisma.service

 FAIL   shared-prisma  src/lib/prisma.service.spec.ts
  ● PrismaService › builds the pg adapter from DATABASE_URL without connecting

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    - Expected
    + Received

      Object {
    -   "connectionString": "postgresql://user:pass@localhost:5432/db",
    +   "connectionString": "postgresql://outro:outro@db-errado:5432/outro_banco",
      },

    Number of calls: 1

      33 |
      34 |     expect(PrismaPg).toHaveBeenCalledTimes(1);
    > 35 |     expect(PrismaPg).toHaveBeenCalledWith({ connectionString: 'postgresql://user:pass@localhost:5432/db' });
         |                      ^
      36 |     expect(connect).not.toHaveBeenCalled();
      37 |     connect.mockRestore();
      38 |   });

      at Object.<anonymous> (src/lib/prisma.service.spec.ts:35:22)

Test Suites: 1 failed, 1 total
Tests:       1 failed, 4 passed, 5 total
Snapshots:   0 total
Time:        4.518 s
Ran all test suites matching prisma.service.
Warning: command "jest --testPathPatterns=prisma.service" exited with non-zero status code


 NX   Running target test for project shared-prisma and 1 task it depends on failed

Failed tasks:

- shared-prisma:test

Hint: run the command with --verbose for more details.

  Run duration:      7.1s
  Cache:             Skipped (--skip-nx-cache)
  Critical path:     7.1s (2 tasks)
  Recoverable time:  <1ms

$ npx jest -c libs/shared/prisma/jest.config.cts --testPathPatterns=prisma.service --json | jq -r ...
PASSED  PrismaService › fails fast when DATABASE_URL is not set
FAILED  PrismaService › builds the pg adapter from DATABASE_URL without connecting
PASSED  PrismaService › lifecycle hooks › connects to the database on module init
PASSED  PrismaService › lifecycle hooks › propagates connection failures on module init
PASSED  PrismaService › lifecycle hooks › disconnects from the database on module destroy
```

Segunda quebra, para testar a outra metade do nome do teste: o construtor passa a conectar.

```diff
diff --git a/libs/shared/prisma/src/lib/prisma.service.ts b/libs/shared/prisma/src/lib/prisma.service.ts
index 9fc034f..42319a1 100644
--- a/libs/shared/prisma/src/lib/prisma.service.ts
+++ b/libs/shared/prisma/src/lib/prisma.service.ts
@@ -14,6 +14,7 @@ export class PrismaService extends PrismaClient implements OnModuleInit, OnModul
       throw new Error('DATABASE_URL is not set.');
     }
     super({ adapter: new PrismaPg({ connectionString }) });
+    void this.$connect().catch(() => undefined); // QUEBRA PROPOSITAL: conecta no construtor
   }
 
   async onModuleInit(): Promise<void> {
```

```
$ npx nx test shared-prisma --skip-nx-cache -- --testPathPatterns=prisma.service
> nx run shared-prisma:test --testPathPatterns=prisma.service

> jest --testPathPatterns=prisma.service

 FAIL   shared-prisma  src/lib/prisma.service.spec.ts
  ● PrismaService › builds the pg adapter from DATABASE_URL without connecting

    expect(jest.fn()).not.toHaveBeenCalled()

    Expected number of calls: 0
    Received number of calls: 1

    1: called with 0 arguments

      34 |     expect(PrismaPg).toHaveBeenCalledTimes(1);
      35 |     expect(PrismaPg).toHaveBeenCalledWith({ connectionString: 'postgresql://user:pass@localhost:5432/db' });
    > 36 |     expect(connect).not.toHaveBeenCalled();
         |                         ^
      37 |     connect.mockRestore();
      38 |   });
      39 |

      at Object.<anonymous> (src/lib/prisma.service.spec.ts:36:25)

  ● PrismaService › lifecycle hooks › connects to the database on module init

    expect(jest.fn()).toHaveBeenCalledTimes(expected)

    Expected number of calls: 1
    Received number of calls: 3

      51 |       await service.onModuleInit();
      52 |
    > 53 |       expect(connect).toHaveBeenCalledTimes(1);
         |                       ^
      54 |     });
      55 |
      56 |     it('propagates connection failures on module init', async () => {

      at src/lib/prisma.service.spec.ts:53:23
      at fulfilled (../../../node_modules/tslib/tslib.js:167:62)

Test Suites: 1 failed, 1 total
Tests:       2 failed, 3 passed, 5 total
Snapshots:   0 total
Time:        4.333 s
Ran all test suites matching prisma.service.
Warning: command "jest --testPathPatterns=prisma.service" exited with non-zero status code


 NX   Running target test for project shared-prisma and 1 task it depends on failed

Failed tasks:

- shared-prisma:test

Hint: run the command with --verbose for more details.

  Run duration:      7.0s
  Cache:             Skipped (--skip-nx-cache)
  Critical path:     6.9s (2 tasks)
  Recoverable time:  <1ms

$ npx jest -c libs/shared/prisma/jest.config.cts --testPathPatterns=prisma.service --json | jq -r ...
PASSED  PrismaService › fails fast when DATABASE_URL is not set
FAILED  PrismaService › builds the pg adapter from DATABASE_URL without connecting
FAILED  PrismaService › lifecycle hooks › connects to the database on module init
PASSED  PrismaService › lifecycle hooks › propagates connection failures on module init
PASSED  PrismaService › lifecycle hooks › disconnects from the database on module destroy
```

O teste corrigido falha (`Expected number of calls: 0 / Received: 1`). O `connects to the database on module init` também falha, porque passa a ver chamadas a mais. As duas quebras foram revertidas com `git checkout libs/shared/prisma/src/lib/prisma.service.ts`. Só o arquivo de teste mudou no commit.
