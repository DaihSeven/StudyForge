# LOG-RED-GREEN-REFACTOR-1 — Daiane Barbosa / Scenario 1: Encontrar User existente por email (Caso Feliz)

Teste: `libs/identity/infra/src/lib/user/prisma-user.repository.spec.ts`
Implementação: `libs/identity/infra/src/lib/user/prisma-user.repository.ts`

## Cenário

Copiado de `docs/specs/s5-identity-repositories.md`:

```gherkin
Scenario: FindUserByEmail retorna User quando email existe

Given um User com email "mentor@studyforge.com" existe no banco
And o email é único
When chamo UserRepository.findByEmail("mentor@studyforge.com")
Then retorna um User { id, email, createdAt }
And o email retornado é "mentor@studyforge.com"
And nenhum erro é lançado
```

Nome do teste: `S5 — identity repositories › Scenario 1: Encontrar User existente por email (Caso Feliz)`, o título do cenário na spec.

**Onde o teste roda e o que ele prova.** Em `identity-infra`, sem PostgreSQL (o CI não tem banco). Só a fronteira com o banco é simulada: o delegate `prisma.user` é uma tabela em memória que responde pelo `where` recebido. Se o repositório consultasse pelo campo errado, a tabela devolveria `null` e o teste falharia. O código exercitado é o `PrismaUserRepository` real, e os asserts olham o que ele devolve, não as chamadas ao mock.

## Preparação — contrato sem comportamento

Antes do RED, um commit só com o contrato, para que o teste falhe pelo motivo do cenário e não por import ou tipo inexistente (o ts-jest faz checagem de tipos):

```
1eb6820 chore(identity): contrato de UserRepository.findByEmail
```

- `User` ganha `createdAt` obrigatório (a spec retorna `User { id, email, createdAt }`); testes de domínio ajustados.
- `model User` no Prisma (`email @unique`) + migration `20261109190000_create_users`, gerada com `prisma migrate diff --from-schema <schema anterior> --to-schema prisma/schema.prisma --script` (não precisa de banco).
- Port `UserRepository` + `USER_REPOSITORY_TOKEN` (Symbol) em `identity-application`.
- `PrismaUserRepository.findByEmail` devolvendo sempre `null`.

Nomes e caminhos seguem o padrão do contexto `import` (`lib/ports/<x>.repository.ts`, `lib/<x>/prisma-<x>.repository.ts`, token `Symbol`), e não os do ADR-003 (`IUserRepository`, `repositories/`, `adapters/`, token string). A nota está no ADR-003.

### Tropeço: primeiro RED falhou pelo motivo errado

Para calar um warning de lint (`'_email' is defined but never used`), tirei o parâmetro do stub. O primeiro RED falhou por **erro de tipo**, não pelo cenário. Saída real:

```
> nx run identity-infra:test --testPathPatterns=prisma-user.repository

> jest --testPathPatterns=prisma-user.repository

 FAIL   identity-infra  src/lib/user/prisma-user.repository.spec.ts
  ● Test suite failed to run

    src/lib/user/prisma-user.repository.spec.ts:41:47 - error TS2554: Expected 0 arguments, but got 1.

    41     const user = await repository.findByEmail('mentor@studyforge.com');
                                                     ~~~~~~~~~~~~~~~~~~~~~~~

Test Suites: 1 failed, 1 total
Tests:       0 total
Snapshots:   0 total
Time:        3.416 s
Ran all test suites matching prisma-user.repository.
Warning: command "jest --testPathPatterns=prisma-user.repository" exited with non-zero status code
```

Não commitei o teste nesse estado. Corrigi o contrato num commit separado (sem `--amend`, para o histórico mostrar):

```
4e0b5c5 chore(identity): findByEmail do contrato recebe o email
```

## RED — o teste que ainda não passa

**Commit do teste (só o teste, nada de `src/` de produção):**

```
4a5d0fb test(identity): red — Scenario 1: Encontrar User existente por email (Caso Feliz)
```

**Saída do terminal** (`npx nx test identity-infra --skip-nx-cache -- --testPathPatterns=prisma-user.repository`, rodado antes do commit acima):

```
> nx run identity-infra:test --testPathPatterns=prisma-user.repository

> jest --testPathPatterns=prisma-user.repository

 FAIL   identity-infra  src/lib/user/prisma-user.repository.spec.ts (5.945 s)
  ● S5 — identity repositories › Scenario 1: Encontrar User existente por email (Caso Feliz)

    expect(received).toBeInstanceOf(expected)

    Expected constructor: User

    Received value has no prototype
    Received value: null

      42 |
      43 |     // Then retorna um User { id, email, createdAt }
    > 44 |     expect(user).toBeInstanceOf(User);
         |                  ^
      45 |     expect(user?.id.value).toBe('user-uuid-123');
      46 |     expect(user?.createdAt).toEqual(new Date('2026-10-13T10:00:00Z'));
      47 |     // And o email retornado é "mentor@studyforge.com"

      at src/lib/user/prisma-user.repository.spec.ts:44:18
      at fulfilled (../../../node_modules/tslib/tslib.js:167:62)

Test Suites: 1 failed, 1 total
Tests:       1 failed, 1 total
Snapshots:   0 total
Time:        6.428 s
Ran all test suites matching prisma-user.repository.
Warning: command "jest --testPathPatterns=prisma-user.repository" exited with non-zero status code


 NX   Running target test for project identity-infra and 1 task it depends on failed

Failed tasks:

- identity-infra:test

Hint: run the command with --verbose for more details.

  Run duration:      10.8s
  Cache:             Skipped (--skip-nx-cache)
  Critical path:     10.8s (2 tasks)
  Recoverable time:  <1ms
```

**Por que esperávamos que falhasse assim:** o contrato devolve sempre `null`. O User existe na tabela, mas o repositório não o encontra: exatamente o comportamento que o cenário exige e que ainda não existe.

## GREEN — o menor código que faz passar

**Commit da implementação:**

```
3755b89 feat(identity): green — Scenario 1: Encontrar User existente por email (Caso Feliz)
```

**Saída do terminal com o teste passando** (o reporter padrão do Jest não lista nomes de testes que passam numa suíte só, então a segunda parte usa `--json` para mostrar nome e status):

```
$ npx nx test identity-infra --skip-nx-cache -- --testPathPatterns=prisma-user.repository
> nx run identity-infra:test --testPathPatterns=prisma-user.repository

> jest --testPathPatterns=prisma-user.repository

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        4.658 s
Ran all test suites matching prisma-user.repository.



 NX   Successfully ran target test for project identity-infra and 1 task it depends on


  Run duration:      7.3s
  Cache:             Skipped (--skip-nx-cache)
  Critical path:     7.3s (2 tasks)
  Recoverable time:  <1ms

$ npx jest -c libs/identity/infra/jest.config.cts --testPathPatterns=prisma-user.repository --json | jq -r ...
PASSED  S5 — identity repositories › Scenario 1: Encontrar User existente por email (Caso Feliz)
```

**O que foi implementado e por que é o mínimo:** `findByEmail` consulta `prisma.user.findUnique({ where: { email } })` e converte a linha em `User` com `User.create`. De propósito, **não** trata linha ausente (usa `row!`): nenhum teste pede isso ainda, e é o comportamento do cenário 2.

## REFACTOR — o que foi limpo

**Commit do refactor:**

```
d71dbaf refactor(identity): extrai mapeamento linha → User em toDomain
```

**O que mudou e por que o comportamento continua o mesmo:** os quatro `row!` numa linha longa viraram uma função `toDomain(row)` com o tipo `UserRow` (o tipo gerado pelo Prisma não vaza para fora da infra). Mesma consulta, mesmo mapeamento; só a forma mudou.

**Confirmação:** teste rodado de novo depois do refactor. Ainda verde?
`[x] sim` `[ ] não, e por isso eu desfiz`

```
$ npx nx test identity-infra --skip-nx-cache -- --testPathPatterns=prisma-user.repository
> nx run identity-infra:test --testPathPatterns=prisma-user.repository

> jest --testPathPatterns=prisma-user.repository

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        4.725 s, estimated 5 s
Ran all test suites matching prisma-user.repository.



 NX   Successfully ran target test for project identity-infra and 1 task it depends on


  Run duration:      7.5s
  Cache:             Skipped (--skip-nx-cache)
  Critical path:     7.4s (2 tasks)
  Recoverable time:  <1ms

$ npx jest -c libs/identity/infra/jest.config.cts --testPathPatterns=prisma-user.repository --json | jq -r ...
PASSED  S5 — identity repositories › Scenario 1: Encontrar User existente por email (Caso Feliz)
```

## Checagens depois do cenário

`npm run lint`, `npm run typecheck` e `npm run test:cov` no repo inteiro (11 projetos), rodados depois do refactor:

```
$ npm run lint
 NX   Successfully ran target lint for 11 projects and 1 task they depend on
- api
- identity-application
- identity-domain
- identity-infra
- import-application
- import-domain
- import-infra
- shared-contracts
- shared-domain
- shared-prisma
- web
(exit 0)

$ npm run typecheck
 NX   Successfully ran target typecheck for 11 projects and 1 task they depend on
- api
- identity-application
- identity-domain
- identity-infra
- import-application
- import-domain
- import-infra
- shared-contracts
- shared-domain
- shared-prisma
- web
(exit 0)

$ npm run test:cov
 NX   Successfully ran target test for 11 projects and 1 task they depend on
- api
- identity-application
- identity-domain
- identity-infra
- import-application
- import-domain
- import-infra
- shared-contracts
- shared-domain
- shared-prisma
- web
(exit 0)
```

Cobertura das libs `identity` (`npx jest -c <projeto>/jest.config.cts --coverage --coverageReporters=text`, linha "All files", stmts / branch / funcs / lines):

```
identity-application | 0 / 0 / 0 / 0
identity-domain | 100 / 96.42 / 100 / 100
identity-infra | 100 / 100 / 100 / 100
```

`identity-application` está 0/0 porque só tem interface e um `Symbol` exportado, sem spec própria (`passWithNoTests`).

---

## Verificação de ordem (obrigatório)

```
$ git log --oneline -- libs/identity/infra/src/lib/user/prisma-user.repository.spec.ts libs/identity/infra/src/lib/user/prisma-user.repository.ts
d71dbaf refactor(identity): extrai mapeamento linha → User em toDomain
3755b89 feat(identity): green — Scenario 1: Encontrar User existente por email (Caso Feliz)
4a5d0fb test(identity): red — Scenario 1: Encontrar User existente por email (Caso Feliz)
4e0b5c5 chore(identity): findByEmail do contrato recebe o email
1eb6820 chore(identity): contrato de UserRepository.findByEmail
```

O commit RED (`4a5d0fb`) é mais antigo que o GREEN (`3755b89`). Horários dos commits (`git log --format='%h %ad %s' --date=format:'%H:%M:%S' main..HEAD`):

```
d71dbaf 19:06:59 refactor(identity): extrai mapeamento linha → User em toDomain
3755b89 19:06:15 feat(identity): green — Scenario 1: Encontrar User existente por email (Caso Feliz)
4a5d0fb 19:04:26 test(identity): red — Scenario 1: Encontrar User existente por email (Caso Feliz)
4e0b5c5 19:03:59 chore(identity): findByEmail do contrato recebe o email
1eb6820 19:03:10 chore(identity): contrato de UserRepository.findByEmail
```
