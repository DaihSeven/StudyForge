# LOG-RED-GREEN-REFACTOR-3 — Daiane Barbosa / Scenario 3: SaveUser falha — Email duplicado (Edge Case)

Teste: `libs/identity/infra/src/lib/user/prisma-user.repository.spec.ts`
Implementação: `libs/identity/infra/src/lib/user/prisma-user.repository.ts`

## Cenário

Copiado de `docs/specs/s5-identity-repositories.md`:

```gherkin
Scenario: SaveUser lança erro quando email já existe

Given um User com email "mentor@studyforge.com" já existe no banco
When tento salvar novo User com email "mentor@studyforge.com"
Then lança DuplicateEmailError
And a mensagem de erro contém "Email already in use"
And nenhuma alteração é feita no banco
```

Nome do teste: `S5 — identity repositories › Scenario 3: SaveUser falha — Email duplicado (Edge Case)`, o título do cenário na spec.

**Como o teste simula o banco.** Sem PostgreSQL, o `create` do delegate `prisma.user` faz o que o índice único `users_email_key` da migration faz: com email repetido, não grava e lança um `Prisma.PrismaClientKnownRequestError` **real**, com `code: 'P2002'` (a mesma classe que o Prisma lança contra o banco). O código exercitado é a tradução desse erro no `PrismaUserRepository`.

### Limitação: "And nenhuma alteração é feita no banco"

Sem banco no CI, esta cláusula **não é verificada pelo teste**. Checar que a tabela em memória não mudou seria checar o comportamento do próprio fake, que eu mesma programei para não gravar: um teste que verifica o mock (padrão 1 do starter). Quem garante a cláusula é o PostgreSQL. O `INSERT` recusado pelo índice único `users_email_key` (migration `20261109190000_create_users`) não grava nada, e o `save` faz uma única escrita (`create`), sem update nem upsert que pudessem alterar a linha existente. Provar isso de verdade exige um teste de integração com PostgreSQL, como o `test-integration` do `import-infra`. Este ambiente e o CI não têm banco, então ficou fora desta entrega.

## Preparação — contrato sem comportamento

```
e4ac6d5 chore(identity): contrato de UserRepository.save
```

- `save(user): Promise<User>` no port `UserRepository`.
- `DuplicateEmailError` em `identity-application` (`DomainError` com código `DUPLICATE_EMAIL`, mensagem `Email already in use: <email>`). Fica em application, e não no domínio: a entidade `User` sozinha não sabe se o email já existe; quem detecta é a persistência.
- `shared-prisma` passa a reexportar o namespace `Prisma`, para a infra reconhecer `PrismaClientKnownRequestError` sem importar o client gerado diretamente.
- `PrismaUserRepository.save` devolvendo o `User` sem gravar nada.

Sem isso, o teste importaria `DuplicateEmailError` e chamaria `save`, que não existiam, e o RED falharia por erro de tipo.

## RED — o teste que ainda não passa

**Commit do teste (só o teste):**

```
a8ebb3d test(identity): red — Scenario 3: SaveUser falha — Email duplicado (Edge Case)
```

**Saída do terminal** (rodada antes do commit acima):

```
$ npx nx test identity-infra --skip-nx-cache -- --testPathPatterns=prisma-user.repository
> nx run identity-infra:test --testPathPatterns=prisma-user.repository

> jest --testPathPatterns=prisma-user.repository

 FAIL   identity-infra  src/lib/user/prisma-user.repository.spec.ts
  ● S5 — identity repositories › Scenario 3: SaveUser falha — Email duplicado (Edge Case)

    expect(received).rejects.toBeInstanceOf()

    Received promise resolved instead of rejected
    Resolved to value: {"createdAt": 2026-11-09T10:00:00.000Z, "email": "mentor@studyforge.com", "id": {"value": "user-uuid-456"}, "name": "Outro Mentor"}

      90 |
      91 |     // Then lança DuplicateEmailError
    > 92 |     await expect(saving).rejects.toBeInstanceOf(DuplicateEmailError);
         |           ^
      93 |     // And a mensagem de erro contém "Email already in use"
      94 |     await expect(saving).rejects.toThrow('Email already in use');
      95 |     // And nenhuma alteração é feita no banco: sem PostgreSQL no CI, isso não é verificável

      at expect (../../../node_modules/@jest/core/node_modules/expect/build/index.js:2116:15)
      at src/lib/user/prisma-user.repository.spec.ts:92:11
      at ../../../node_modules/tslib/tslib.js:170:75
      at Object.__awaiter (../../../node_modules/tslib/tslib.js:166:16)
      at Object.<anonymous> (src/lib/user/prisma-user.repository.spec.ts:78:77)

Test Suites: 1 failed, 1 total
Tests:       1 failed, 2 passed, 3 total
Snapshots:   0 total
Time:        4.793 s, estimated 5 s
Ran all test suites matching prisma-user.repository.
Warning: command "jest --testPathPatterns=prisma-user.repository" exited with non-zero status code


 NX   Running target test for project identity-infra and 1 task it depends on failed

Failed tasks:

- identity-infra:test

Hint: run the command with --verbose for more details.

  Run duration:      7.3s
  Cache:             Skipped (--skip-nx-cache)
  Critical path:     7.3s (2 tasks)
  Recoverable time:  <1ms

$ npx jest -c libs/identity/infra/jest.config.cts --testPathPatterns=prisma-user.repository --json | jq -r ...
PASSED  S5 — identity repositories › Scenario 1: Encontrar User existente por email (Caso Feliz)
PASSED  S5 — identity repositories › Scenario 2: Validação falha — Email não encontrado
FAILED  S5 — identity repositories › Scenario 3: SaveUser falha — Email duplicado (Edge Case)
```

**Por que esperávamos que falhasse assim:** o contrato aceita qualquer `User` sem consultar o banco, então o email duplicado passa. A falha é "resolveu em vez de rejeitar": exatamente o "lança DuplicateEmailError" do cenário. Os cenários 1 e 2 continuam verdes.

## GREEN — o menor código que faz passar

**Commit da implementação:**

```
fe699d0 feat(identity): green — Scenario 3: SaveUser falha — Email duplicado (Edge Case)
```

**Saída do terminal com os testes passando:**

```
$ npx nx test identity-infra --skip-nx-cache -- --testPathPatterns=prisma-user.repository
> nx run identity-infra:test --testPathPatterns=prisma-user.repository

> jest --testPathPatterns=prisma-user.repository

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Snapshots:   0 total
Time:        4.906 s, estimated 5 s
Ran all test suites matching prisma-user.repository.



 NX   Successfully ran target test for project identity-infra and 1 task it depends on


  Run duration:      7.6s
  Cache:             Skipped (--skip-nx-cache)
  Critical path:     7.6s (2 tasks)
  Recoverable time:  <1ms

$ npx jest -c libs/identity/infra/jest.config.cts --testPathPatterns=prisma-user.repository --json | jq -r ...
PASSED  S5 — identity repositories › Scenario 1: Encontrar User existente por email (Caso Feliz)
PASSED  S5 — identity repositories › Scenario 2: Validação falha — Email não encontrado
PASSED  S5 — identity repositories › Scenario 3: SaveUser falha — Email duplicado (Edge Case)
```

**O que foi implementado e por que é o mínimo:** `save` chama `prisma.user.create` com os campos do `User` e, no `catch`, traduz **só** o P2002 em `DuplicateEmailError`; qualquer outro erro é relançado como veio. O teste passaria também com um `catch` que transformasse todo erro em `DuplicateEmailError`. Não fiz isso porque seria um bug conhecido: uma queda de conexão viraria "Email already in use".

## REFACTOR — o que foi limpo

**Commit do refactor:**

```
2ae294e refactor(identity): nomeia a checagem de P2002 em isUniqueConstraintViolation
```

**O que mudou e por que o comportamento continua o mesmo:** a condição `error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'`, com o código mágico `'P2002'`, virou a função `isUniqueConstraintViolation(error)`, que documenta o que o código significa. A expressão é a mesma, só ganhou nome.

**Confirmação:** testes rodados de novo depois do refactor. Ainda verdes?
`[x] sim` `[ ] não, e por isso eu desfiz`

```
$ npx nx test identity-infra --skip-nx-cache -- --testPathPatterns=prisma-user.repository
> nx run identity-infra:test --testPathPatterns=prisma-user.repository

> jest --testPathPatterns=prisma-user.repository

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Snapshots:   0 total
Time:        4.856 s, estimated 5 s
Ran all test suites matching prisma-user.repository.



 NX   Successfully ran target test for project identity-infra and 1 task it depends on


  Run duration:      7.6s
  Cache:             Skipped (--skip-nx-cache)
  Critical path:     7.5s (2 tasks)
  Recoverable time:  <1ms

$ npx jest -c libs/identity/infra/jest.config.cts --testPathPatterns=prisma-user.repository --json | jq -r ...
PASSED  S5 — identity repositories › Scenario 1: Encontrar User existente por email (Caso Feliz)
PASSED  S5 — identity repositories › Scenario 2: Validação falha — Email não encontrado
PASSED  S5 — identity repositories › Scenario 3: SaveUser falha — Email duplicado (Edge Case)
```

## Checagens depois do cenário

`npm run lint`, `npm run typecheck` e `npm run test:cov` no repo inteiro (11 projetos), depois do refactor:

```
$ npm run lint
 NX   Successfully ran target lint for 11 projects and 1 task they depend on
(exit 0)

$ npm run typecheck
 NX   Successfully ran target typecheck for 11 projects and 1 task they depend on
(exit 0)

$ npm run test:cov
 NX   Successfully ran target test for 11 projects and 1 task they depend on
(exit 0)
```

Cobertura do `identity-infra` (`npx jest -c libs/identity/infra/jest.config.cts --coverage --coverageReporters=text`):

```
---------------------------|---------|----------|---------|---------|-------------------
File                       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
---------------------------|---------|----------|---------|---------|-------------------
All files                  |   89.47 |    83.33 |     100 |   88.23 |                   
 prisma-user.repository.ts |   89.47 |    83.33 |     100 |   88.23 | 38-40             
---------------------------|---------|----------|---------|---------|-------------------
```

Acima do threshold de 80%. As linhas 38-40 (relançar um erro que não é P2002 e o `return user` do caminho de sucesso) não são cobertas: nenhum dos 3 cenários BDD passa por elas, e não acrescentei testes fora dos cenários.

Libs `identity` (stmts / branch / funcs / lines):

```
identity-application | 0 / 0 / 0 / 0
identity-domain | 100 / 96.42 / 100 / 100
identity-infra | 89.47 / 83.33 / 100 / 88.23
```

---

## Verificação de ordem (obrigatório)

```
$ git log --oneline -- libs/identity/infra/src/lib/user/prisma-user.repository.spec.ts libs/identity/infra/src/lib/user/prisma-user.repository.ts
2ae294e refactor(identity): nomeia a checagem de P2002 em isUniqueConstraintViolation
fe699d0 feat(identity): green — Scenario 3: SaveUser falha — Email duplicado (Edge Case)
a8ebb3d test(identity): red — Scenario 3: SaveUser falha — Email duplicado (Edge Case)
e4ac6d5 chore(identity): contrato de UserRepository.save
67cba5f refactor(identity): fixture única do mentor no spec dos cenários S5
6aaee5e feat(identity): green — Scenario 2: Validação falha — Email não encontrado
c765246 test(identity): red — Scenario 2: Validação falha — Email não encontrado
d71dbaf refactor(identity): extrai mapeamento linha → User em toDomain
3755b89 feat(identity): green — Scenario 1: Encontrar User existente por email (Caso Feliz)
4a5d0fb test(identity): red — Scenario 1: Encontrar User existente por email (Caso Feliz)
4e0b5c5 chore(identity): findByEmail do contrato recebe o email
1eb6820 chore(identity): contrato de UserRepository.findByEmail
```

O RED deste cenário (`a8ebb3d`) é mais antigo que o GREEN (`fe699d0`). Nos três cenários, cada `test(...): red` aparece antes do `feat(...): green` correspondente. Horários (`git log --format='%h %ad %s' --date=format:'%H:%M:%S' main..HEAD`):

```
2ae294e 19:21:24 refactor(identity): nomeia a checagem de P2002 em isUniqueConstraintViolation
fe699d0 19:20:38 feat(identity): green — Scenario 3: SaveUser falha — Email duplicado (Edge Case)
a8ebb3d 19:19:37 test(identity): red — Scenario 3: SaveUser falha — Email duplicado (Edge Case)
e4ac6d5 19:18:42 chore(identity): contrato de UserRepository.save
a815fa0 19:17:18 docs(identity): log red/green/refactor do cenário 2
67cba5f 19:14:22 refactor(identity): fixture única do mentor no spec dos cenários S5
6aaee5e 19:13:37 feat(identity): green — Scenario 2: Validação falha — Email não encontrado
c765246 19:13:02 test(identity): red — Scenario 2: Validação falha — Email não encontrado
9f149b6 19:12:29 docs(identity): log red/green/refactor do cenário 1 e nota de implementação no ADR-003
d71dbaf 19:06:59 refactor(identity): extrai mapeamento linha → User em toDomain
3755b89 19:06:15 feat(identity): green — Scenario 1: Encontrar User existente por email (Caso Feliz)
4a5d0fb 19:04:26 test(identity): red — Scenario 1: Encontrar User existente por email (Caso Feliz)
4e0b5c5 19:03:59 chore(identity): findByEmail do contrato recebe o email
1eb6820 19:03:10 chore(identity): contrato de UserRepository.findByEmail
```
