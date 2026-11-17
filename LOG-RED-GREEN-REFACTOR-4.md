# LOG-RED-GREEN-REFACTOR-4 — Marco 3.1, tarefa T1: `UserRepository.findById`

Tarefa: T1 de [`docs/tasks/marco-3-1-tarefas.md`](docs/tasks/marco-3-1-tarefas.md)
Teste: `libs/identity/infra/src/lib/user/prisma-user.repository.spec.ts`
Implementação: `libs/identity/application/src/lib/ports/user.repository.ts` (port) e `libs/identity/infra/src/lib/user/prisma-user.repository.ts` (adapter)

## Cenários

Copiados de `docs/specs/marco-3-1-identity-completo.md` (M1):

```gherkin
C01 — FindUserById retorna User quando o id existe
Given um User com id "u-1" existe
When chamo UserRepository.findById("u-1")
Then retorna o User com id, email, name e createdAt
```

```gherkin
C02 — FindUserById retorna null quando o id não existe
Given nenhum User com id "u-x" existe
When chamo UserRepository.findById("u-x")
Then retorna null e nenhum erro é lançado
```

Os dois são de **infra** e a spec diz "Sem PG: sim". Os nomes dos testes são os títulos dos cenários (`Marco 3.1 — UserRepository.findById › C01 — …` e `› C02 — …`).

**Como o teste simula o banco.** Como no LOG-3, só a fronteira com o banco é falsa: o delegate `prisma.user.findUnique` é uma tabela em memória que responde pelo `where` recebido e **só acha a linha quando a busca é pelo `id`**. Se o adapter buscasse por outro campo, o C01 receberia `null` e falharia. O código exercitado é o do `PrismaUserRepository` real: consulta, mapeamento da linha para a entidade `User` e retorno de `null`.

## Preparação — contrato sem comportamento

```
425f352 chore(identity): contrato de UserRepository.findById
```

- `findById(id: EntityId): Promise<User | null>` no port `UserRepository` (`identity-application`). O port recebe o `EntityId` do domínio, não `string` nem tipo do Prisma.
- `PrismaUserRepository.findById` como stub que **lança** `Error('UserRepository.findById ainda não implementado.')`.

Sem o contrato, o teste chamaria um método inexistente e o RED falharia por erro de tipo, não por comportamento. O stub lança em vez de devolver `null` de propósito: com `return null`, o C02 já passaria no RED e não provaria nada.

## RED — os testes que ainda não passam

```
8e5a222 test(identity): red — C01 e C02 de UserRepository.findById
```

Saída do terminal (rodada antes do commit acima):

```
$ npx nx test identity-infra --skip-nx-cache --output-style=static

 NX   Running target test for project identity-infra and 1 task it depends on:

> nx run shared-prisma:prisma-generate

> npx prisma generate

Loaded Prisma config from prisma.config.ts.

Prisma schema loaded from prisma/schema.prisma.

✔ Generated Prisma Client (7.10.1) to ./libs/shared/prisma/src/generated/prisma in 87ms

> nx run identity-infra:test

> jest

 FAIL   identity-infra  src/lib/user/prisma-user.repository.spec.ts (5.031 s)
  ● Marco 3.1 — UserRepository.findById › C01 — FindUserById retorna User quando o id existe

    UserRepository.findById ainda não implementado.

      28 |
      29 |   async findById(_id: EntityId): Promise<User | null> {
    > 30 |     throw new Error('UserRepository.findById ainda não implementado.');
         |           ^
      31 |   }
      32 |
      33 |   async save(user: User): Promise<User> {

      at PrismaUserRepository.<anonymous> (src/lib/user/prisma-user.repository.ts:30:11)
      at ../../../node_modules/tslib/tslib.js:170:75
      at Object.__awaiter (../../../node_modules/tslib/tslib.js:166:16)
      at PrismaUserRepository.findById (src/lib/user/prisma-user.repository.ts:30:24)
      at src/lib/user/prisma-user.repository.spec.ts:127:35
      at ../../../node_modules/tslib/tslib.js:170:75
      at Object.__awaiter (../../../node_modules/tslib/tslib.js:166:16)
      at Object.<anonymous> (src/lib/user/prisma-user.repository.spec.ts:124:71)

  ● Marco 3.1 — UserRepository.findById › C02 — FindUserById retorna null quando o id não existe

    expect(received).resolves.toBeNull()

    Received promise rejected instead of resolved
    Rejected to value: [Error: UserRepository.findById ainda não implementado.]

      139 |     // When chamo UserRepository.findById("u-x")
      140 |     // Then retorna null e nenhum erro é lançado
    > 141 |     await expect(repository.findById(EntityId.create('u-x'))).resolves.toBeNull();
          |           ^
      142 |   });
      143 | });
      144 |

      at expect (../../../node_modules/@jest/core/node_modules/expect/build/index.js:2116:15)
      at src/lib/user/prisma-user.repository.spec.ts:141:11
      at ../../../node_modules/tslib/tslib.js:170:75
      at Object.__awaiter (../../../node_modules/tslib/tslib.js:166:16)
      at Object.<anonymous> (src/lib/user/prisma-user.repository.spec.ts:137:75)

Test Suites: 1 failed, 1 passed, 2 total
Tests:       2 failed, 4 passed, 6 total
Snapshots:   0 total
Time:        6.392 s, estimated 15 s
Ran all test suites.
Warning: command "jest" exited with non-zero status code

 NX   Running target test for project identity-infra and 1 task it depends on failed

Failed tasks:

- identity-infra:test

Hint: run the command with --verbose for more details.

  Run duration:      10.0s
  Cache:             Skipped (--skip-nx-cache)
  Critical path:     10.0s (2 tasks)
  Recoverable time:  <1ms
```

**Por que falhou assim:** o C01 recebe o erro do stub em vez do `User`. O C02 falha pela cláusula "nenhum erro é lançado": a promise rejeita em vez de resolver `null`. Os 4 testes existentes (S5 e o módulo) continuam verdes.

## GREEN — o menor código que faz passar

```
8962949 feat(identity): green — UserRepository.findById (C01, C02)
```

```ts
async findById(id: EntityId): Promise<User | null> {
  const row = await this.prisma.user.findUnique({ where: { id: id.value } });
  return row ? toDomain(row) : null;
}
```

Saída do terminal:

```
$ npx nx test identity-infra --skip-nx-cache --output-style=static

 NX   Running target test for project identity-infra and 1 task it depends on:

> nx run shared-prisma:prisma-generate

> npx prisma generate

Loaded Prisma config from prisma.config.ts.

Prisma schema loaded from prisma/schema.prisma.

✔ Generated Prisma Client (7.10.1) to ./libs/shared/prisma/src/generated/prisma in 78ms

> nx run identity-infra:test

> jest

Test Suites: 2 passed, 2 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        5.431 s, estimated 6 s
Ran all test suites.

 NX   Successfully ran target test for project identity-infra and 1 task it depends on

  Run duration:      7.9s
  Cache:             Skipped (--skip-nx-cache)
  Critical path:     7.9s (2 tasks)
  Recoverable time:  <1ms
```

## REFACTOR — sem mudar comportamento

```
4ad96e5 refactor(identity): extrai busca por chave única no PrismaUserRepository
```

`findByEmail` e `findById` repetiam a mesma busca e o mesmo mapeamento. Os dois passam a delegar para um método privado `findUnique(where)`. O tipo `Prisma.UserWhereUniqueInput` fica dentro da infra; o port continua sem tipo do Prisma. O cabeçalho do spec passa a citar a spec do Marco 3.1 além da S5.

```diff
diff --git a/libs/identity/infra/src/lib/user/prisma-user.repository.ts b/libs/identity/infra/src/lib/user/prisma-user.repository.ts
index efb443f..dc58391 100644
--- a/libs/identity/infra/src/lib/user/prisma-user.repository.ts
+++ b/libs/identity/infra/src/lib/user/prisma-user.repository.ts
@@ -21,14 +21,12 @@ function isUniqueConstraintViolation(error: unknown): boolean {
 export class PrismaUserRepository implements UserRepository {
   constructor(private readonly prisma: PrismaService) {}
 
-  async findByEmail(email: string): Promise<User | null> {
-    const row = await this.prisma.user.findUnique({ where: { email } });
-    return row ? toDomain(row) : null;
+  findByEmail(email: string): Promise<User | null> {
+    return this.findUnique({ email });
   }
 
-  async findById(id: EntityId): Promise<User | null> {
-    const row = await this.prisma.user.findUnique({ where: { id: id.value } });
-    return row ? toDomain(row) : null;
+  findById(id: EntityId): Promise<User | null> {
+    return this.findUnique({ id: id.value });
   }
 
   async save(user: User): Promise<User> {
@@ -44,4 +42,10 @@ export class PrismaUserRepository implements UserRepository {
     }
     return user;
   }
+
+  /** Busca por uma chave única (`id` ou `email`); `null` quando não há linha, sem lançar erro. */
+  private async findUnique(where: Prisma.UserWhereUniqueInput): Promise<User | null> {
+    const row = await this.prisma.user.findUnique({ where });
+    return row ? toDomain(row) : null;
+  }
 }
```

Saída do terminal depois do refactor:

```
$ npx nx test identity-infra --skip-nx-cache --output-style=static -- --verbose

 NX   Running target test for project identity-infra and 1 task it depends on:

> nx run shared-prisma:prisma-generate

> npx prisma generate

Loaded Prisma config from prisma.config.ts.

Prisma schema loaded from prisma/schema.prisma.

✔ Generated Prisma Client (7.10.1) to ./libs/shared/prisma/src/generated/prisma in 65ms

> nx run identity-infra:test --verbose

> jest

Test Suites: 2 passed, 2 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        5.276 s
Ran all test suites.

 NX   Successfully ran target test for project identity-infra and 1 task it depends on

  Run duration:      7.9s
  Cache:             Skipped (--skip-nx-cache)
  Critical path:     7.9s (2 tasks)
  Recoverable time:  <1ms
```

## Verificação completa (antes do push)

- `npx nx run-many -t lint typecheck`: 11 projetos, sem erro nem warning.
- `npx nx run-many -t test --coverage --coverageReporters=text-summary --skip-nx-cache`: 11 projetos verdes, **124 testes** (eram 122). `identity-infra`: 6 testes, 90,47% de statements, 83,33% de branches, 100% de funções, 89,47% de linhas (antes: 89,47% de statements). Todos os projetos continuam acima de 80%.

## Limites

- C01 e C02 não precisam de PostgreSQL (spec: "Sem PG: sim"). Nenhum teste de integração foi criado: isso é da T15 em diante.
- Nenhum model ou migration novo: a tabela `users` já existe (`20261109190000_create_users`).
- `PrismaUserRepository` continua sem registro no `IdentityInfraModule` (T14).
