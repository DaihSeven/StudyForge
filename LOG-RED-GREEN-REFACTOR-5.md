# LOG-RED-GREEN-REFACTOR-5 — Semana 11, PR 1: núcleo da geração de rascunhos (sem HTTP, sem provedor real, sem migration)

Escopo: ADR-010, itens a–f do pedido. Cada peça segue chore (contrato com stub que **lança erro**) → test (RED) → feat (GREEN) → refactor, com a saída real do terminal. Nos trechos abaixo, os *stack frames* e os *code frames* do Jest foram omitidos; títulos de teste, mensagens de erro e totais são os reais. Rodadas com `--skip-nx-cache --output-style=static`.

Os stubs lançam `Error('... ainda não implementado.')` (como no log 4), então o RED falha por comportamento, não por erro de tipo. Na peça 5 o primeiro RED falhou por erro de compilação (stub sem as dependências do construtor); o stub foi completado e os commits refeitos antes do RED valer.

## Peça 1 — schema Zod da saída gerada (`shared/contracts`)

Só forma: tipo conhecido, letras A–E, quantidade de alternativas entre o mínimo e o máximo dos tipos existentes.

### RED

```
377ff99 chore(contracts): contrato do schema de rascunho gerado (stub)
4c47a50 test(contracts): red — schema de rascunho gerado
```
```
$ npx nx test shared-contracts

> jest

 FAIL   shared-contracts  src/lib/generated-draft-question.schema.spec.ts
  ● GeneratedDraftQuestionSchema › accepts a well-formed generated question

    TypeError: generated_draft_question_schema_1.GeneratedDraftQuestionSchema.parse is not a function

  ● GeneratedDraftQuestionSchema › rejects an unknown question type

    GeneratedDraftQuestionSchema ainda não implementado.

  ● GeneratedDraftQuestionSchema › rejects a missing statement

    GeneratedDraftQuestionSchema ainda não implementado.

  ● GeneratedDraftQuestionSchema › rejects a letter outside A–E

    GeneratedDraftQuestionSchema ainda não implementado.

  ● GeneratedDraftQuestionSchema › rejects fewer alternatives than the minimum of the smallest question type

    GeneratedDraftQuestionSchema ainda não implementado.

  ● GeneratedDraftQuestionSchema › rejects more alternatives than the maximum of the largest question type

    GeneratedDraftQuestionSchema ainda não implementado.

Test Suites: 1 failed, 1 passed, 2 total
Tests:       6 failed, 4 passed, 10 total
Snapshots:   0 total
Time:        3.738 s, estimated 10 s
Ran all test suites.
```

### GREEN

```
6e81f7b feat(contracts): green — schema de rascunho gerado
```
```
$ npx nx test shared-contracts

> jest

Test Suites: 2 passed, 2 total
Tests:       10 passed, 10 total
Snapshots:   0 total
Time:        3.537 s, estimated 4 s
Ran all test suites.
```

### REFACTOR

Sem refactor: o schema já deriva os limites de `QUESTION_TYPE_RULES`, sem repetir números. A regra de *quantas são corretas* ficou fora do contrato (ver conflitos no resumo do PR).

## Peça 2 — `validateDraftQuestionStructure` (regra `validar_questao`, `import/domain`)

Função pura, devolve `Result`. No refactor, `DraftQuestion.create` passou a chamar a mesma função (a regra deixou de existir em dois lugares) e os erros foram para `invalid-draft-question.error.ts` para evitar import circular. Os 31 testes antigos do domínio seguiram verdes.

### RED

```
0ca61d7 chore(import-domain): contrato de validateDraftQuestionStructure (stub)
1b7e4ff test(import-domain): red — validar_questao
```
```
$ npx nx test import-domain

> jest

FAIL import-domain src/lib/validate-draft-question-structure.spec.ts
  ● validateDraftQuestionStructure (validar_questao) › accepts a valid SINGLE_CHOICE and returns the alternatives sorted by letter

    validateDraftQuestionStructure ainda não implementado.

  ● validateDraftQuestionStructure (validar_questao) › accepts a valid MULTIPLE_CHOICE

    validateDraftQuestionStructure ainda não implementado.

  ● validateDraftQuestionStructure (validar_questao) › returns Err with code INVALID_QUESTION_TYPE

    validateDraftQuestionStructure ainda não implementado.

  ● validateDraftQuestionStructure (validar_questao) › returns Err with code INVALID_ALTERNATIVE_COUNT

    validateDraftQuestionStructure ainda não implementado.

  ● validateDraftQuestionStructure (validar_questao) › returns Err with code INVALID_ALTERNATIVE_LETTERS

    validateDraftQuestionStructure ainda não implementado.

  ● validateDraftQuestionStructure (validar_questao) › returns Err with code INVALID_CORRECT_COUNT

    validateDraftQuestionStructure ainda não implementado.

  ● validateDraftQuestionStructure (validar_questao) › returns Err with code INVALID_CORRECT_COUNT

    validateDraftQuestionStructure ainda não implementado.

  ● validateDraftQuestionStructure (validar_questao) › returns Err with code EMPTY_STATEMENT

    validateDraftQuestionStructure ainda não implementado.

  ● validateDraftQuestionStructure (validar_questao) › returns Err with code EMPTY_ALTERNATIVE_TEXT

    validateDraftQuestionStructure ainda não implementado.

  ● validateDraftQuestionStructure (validar_questao) › does not throw on non-string text coming from a model

    validateDraftQuestionStructure ainda não implementado.

Test Suites: 1 failed, 1 passed, 2 total
Tests:       10 failed, 31 passed, 41 total
Snapshots:   0 total
Time:        3.581 s, estimated 9 s
Ran all test suites.
```

### GREEN

```
9202175 feat(import-domain): green — validar_questao
```
```
$ npx nx test import-domain

> jest

Test Suites: 2 passed, 2 total
Tests:       41 passed, 41 total
Snapshots:   0 total
Time:        3.446 s, estimated 4 s
Ran all test suites.
```

### REFACTOR

```
39c022f refactor(import-domain): DraftQuestion.create reutiliza validateDraftQuestionStructure
```
```
$ npx nx test import-domain

> jest

Test Suites: 2 passed, 2 total
Tests:       41 passed, 41 total
Snapshots:   0 total
Time:        3.543 s, estimated 4 s
Ran all test suites.
```

## Peça 3 — `AiUsageLimiter` + adapter em memória + `Clock`

Limites por construtor (padrão 10 por mentor). `Clock.currentDay()` devolve a chave do dia; o fuso do reset não foi decidido aqui.

### RED

```
7dda4d4 chore(import): contratos de AiUsageLimiter, Clock e AiUsageLimitExceededError (stub)
59118b7 test(import-infra): red — AiUsageLimiter em memória
```
```
$ npx nx test import-infra

> jest

FAIL import-infra src/lib/ai-usage-limiter/in-memory-ai-usage-limiter.adapter.spec.ts
  ● InMemoryAiUsageLimiterAdapter › allows up to the per-mentor limit and rejects the next one

    InMemoryAiUsageLimiterAdapter ainda não implementado.

  ● InMemoryAiUsageLimiterAdapter › uses 10 as the default per-mentor limit

    InMemoryAiUsageLimiterAdapter ainda não implementado.

  ● InMemoryAiUsageLimiterAdapter › counts each mentor separately

    InMemoryAiUsageLimiterAdapter ainda não implementado.

  ● InMemoryAiUsageLimiterAdapter › rejects when the global daily cap is reached, even for a mentor under their own limit

    InMemoryAiUsageLimiterAdapter ainda não implementado.

  ● InMemoryAiUsageLimiterAdapter › does not consume the global cap when the mentor limit rejects the request

    InMemoryAiUsageLimiterAdapter ainda não implementado.

  ● InMemoryAiUsageLimiterAdapter › resets every counter when the clock moves to another day

    InMemoryAiUsageLimiterAdapter ainda não implementado.

  ● InMemoryAiUsageLimiterAdapter › rejects an invalid limit (0) at construction

    expect(received).toThrow(expected)

    Expected constructor: RangeError

    Received function did not throw

  ● InMemoryAiUsageLimiterAdapter › rejects an invalid limit (-1) at construction

    expect(received).toThrow(expected)

    Expected constructor: RangeError

    Received function did not throw

  ● InMemoryAiUsageLimiterAdapter › rejects an invalid limit (1.5) at construction

    expect(received).toThrow(expected)

    Expected constructor: RangeError

    Received function did not throw

  ● InMemoryAiUsageLimiterAdapter › rejects an invalid limit (NaN) at construction

    expect(received).toThrow(expected)

    Expected constructor: RangeError

    Received function did not throw

Test Suites: 1 failed, 3 passed, 4 total
Tests:       10 failed, 5 passed, 15 total
Snapshots:   0 total
Time:        6.561 s, estimated 14 s
Ran all test suites.
```

### GREEN

```
9776a7c feat(import-infra): green — AiUsageLimiter em memória
```
```
$ npx nx test import-infra

> jest

Test Suites: 4 passed, 4 total
Tests:       15 passed, 15 total
Snapshots:   0 total
Time:        5.923 s, estimated 7 s
Ran all test suites.
```

### REFACTOR

Sem refactor: a classe ficou pequena e sem duplicação.

## Peça 4 — port `QuestionDraftGenerator` + adapter mock

Async iterable determinístico, com `delayMs` (padrão 0) e `sleep` injetável.

### RED

```
ff6c1ec chore(import): contrato do port QuestionDraftGenerator e do adapter mock (stub)
c99a135 test(import-infra): red — adapter mock de QuestionDraftGenerator
```
```
$ npx nx test import-infra

> jest

FAIL import-infra src/lib/question-draft-generator/mock-question-draft-generator.adapter.spec.ts
  ● MockQuestionDraftGeneratorAdapter › emits exactly `quantity` drafts

    MockQuestionDraftGeneratorAdapter ainda não implementado.

  ● MockQuestionDraftGeneratorAdapter › is deterministic: same input, same drafts

    MockQuestionDraftGeneratorAdapter ainda não implementado.

  ● MockQuestionDraftGeneratorAdapter › emits SINGLE_CHOICE drafts with 4 alternatives that satisfy the schema and the domain rule

    MockQuestionDraftGeneratorAdapter ainda não implementado.

  ● MockQuestionDraftGeneratorAdapter › emits MULTIPLE_CHOICE drafts when 5 alternatives are requested

    MockQuestionDraftGeneratorAdapter ainda não implementado.

  ● MockQuestionDraftGeneratorAdapter › varies the correct alternative and the statement across drafts

    MockQuestionDraftGeneratorAdapter ainda não implementado.

  ● MockQuestionDraftGeneratorAdapter › emits lazily, waiting `delayMs` before each draft

    MockQuestionDraftGeneratorAdapter ainda não implementado.

  ● MockQuestionDraftGeneratorAdapter › does not wait when delayMs is 0 (default)

    MockQuestionDraftGeneratorAdapter ainda não implementado.

  ● MockQuestionDraftGeneratorAdapter › rejects an alternatives-per-question count no question type supports

    expect(received).rejects.toThrow(expected)

    Expected constructor: RangeError
    Received constructor: Error

    Received message: "MockQuestionDraftGeneratorAdapter ainda não implementado."

Test Suites: 1 failed, 4 passed, 5 total
Tests:       8 failed, 15 passed, 23 total
Snapshots:   0 total
Time:        6.258 s
Ran all test suites.
```

### GREEN

```
17a4467 feat(import-infra): green — adapter mock de QuestionDraftGenerator
```
```
$ npx nx test import-infra

> jest

Test Suites: 5 passed, 5 total
Tests:       23 passed, 23 total
Snapshots:   0 total
Time:        5.621 s, estimated 6 s
Ran all test suites.
```

### REFACTOR

Sem refactor.

## Peça 5 — `GenerateDraftQuestionsUseCase` (`import/application`)

Reaproveita `CreateDraftQuestionUseCase` para gerar id, validar e salvar; carrega `organizationId` do comando; nunca publica.

### RED

```
dbcab96 chore(import-application): contrato de GenerateDraftQuestionsUseCase (stub)
c72fe91 test(import-application): red — GenerateDraftQuestions
```
```
$ npx nx test import-application

> jest

FAIL import-application src/lib/use-cases/generate-draft-questions.use-case.spec.ts
  ● GenerateDraftQuestionsUseCase › saves every valid generated item as a DraftQuestion carrying the command organizationId

    GenerateDraftQuestionsUseCase ainda não implementado.

  ● GenerateDraftQuestionsUseCase › never publishes: the result is only DraftQuestion, with no published/status state

    GenerateDraftQuestionsUseCase ainda não implementado.

  ● GenerateDraftQuestionsUseCase › passes the text and the options to the generator

    GenerateDraftQuestionsUseCase ainda não implementado.

  ● GenerateDraftQuestionsUseCase › rejects an item that breaks the domain rule without saving it, and keeps the valid ones

    GenerateDraftQuestionsUseCase ainda não implementado.

  ● GenerateDraftQuestionsUseCase › rejects an item that does not match the contract schema

    GenerateDraftQuestionsUseCase ainda não implementado.

  ● GenerateDraftQuestionsUseCase › stops after `quantity` items even if the generator emits more

    GenerateDraftQuestionsUseCase ainda não implementado.

  ● GenerateDraftQuestionsUseCase › consumes the usage limiter once per execution, for the given mentor

    GenerateDraftQuestionsUseCase ainda não implementado.

  ● GenerateDraftQuestionsUseCase › returns the limiter error without calling the generator or saving anything

    GenerateDraftQuestionsUseCase ainda não implementado.

  ● GenerateDraftQuestionsUseCase › returns Err EMPTY_TEXT for an invalid request, without consuming the limiter

    GenerateDraftQuestionsUseCase ainda não implementado.

  ● GenerateDraftQuestionsUseCase › returns Err INVALID_QUANTITY for an invalid request, without consuming the limiter

    GenerateDraftQuestionsUseCase ainda não implementado.

  ● GenerateDraftQuestionsUseCase › returns Err INVALID_QUANTITY for an invalid request, without consuming the limiter

    GenerateDraftQuestionsUseCase ainda não implementado.

  ● GenerateDraftQuestionsUseCase › returns Err INVALID_ALTERNATIVES_PER_QUESTION for an invalid request, without consuming the limiter

    GenerateDraftQuestionsUseCase ainda não implementado.

  ● GenerateDraftQuestionsUseCase › returns Err for an invalid organizationId or mentorId, without calling the generator

    GenerateDraftQuestionsUseCase ainda não implementado.

  ● GenerateDraftQuestionsUseCase › rethrows unexpected generator failures (they are not domain errors)

    expect(received).rejects.toThrow(expected)

    Expected substring: "provider down"
    Received message:   "GenerateDraftQuestionsUseCase ainda não implementado."

Test Suites: 1 failed, 1 passed, 2 total
Tests:       14 failed, 11 passed, 25 total
Snapshots:   0 total
Time:        5.104 s
Ran all test suites.
```

### GREEN

```
93e8813 feat(import-application): green — GenerateDraftQuestions
```
```
$ npx nx test import-application

> jest

Test Suites: 2 passed, 2 total
Tests:       25 passed, 25 total
Snapshots:   0 total
Time:        4.391 s, estimated 5 s
Ran all test suites.
```

### REFACTOR

```
db8e309 refactor(import-application): extrai saveGenerated em GenerateDraftQuestions
```
```
$ npx nx test import-application

> jest

Test Suites: 2 passed, 2 total
Tests:       25 passed, 25 total
Snapshots:   0 total
Time:        4.677 s, estimated 5 s
Ran all test suites.
```

## Fechamento

Após o lint, `import-infra` pediu `@studyforge/shared/domain` e `@studyforge/shared/contracts` no `package.json` (commit `chore(import-infra): declara dependências...`) e o `import-domain` ficou com 69,23% de funções cobertas (as classes de erro novas só eram exercitadas por outros projetos); foram adicionados testes dos erros no próprio domínio.

```
$ npx nx run-many -t lint typecheck
 NX   Successfully ran targets lint, typecheck for 11 projects and 1 task they depend on

$ npx nx run-many -t test --skip-nx-cache -- --coverage
 NX   Successfully ran target test for 11 projects and 1 task they depend on
```

Cobertura (statements): shared-contracts 100, import-domain 100, import-application 97,5, import-infra 96,92 (todos ≥ 80).
