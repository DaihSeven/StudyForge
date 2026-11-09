# LOG-RED-GREEN-REFACTOR-2 — Daiane Barbosa / Scenario 2: Validação falha — Email não encontrado

Teste: `libs/identity/infra/src/lib/user/prisma-user.repository.spec.ts`
Implementação: `libs/identity/infra/src/lib/user/prisma-user.repository.ts`

## Cenário

Copiado de `docs/specs/s5-identity-repositories.md`:

```gherkin
Scenario: FindUserByEmail retorna null quando email não existe

Given nenhum User com email "notexist@studyforge.com" existe no banco
When chamo UserRepository.findByEmail("notexist@studyforge.com")
Then retorna null
And nenhum erro é lançado (findByEmail é lenient)
```

Nome do teste: `S5 — identity repositories › Scenario 2: Validação falha — Email não encontrado`, o título do cenário na spec.

Mesmo arranjo do cenário 1: sem PostgreSQL, só o delegate `prisma.user` simulado como tabela em memória. A tabela tem outro usuário (`mentor@studyforge.com`), então o teste também falharia se o repositório devolvesse "qualquer linha" em vez de procurar pelo email.

**Por que existe um RED aqui.** O GREEN do cenário 1 foi mínimo de propósito: convertia a linha sem checar `null` (`row!`). Se ele já tratasse linha ausente, este cenário nasceria verde e não haveria ciclo. Não foi preciso commit de contrato: o método e os tipos já existiam.

## RED — o teste que ainda não passa

**Commit do teste (só o teste):**

```
c765246 test(identity): red — Scenario 2: Validação falha — Email não encontrado
```

**Saída do terminal** (rodada antes do commit acima):

```
$ npx nx test identity-infra --skip-nx-cache -- --testPathPatterns=prisma-user.repository
> nx run identity-infra:test --testPathPatterns=prisma-user.repository

> jest --testPathPatterns=prisma-user.repository

 FAIL   identity-infra  src/lib/user/prisma-user.repository.spec.ts
  ● S5 — identity repositories › Scenario 2: Validação falha — Email não encontrado

    expect(received).resolves.toBeNull()

    Received promise rejected instead of resolved
    Rejected to value: [TypeError: Cannot read properties of null (reading 'id')]

      61 |     // Then retorna null
      62 |     // And nenhum erro é lançado (findByEmail é lenient)
    > 63 |     await expect(repository.findByEmail('notexist@studyforge.com')).resolves.toBeNull();
         |           ^
      64 |   });
      65 | });
      66 |

      at expect (../../../node_modules/@jest/core/node_modules/expect/build/index.js:2116:15)
      at src/lib/user/prisma-user.repository.spec.ts:63:11
      at ../../../node_modules/tslib/tslib.js:170:75
      at Object.__awaiter (../../../node_modules/tslib/tslib.js:166:16)
      at Object.<anonymous> (src/lib/user/prisma-user.repository.spec.ts:51:71)

Test Suites: 1 failed, 1 total
Tests:       1 failed, 1 passed, 2 total
Snapshots:   0 total
Time:        4.725 s
Ran all test suites matching prisma-user.repository.
Warning: command "jest --testPathPatterns=prisma-user.repository" exited with non-zero status code


 NX   Running target test for project identity-infra and 1 task it depends on failed

Failed tasks:

- identity-infra:test

Hint: run the command with --verbose for more details.

  Run duration:      7.3s
  Cache:             Skipped (--skip-nx-cache)
  Critical path:     7.2s (2 tasks)
  Recoverable time:  <1ms

$ npx jest -c libs/identity/infra/jest.config.cts --testPathPatterns=prisma-user.repository --json | jq -r ...
PASSED  S5 — identity repositories › Scenario 1: Encontrar User existente por email (Caso Feliz)
FAILED  S5 — identity repositories › Scenario 2: Validação falha — Email não encontrado
```

**Por que esperávamos que falhasse assim:** o cenário exige `null` **sem erro**. A implementação do cenário 1 tenta converter uma linha que não existe e lança `TypeError`. A falha é exatamente o "nenhum erro é lançado" do cenário, e o cenário 1 continua verde.

## GREEN — o menor código que faz passar

**Commit da implementação:**

```
6aaee5e feat(identity): green — Scenario 2: Validação falha — Email não encontrado
```

**Saída do terminal com os testes passando:**

```
$ npx nx test identity-infra --skip-nx-cache -- --testPathPatterns=prisma-user.repository
> nx run identity-infra:test --testPathPatterns=prisma-user.repository

> jest --testPathPatterns=prisma-user.repository

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Snapshots:   0 total
Time:        4.629 s, estimated 5 s
Ran all test suites matching prisma-user.repository.



 NX   Successfully ran target test for project identity-infra and 1 task it depends on


  Run duration:      7.2s
  Cache:             Skipped (--skip-nx-cache)
  Critical path:     7.2s (2 tasks)
  Recoverable time:  <1ms

$ npx jest -c libs/identity/infra/jest.config.cts --testPathPatterns=prisma-user.repository --json | jq -r ...
PASSED  S5 — identity repositories › Scenario 1: Encontrar User existente por email (Caso Feliz)
PASSED  S5 — identity repositories › Scenario 2: Validação falha — Email não encontrado
```

**O que foi implementado e por que é o mínimo:** uma linha. `return toDomain(row!)` virou `return row ? toDomain(row) : null`, e o `eslint-disable` da asserção não nula saiu junto.

## REFACTOR — o que foi limpo

**Commit do refactor:**

```
67cba5f refactor(identity): fixture única do mentor no spec dos cenários S5
```

**O que mudou e por que o comportamento continua o mesmo:** a produção já estava mínima, sem nada a limpar. A duplicação estava no teste: a mesma linha `mentor` declarada nos dois cenários virou uma constante `mentor: UserRow`, e os asserts do cenário 1 passaram a usar `mentor.id` e `mentor.createdAt`. Os valores são os mesmos; só o teste mudou.

**Confirmação:** testes rodados de novo depois do refactor. Ainda verdes?
`[x] sim` `[ ] não, e por isso eu desfiz`

```
$ npx nx test identity-infra --skip-nx-cache -- --testPathPatterns=prisma-user.repository
> nx run identity-infra:test --testPathPatterns=prisma-user.repository

> jest --testPathPatterns=prisma-user.repository

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Snapshots:   0 total
Time:        4.664 s, estimated 5 s
Ran all test suites matching prisma-user.repository.



 NX   Successfully ran target test for project identity-infra and 1 task it depends on


  Run duration:      7.3s
  Cache:             Skipped (--skip-nx-cache)
  Critical path:     7.3s (2 tasks)
  Recoverable time:  <1ms

$ npx jest -c libs/identity/infra/jest.config.cts --testPathPatterns=prisma-user.repository --json | jq -r ...
PASSED  S5 — identity repositories › Scenario 1: Encontrar User existente por email (Caso Feliz)
PASSED  S5 — identity repositories › Scenario 2: Validação falha — Email não encontrado
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

Cobertura das libs `identity` (linha "All files", stmts / branch / funcs / lines):

```
identity-application | 0 / 0 / 0 / 0
identity-domain | 100 / 96.42 / 100 / 100
identity-infra | 100 / 100 / 100 / 100
```

---

## Verificação de ordem (obrigatório)

```
$ git log --oneline -- libs/identity/infra/src/lib/user/prisma-user.repository.spec.ts libs/identity/infra/src/lib/user/prisma-user.repository.ts
67cba5f refactor(identity): fixture única do mentor no spec dos cenários S5
6aaee5e feat(identity): green — Scenario 2: Validação falha — Email não encontrado
c765246 test(identity): red — Scenario 2: Validação falha — Email não encontrado
d71dbaf refactor(identity): extrai mapeamento linha → User em toDomain
3755b89 feat(identity): green — Scenario 1: Encontrar User existente por email (Caso Feliz)
4a5d0fb test(identity): red — Scenario 1: Encontrar User existente por email (Caso Feliz)
4e0b5c5 chore(identity): findByEmail do contrato recebe o email
1eb6820 chore(identity): contrato de UserRepository.findByEmail
```

O RED deste cenário (`c765246`) é mais antigo que o GREEN (`6aaee5e`). Horários (`git log --format='%h %ad %s' --date=format:'%H:%M:%S' main..HEAD`):

```
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
