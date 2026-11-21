# LOG-RED-GREEN-REFACTOR-6 — Semana 11, PR 2: provedor real, system prompt, tool calling, structured output e endpoint SSE

Escopo: ADR-010 (PR 2 de 3). Cada peça segue chore (stub que **lança erro**) → test (RED) → feat (GREEN) → refactor. A saída abaixo é a real do terminal, filtrada (títulos de teste, mensagens e totais; *stack frames* e *code frames* omitidos). Rodadas com `--skip-nx-cache --output-style=static`. Testes sempre sem rede (fetch falso).

## Peça 1 — schema de entrada do endpoint (`shared/contracts`)

Só formato: texto até `maxInputChars`, quantity inteiro 1–10, nº de alternativas derivado dos tipos existentes. Sem regra de domínio. O primeiro RED não rodou nenhum teste (o stub lançava ao ser chamado na coleta da suíte e o spec entrou junto no commit do stub); o stub passou a lançar só ao validar e os commits foram refeitos.

### RED

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test shared-contracts
FAIL shared-contracts src/lib/generate-draft-questions.request.spec.ts
  ● createGenerateDraftQuestionsRequestSchema › accepts a well-formed request (4 and 5 alternatives)
    createGenerateDraftQuestionsRequestSchema ainda não implementado.
    > 16 |     throw new Error('createGenerateDraftQuestionsRequestSchema ainda não implementado.');
  ● createGenerateDraftQuestionsRequestSchema › accepts text of exactly maxInputChars and rejects one more
  ● createGenerateDraftQuestionsRequestSchema › rejects blank text
  ● createGenerateDraftQuestionsRequestSchema › accepts quantity 1 and MAX_GENERATION_QUANTITY, rejects 0, 11 and non-integers
  ● createGenerateDraftQuestionsRequestSchema › rejects an alternatives count that no question type has (e.g. 3 and 6)
  ● createGenerateDraftQuestionsRequestSchema › rejects missing organizationId or mentorId
Test Suites: 1 failed, 2 passed, 3 total
Tests:       6 failed, 10 passed, 16 total
```

### GREEN

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test shared-contracts
Test Suites: 3 passed, 3 total
Tests:       16 passed, 16 total
```

## Peça 2 — use case: eventos por item, uso restante, aviso de cota e quantity ≤ 10 (`import-application`)

Mudanças no PR 1: o port `AiUsageLimiter` ganha `remaining()`; `execute()` aceita um `GenerationListener` opcional (chamado por item, permite o SSE) e devolve `usage` e `notice` (decisão 4: tentativa com todos os itens rejeitados não devolve a cota e o aviso explica isso). Stub: tipos e assinatura novos, com `usage` preenchido por um valor inválido; o RED falha por comportamento (asserções), não por tipo.

### RED

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test import-application
FAIL import-application src/lib/use-cases/generate-draft-questions.use-case.spec.ts (5.443 s)
  ● GenerateDraftQuestionsUseCase › returns the remaining usage after charging this generation
    Expected: {"global": 98, "mentor": 8}
    Received: undefined
  ● GenerateDraftQuestionsUseCase › accepts quantity 10 and rejects 11 with INVALID_QUANTITY, without consuming the limiter
    Expected: true
    Received: false
  ● GenerateDraftQuestionsUseCase › notifies the listener of each draft and rejection, in order, as they are processed
    - Expected  - 5
    + Received  + 1
  ● GenerateDraftQuestionsUseCase › adds a notice that the attempt counted when every item was rejected, and does not refund the quota
    Received has value: undefined
Test Suites: 1 failed, 1 passed, 2 total
Tests:       4 failed, 26 passed, 30 total
```

### GREEN

A primeira rodada falhou por erro do teste (o id é gerado antes da validação, então o terceiro item recebe `fake-uuid-3`); corrigida a expectativa.

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test import-application
Test Suites: 2 passed, 2 total
Tests:       30 passed, 30 total
```

## Peça 3 — `SaoPauloClockAdapter` e `remaining()` do limiter (`import-infra`)

Decisão 2: o dia vira à meia-noite de `America/Sao_Paulo`, dentro do adaptador do `Clock` (o contador local é proteção aproximada; os provedores resetam em horários próprios). O stub de `remaining()` já lançava erro desde a peça 2.

### RED

(Na primeira tentativa o diretório do relógio foi criado no lugar errado e só a parte do limiter rodou; os commits foram refeitos.)

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test import-infra
FAIL import-infra src/lib/ai-usage-limiter/in-memory-ai-usage-limiter.adapter.spec.ts
  ● InMemoryAiUsageLimiterAdapter › remaining › starts at the limits and decreases by one per consumption (mentor and global)
    InMemoryAiUsageLimiterAdapter.remaining ainda não implementado.
    > 60 |     throw new Error('InMemoryAiUsageLimiterAdapter.remaining ainda não implementado.');
  ● InMemoryAiUsageLimiterAdapter › remaining › never goes below zero and does not change when a consumption is refused
  ● InMemoryAiUsageLimiterAdapter › remaining › reflects the reset when the day changes
FAIL import-infra src/lib/clock/sao-paulo-clock.adapter.spec.ts
  ● SaoPauloClockAdapter › returns the São Paulo calendar day as YYYY-MM-DD
    SaoPauloClockAdapter ainda não implementado.
    >  8 |     throw new Error('SaoPauloClockAdapter ainda não implementado.');
  ● SaoPauloClockAdapter › still reports the previous day one second before São Paulo midnight (UTC-3)
  ● SaoPauloClockAdapter › turns the day exactly at São Paulo midnight, not at UTC midnight
  ● SaoPauloClockAdapter › uses the real clock by default
Test Suites: 2 failed, 4 passed, 6 total
Tests:       7 failed, 23 passed, 30 total
```

### GREEN

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test import-infra
Test Suites: 6 passed, 6 total
Tests:       30 passed, 30 total
```

## Peça 4 — configuração de IA (`import-infra`)

`loadAiConfig(env)` valida com Zod: `AI_PROVIDER` (mock | groq | google; padrão mock), `AI_MODEL`, chaves por provedor, `AI_MAX_INPUT_CHARS` (8000), `AI_DAILY_LIMIT_PER_MENTOR` (10), `AI_DAILY_LIMIT_GLOBAL`. Sem a chave do provedor escolhido: erro claro, sem cair em outro provedor. Mensagens de erro e `describeAiConfig` nunca contêm a chave.

### RED

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test import-infra
FAIL import-infra src/lib/ai-config/ai-config.spec.ts
  ● loadAiConfig › defaults to the mock provider with 8000 chars, 10 per mentor and no key needed
    loadAiConfig ainda não implementado.
    > 24 |   throw new Error('loadAiConfig ainda não implementado.');
  ● loadAiConfig › treats empty strings as unset
  ● loadAiConfig › reads groq with its key and an optional model override
  ● loadAiConfig › reads google with its own key variable
  ● loadAiConfig › fails on startup when the chosen provider has no key, naming the variable
    Expected constructor: AiConfigError
    Received constructor: Error
    Received message: "loadAiConfig ainda não implementado."
        > 24 |   throw new Error('loadAiConfig ainda não implementado.');
  ● loadAiConfig › never falls back silently: the other provider key does not satisfy the chosen one
    Expected pattern: /GROQ_API_KEY/
  ● loadAiConfig › rejects an unknown provider
    Expected pattern: /AI_PROVIDER/
  ● loadAiConfig › rejects AI_MAX_INPUT_CHARS=0 naming the variable
    Expected pattern: /AI_MAX_INPUT_CHARS/
  ● loadAiConfig › rejects AI_MAX_INPUT_CHARS=abc naming the variable
  ● loadAiConfig › rejects AI_DAILY_LIMIT_PER_MENTOR=-1 naming the variable
    Expected pattern: /AI_DAILY_LIMIT_PER_MENTOR/
  ● loadAiConfig › rejects AI_DAILY_LIMIT_PER_MENTOR=1.5 naming the variable
  ● loadAiConfig › rejects AI_DAILY_LIMIT_GLOBAL=0 naming the variable
    Expected pattern: /AI_DAILY_LIMIT_GLOBAL/
  ● loadAiConfig › reads numeric limits from the environment
  ● loadAiConfig › never puts the key in an error message
  ● describeAiConfig › summarizes the config without the key
Test Suites: 1 failed, 6 passed, 7 total
Tests:       15 failed, 30 passed, 45 total
```

### GREEN

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test import-infra
Test Suites: 7 passed, 7 total
Tests:       45 passed, 45 total
```

## Peça 5 — system prompt (`import-infra`, `groq/system-prompt.ts`)

Arquivo próprio e testável: papel, regras (só o texto fornecido, 1 correta em `SINGLE_CHOICE` e 2 em `MULTIPLE_CHOICE` **derivadas de `QUESTION_TYPE_RULES`**, sem inventar fatos), texto do mentor tratado como DADO (delimitado por `<material>`; o `</material>` dentro do texto é neutralizado) e formato de saída.

### RED

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test import-infra
FAIL import-infra src/lib/groq/system-prompt.spec.ts
  ● Test suite failed to run
    buildSystemPrompt ainda não implementado.
    > 11 |   throw new Error('buildSystemPrompt ainda não implementado.');
Test Suites: 1 failed, 7 passed, 8 total
Tests:       45 passed, 45 total
```
(O primeiro RED não rodou testes: o stub lançava na coleta da suíte; a construção dos prompts foi movida para `beforeAll` e o commit refeito.)

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test import-infra
FAIL import-infra src/lib/groq/system-prompt.spec.ts
  ● buildSystemPrompt › states the role: study questions from the mentor text, in Brazilian Portuguese
    buildSystemPrompt ainda não implementado.
    > 11 |   throw new Error('buildSystemPrompt ainda não implementado.');
  ● buildSystemPrompt › asks for exactly the requested quantity
  ● buildSystemPrompt › derives the type rules from the domain: SINGLE_CHOICE = A–D with 1 correct
  ● buildSystemPrompt › derives the type rules from the domain: MULTIPLE_CHOICE = A–E with 2 correct
  ● buildSystemPrompt › only describes the type that was requested
  ● buildSystemPrompt › forbids using anything beyond the provided text and inventing facts
  ● buildSystemPrompt › treats the mentor text as data and ignores requests inside it to change the rules
  ● buildSystemPrompt › describes the tool and the JSON output format
  ● buildSystemPrompt › throws for an alternatives count no question type has
  ● buildUserMessage › wraps the text between the material delimiters
    buildUserMessage ainda não implementado.
    > 16 |   throw new Error('buildUserMessage ainda não implementado.');
  ● buildUserMessage › does not let the text close the delimiter early (prompt injection through the tag)
Test Suites: 1 failed, 7 passed, 8 total
Tests:       11 failed, 45 passed, 56 total
```

### GREEN

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test import-infra
FAIL import-infra src/lib/groq/system-prompt.spec.ts
  ● buildSystemPrompt › forbids using anything beyond the provided text and inventing facts
    Expected substring: "não invente"
    Received string:    "Você gera questões de estudo a partir do texto de um mentor, em português do Brasil.·
Test Suites: 1 failed, 7 passed, 8 total
Tests:       1 failed, 55 passed, 56 total
```
(A primeira rodada falhou em 1 teste: o prompt dizia "Não invente" com maiúscula e o teste procura "não invente"; o texto do prompt foi ajustado, nova rodada abaixo.)

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test import-infra
Test Suites: 8 passed, 8 total
Tests:       56 passed, 56 total
```

## Peça 6 — adapter Groq (`import-infra`, `groq/`)

Decisões de desenho, a partir da documentação oficial da Groq lida antes de implementar:

- Endpoint `POST https://api.groq.com/openai/v1/chat/completions`, `Authorization: Bearer`, `fetch` nativo (sem dependência nova).
- **Structured outputs (`response_format: json_schema`) não funcionam junto com tool use** ("Streaming and tool use are not currently supported with Structured Outputs"). Por isso a requisição leva `tools` e **não** leva `response_format`: o JSON da resposta final é pedido no system prompt e validado localmente com o schema Zod do PR 1 (pelo use case).
- `parallel_tool_calls: false`: a tabela do modelo diz "Parallel Tool Use: No", embora a referência geral dê `true` por padrão.
- A requisição ao provedor é **sem `stream`**: o formato dos chunks SSE (`delta.tool_calls`) não foi confirmado na documentação lida, e o ciclo de tool calling precisa da mensagem completa. O streaming para o mentor continua existindo no endpoint (um evento por rascunho).
- `validar_questao` = `GeneratedDraftQuestionSchema` + `validateDraftQuestionStructure` (função pura do PR 1), executada localmente. A tool recebe `question_number` para contar **no máximo 2 rodadas de correção por questão**; na terceira falha o resultado diz `correctionLimitReached` e o item segue como está (o use case o põe em `rejected`).
- JSON malformado ou sem `questions` vira **um item que falha o schema** (vira `rejected`, não derruba a geração). Erros do provedor viram `AiProviderError` com mensagem segura (sem chave, sem corpo).

### RED

```
$ npx nx test import-infra
FAIL import-infra src/lib/groq/groq-question-draft-generator.adapter.spec.ts
  ● GroqQuestionDraftGeneratorAdapter › request › posts to the Groq endpoint with the bearer key, the default model, no streaming and no structured-output mode
    GroqQuestionDraftGeneratorAdapter ainda não implementado.
    > 25 |     throw new Error('GroqQuestionDraftGeneratorAdapter ainda não implementado.');
  ● GroqQuestionDraftGeneratorAdapter › request › lets AI_MODEL override the default model
  ● GroqQuestionDraftGeneratorAdapter › request › exposes validar_questao as the only tool
  ● GroqQuestionDraftGeneratorAdapter › request › sends the mentor text only as delimited user data, never inside the system prompt
  ● GroqQuestionDraftGeneratorAdapter › request › builds the system prompt for the requested quantity and type
  ● GroqQuestionDraftGeneratorAdapter › structured output › yields the questions of the final JSON answer, in order
  ● GroqQuestionDraftGeneratorAdapter › structured output › accepts the JSON wrapped in a code fence
  ● GroqQuestionDraftGeneratorAdapter › structured output › turns malformed JSON into one item that fails the schema, without throwing
  ● GroqQuestionDraftGeneratorAdapter › structured output › turns an answer without a questions array ("{\"questions\": \"nope\"}") into one item that fails the schema
  ● GroqQuestionDraftGeneratorAdapter › structured output › turns an answer without a questions array ("{\"outra\": 1}") into one item that fails the schema
  ● GroqQuestionDraftGeneratorAdapter › structured output › turns an answer without a questions array ("[1,2]") into one item that fails the schema
  [...]
Test Suites: 1 failed, 8 passed, 9 total
Tests:       29 failed, 56 passed, 85 total
```

### GREEN

```
$ npx nx test import-infra
Test Suites: 9 passed, 9 total
Tests:       85 passed, 85 total
```

## Peça 7 — fábrica do gerador por provedor e fiação do módulo (`import-infra`)

`createQuestionDraftGenerator(config)` escolhe o adaptador (mock | groq); `google` falha com erro claro (adaptador fora deste PR, sem cair em outro provedor). `AiModule` liga `CLOCK_TOKEN` (São Paulo), `AI_USAGE_LIMITER_TOKEN` (em memória, uma instância compartilhada) e `QUESTION_DRAFT_GENERATOR_TOKEN`, lendo `process.env` na subida: sem chave, o módulo não sobe.

### RED

```
$ npx nx test import-infra
FAIL import-infra src/lib/ai/create-question-draft-generator.spec.ts
  ● createQuestionDraftGenerator › builds the mock adapter by default
    createQuestionDraftGenerator ainda não implementado.
    > 12 |   throw new Error('createQuestionDraftGenerator ainda não implementado.');
  ● createQuestionDraftGenerator › builds the Groq adapter with the configured key and model
  ● createQuestionDraftGenerator › fails clearly for google, whose adapter does not exist yet, instead of falling back to another provider
    Expected constructor: AiConfigError
    Received constructor: Error
    Received message: "createQuestionDraftGenerator ainda não implementado."
        > 12 |   throw new Error('createQuestionDraftGenerator ainda não implementado.');
FAIL import-infra src/lib/infra.module.spec.ts
  ● ImportInfraModule › wires GenerateDraftQuestionsUseCase with mock, in-memory limiter and São Paulo clock by default
  [...]
Test Suites: 2 failed, 8 passed, 10 total
Tests:       6 failed, 85 passed, 91 total
```

### GREEN

```
$ npx nx test import-infra
FAIL import-infra src/lib/infra.module.spec.ts
  ● ImportInfraModule › resolves CreateDraftQuestionUseCase with its ports wired
  ● ImportInfraModule › wires GenerateDraftQuestionsUseCase with mock, in-memory limiter and São Paulo clock by default
  ● ImportInfraModule › shares one limiter instance (the counter must live across requests)
  ● ImportInfraModule › fails on startup when AI_PROVIDER=groq has no GROQ_API_KEY
    Expected constructor: AiConfigError
    Received constructor: UnknownExportException
    Received message: "Nest cannot export a provider/module that is not a part of the currently processed module (ImportInfraModule). Please verify whether the exported Symbol(AiConfig) is available in this particular context.·
  [...]
Test Suites: 1 failed, 9 passed, 10 total
Tests:       4 failed, 87 passed, 91 total
```
(Primeira rodada: 4 falhas no módulo, `UnknownExportException` — um módulo só pode exportar providers próprios; o `ImportInfraModule` passou a reexportar o `AiModule`.)

```
$ npx nx test import-infra
Test Suites: 10 passed, 10 total
Tests:       91 passed, 91 total
```

## Peça 8 — endpoint `POST /api/draft-questions/generate` (`apps/api`)

Testes sobem o módulo real do Nest (`DraftQuestionModule` → `ImportInfraModule` → `AiModule`) numa porta efêmera e leem a resposta SSE com `fetch`, sem rede externa; só o Prisma/repositório (e, em alguns casos, o gerador) são substituídos. O controller só valida a entrada com Zod, chama o use case e mapeia a saída para eventos `draft`, `rejected`, `done` e `error`. Erros anteriores ao primeiro evento viram status HTTP (400, 429, 502); depois que o stream começou, viram o evento `error`. `organizationId` e `mentorId` no corpo seguem o padrão do `POST /api/draft-questions` e são **TEMPORÁRIOS até o Marco 3.2 (autenticação)**.

### RED

```
$ npx nx test api
[Nest] 20885  - 11/21/2026, 5:40:31 PM   ERROR [ExceptionsHandler] Error: GenerateDraftQuestionsController ainda não implementado.
[Nest] 20885  - 11/21/2026, 5:40:32 PM   ERROR [ExceptionsHandler] Error: GenerateDraftQuestionsController ainda não implementado.
FAIL api src/modules/draft-question/generate-draft-questions.controller.spec.ts (7.093 s)
  ● POST /api/draft-questions/generate › streams text/event-stream with one draft event per question and a final done event (mock provider)
    Expected: 200
    Received: 500
  ● POST /api/draft-questions/generate › saves the drafts under the request organizationId and never publishes
    Expected length: 2
  [...]
Test Suites: 1 failed, 4 passed, 5 total
Tests:       15 failed, 9 passed, 24 total
```

### GREEN

```
$ npx nx test api
Test Suites: 5 passed, 5 total
Tests:       24 passed, 24 total
```

## Refactor

Nenhuma peça pediu refactor de estrutura: o código nasceu pequeno no GREEN. Único ajuste de forma: dois arquivos ficaram com aspas duplas depois de um `prettier --write` sem configuração (o repositório não tem `.prettierrc`); foram reformatados com aspas simples e largura 120 dentro do commit da peça 7.

## Fechamento

```
$ npx nx run-many -t lint typecheck
 NX   23 tasks: 23 succeeded, 13 cached

$ npm run build
 NX   12 tasks: 12 succeeded, 7 cached

$ npx nx run-many -t test --skip-nx-cache -- --coverage
 NX   Successfully ran target test for 11 projects and 1 task they depend on

$ npm audit --omit=dev --audit-level=high
found 0 vulnerabilities
```

Cobertura (statements / branches): shared-contracts 100 / 100, import-domain 100 / 100, import-application 97,67 / 97,36, import-infra 98,19 / 91,17, api 100 / 94,44 (todos ≥ 80).

Teste manual (`scripts/ai-smoke.mjs`, fora do CI): rodado uma vez com `GROQ_API_KEY` do ambiente; gerou 1 questão `SINGLE_CHOICE` em português com `openai/gpt-oss-120b`. A chave não foi impressa.
