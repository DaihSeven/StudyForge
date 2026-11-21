# LOG-RED-GREEN-REFACTOR-7 — Semana 11, PR 3: tela do mentor que consome o endpoint SSE

Escopo: ADR-010 (PR 3 de 3), branch `feat/web-gerar-rascunhos`. Cada peça segue chore (stub que **lança erro**) → test (RED) → feat (GREEN) → refactor. A saída abaixo é a real do terminal, filtrada (títulos de teste, mensagens e totais; *stack frames* e *code frames* omitidos). Rodadas com `--skip-nx-cache --output-style=static`. Testes sempre sem rede: `fetch` falso com stream de fixture (`apps/web/specs/helpers/fake-fetch.ts`).

Observação sobre o "N suites passed" no RED: as suítes que já existiam (e as de ciclos anteriores) continuam passando; só a suíte nova falha.

## Peça 1 — schemas e `parseGenerationEvent` (`shared/contracts`)

Só forma dos eventos `draft`, `rejected`, `done`, `error`. O stub declara os schemas e `parseGenerationEvent` lança.

### RED

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test shared-contracts --skip-nx-cache --output-style=static
FAIL shared-contracts src/lib/generation-events.spec.ts
  ● parseGenerationEvent › accepts a draft event
  ● parseGenerationEvent › accepts a rejected event
  ● parseGenerationEvent › accepts a done event with and without notice
  ● parseGenerationEvent › accepts an error event
  ● parseGenerationEvent › returns null for an unknown event name
  ● parseGenerationEvent › returns null when the payload has the wrong shape
Test Suites: 1 failed, 3 passed, 4 total
Tests:       6 failed, 16 passed, 22 total
```

### GREEN

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test shared-contracts --skip-nx-cache --output-style=static
Test Suites: 4 passed, 4 total
Tests:       22 passed, 22 total
```

## Peça 2 — parser SSE puro (`apps/web/src/lib/sse-parser.ts`)

### RED

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test web --skip-nx-cache --output-style=static
FAIL web specs/sse-parser.spec.ts
  ● parseSseBuffer › parses one complete block into event and data
  ● parseSseBuffer › parses several blocks in order
  ● parseSseBuffer › keeps an incomplete block as remainder until it is completed
  ● parseSseBuffer › handles CRLF line endings
  ● parseSseBuffer › joins multiple data lines with a newline
  ● parseSseBuffer › defaults the event name to "message"
  ● parseSseBuffer › accepts "data:" with and without the space after the colon
  ● parseSseBuffer › ignores comments, id, retry and unknown fields
  ● parseSseBuffer › skips blocks without data
  ● parseSseBuffer › returns nothing for an empty buffer
Test Suites: 1 failed, 3 passed, 4 total
Tests:       10 failed, 4 passed, 14 total
```

### GREEN

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test web --skip-nx-cache --output-style=static
Test Suites: 4 passed, 4 total
Tests:       14 passed, 14 total
```

## Peça 3 — cliente do stream: POST + `ReadableStream` + validação Zod (`generate-drafts-client.ts`)

Cobre 429 com a mensagem do servidor, falha de rede, stream interrompido, evento inválido ignorado e abort.

### RED

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test web --skip-nx-cache --output-style=static
FAIL web specs/generate-drafts-client.spec.ts
  ● streamGeneration › POSTs the request as JSON to the generate endpoint
  ● streamGeneration › emits draft, rejected and done events in order
  ● streamGeneration › reassembles an event split across chunks
  ● streamGeneration › flushes a last block that has no trailing blank line
  ● streamGeneration › ignores events with invalid JSON, unknown names or the wrong shape
  ● streamGeneration › forwards an error event from the stream and does not add another one
  ● streamGeneration › turns an HTTP error with the server body into an error event with the server message
  ● streamGeneration › uses a generic message when the HTTP error body is not the expected JSON
  ● streamGeneration › reports a network failure without claiming whether the attempt counted
  ● streamGeneration › reports an interruption when the stream ends without done or error
  ● streamGeneration › reports an interruption when a 200 response has no body
  ● streamGeneration › emits nothing when the request is aborted
Test Suites: 1 failed, 4 passed, 5 total
Tests:       12 failed, 14 passed, 26 total
```

### GREEN

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test web --skip-nx-cache --output-style=static
Test Suites: 5 passed, 5 total
Tests:       26 passed, 26 total
```

## Peça 4 — estado da geração (`generation-state.ts`)

Garante que `usage` só existe depois do evento `done` (nenhum número inventado antes).

### RED

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test web --skip-nx-cache --output-style=static
FAIL web specs/generation-state.spec.ts
  ● generationReducer › starts streaming with the requested quantity and clears the previous run
  ● generationReducer › appends drafts in arrival order
  ● generationReducer › collects rejected items without turning them into drafts
  ● generationReducer › has no usage numbers until the done event
  ● generationReducer › keeps the notice sent with done
  ● generationReducer › keeps the drafts already received when an error arrives, and shows no usage
Test Suites: 1 failed, 5 passed, 6 total
Tests:       6 failed, 26 passed, 32 total
```

### GREEN

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test web --skip-nx-cache --output-style=static
Test Suites: 6 passed, 6 total
Tests:       32 passed, 32 total
```

## Peça 5 — opções de "Tipo de questão" derivadas do domínio (`shared/contracts`)

`QUESTION_TYPE_CHOICES` espelha `QUESTION_TYPE_RULES` (4 alternativas/1 correta e 5/2) sem repetir os números e sem o `web` importar o domínio. Stub: lista vazia.

### RED

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test shared-contracts --skip-nx-cache --output-style=static
FAIL shared-contracts src/lib/question-type-choices.spec.ts
  ● QUESTION_TYPE_CHOICES › has one choice per question type, in the order of the domain rules
    - Expected  - 4
    + Received  + 1
  ● QUESTION_TYPE_CHOICES › mirrors the domain: SINGLE_CHOICE 4 alternatives / 1 correct, MULTIPLE_CHOICE 5 / 2
    Expected: {"alternativesPerQuestion": 4, "correctCount": 1, "type": "SINGLE_CHOICE"}
    Received: undefined
Test Suites: 1 failed, 4 passed, 5 total
Tests:       2 failed, 22 passed, 24 total
```

### GREEN

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test shared-contracts --skip-nx-cache --output-style=static
Test Suites: 5 passed, 5 total
Tests:       24 passed, 24 total
```

## Peça 6 — componente `GenerateDraftsScreen` e `AppHeader`

Stubs lançam erro. Os testes cobrem: campos e rótulos ("Tipo de questão", não "Alternativas por questão"), abas (Importar arquivo desabilitada, Marco 3.3), contador de caracteres e bloqueio acima de 8.000, aviso LGPD abaixo do botão, pílula "Gerando: n de N prontas" (stream controlado pelo teste), "CORRETA" como texto, lista de itens descartados, contador de gerações só após `done`, mensagens de 429 e de evento `error` na região `aria-live="polite"`, botões Editar/Descartar/Revisar e publicar desabilitados com texto do Marco 3.5, abort ao desmontar.

### RED

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test web --skip-nx-cache --output-style=static
FAIL web specs/generate-drafts-screen.spec.tsx
  ● GenerateDraftsScreen — formulário › shows the page title, the intro and the two column headings
  ● GenerateDraftsScreen — formulário › offers "Tipo de questão" with the real rules: 4 alternatives/1 correct and 5 alternatives/2 correct
  ● GenerateDraftsScreen — formulário › offers the quantities 3, 5 and 10, with 5 selected by default
  ● GenerateDraftsScreen — formulário › shows "Gerar com IA" as the active tab and "Importar arquivo" disabled, saying it arrives in Marco 3.3
  ● GenerateDraftsScreen — formulário › always shows the LGPD notice below the generate button
  ● GenerateDraftsScreen — formulário › counts characters and blocks text above the limit, without calling the API
  ● GenerateDraftsScreen — formulário › asks for text instead of calling the API when the text is blank
  ● GenerateDraftsScreen — formulário › disables generation and explains when the temporary demo ids are not configured
  ● GenerateDraftsScreen — formulário › has a polite live region for progress and errors
  ● GenerateDraftsScreen — geração › sends the chosen type, quantity and the demo ids
  ● GenerateDraftsScreen — geração › shows "Gerando: n de N prontas" while streaming, one card per draft, and no usage number yet
  ● GenerateDraftsScreen — geração › marks the correct alternative with the text CORRETA (once for single choice, twice for multiple choice)
  ● GenerateDraftsScreen — geração › lists rejected items under "Itens descartados pela validação" with the reason
  ● GenerateDraftsScreen — geração › does not show the rejected list when nothing was rejected
  ● GenerateDraftsScreen — geração › uses the singular when one generation is left, and shows the notice sent with done
  ● GenerateDraftsScreen — geração › shows the server message of a 429, including whether the attempt counted, in the live region
  ● GenerateDraftsScreen — geração › shows the message of an error event and keeps the drafts already received
  ● GenerateDraftsScreen — geração › renders Editar, Descartar and Revisar e publicar disabled, saying they arrive in Marco 3.5
  ● GenerateDraftsScreen — geração › aborts the request when the screen unmounts
FAIL web specs/app-header.spec.tsx
  ● AppHeader › shows the logo and the mentor placeholder with the MENTOR chip
  ● AppHeader › marks Rascunhos as the current page
  ● AppHeader › shows Simulados and Resultados as not available yet, without fake links
Test Suites: 2 failed, 6 passed, 8 total
Tests:       22 failed, 32 passed, 54 total
```

### GREEN (primeira rodada)

A tela e o cabeçalho passaram. Falharam só os dois testes do `layout.spec.tsx` **antigo** (herdado do Nx: `lang="en"` e título "Welcome to web"). O layout mudou de propósito (`lang="pt-BR"`, título "StudyForge", variáveis de fonte), então o spec foi atualizado para o novo comportamento e foi criado o spec da página `/rascunhos/novo`. Aqui o spec foi ajustado **depois** da implementação, não antes.

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test web --skip-nx-cache --output-style=static
FAIL web specs/layout.spec.tsx
  ● RootLayout › wraps the children in an html/body shell with lang="en"
    Expected: "<html lang=\"en\"><head></head><body><main>conteúdo</main></body></html>"
    Received: "<html lang=\"pt-BR\" class=\"variable variable variable\"><head></head><body><main>conteúdo</main></body></html>"
  ● RootLayout › exposes the page metadata
    Expected: "Welcome to web"
    Received: "StudyForge"
Test Suites: 1 failed, 7 passed, 8 total
Tests:       2 failed, 52 passed, 54 total
```

### GREEN (specs de layout e página atualizados, com cobertura)

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test web --skip-nx-cache --output-style=static --coverage --coverageReporters=text
-----------------------------|---------|----------|---------|---------|-------------------
File                         | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------------------|---------|----------|---------|---------|-------------------
All files                    |   96.53 |    90.69 |     100 |   96.83 |
 app                         |     100 |      100 |     100 |     100 |
  fonts.ts                   |     100 |      100 |     100 |     100 |
  layout.tsx                 |     100 |      100 |     100 |     100 |
  page.tsx                   |     100 |      100 |     100 |     100 |
 app/api/hello               |     100 |      100 |     100 |     100 |
  route.ts                   |     100 |      100 |     100 |     100 |
 app/rascunhos/novo          |     100 |      100 |     100 |     100 |
  page.tsx                   |     100 |      100 |     100 |     100 |
 components                  |   96.96 |    90.47 |     100 |    98.3 |
  app-header.tsx             |     100 |      100 |     100 |     100 |
  draft-card.tsx             |     100 |      100 |     100 |     100 |
  generate-drafts-screen.tsx |   96.36 |    89.74 |     100 |   97.95 | 62
 lib                         |   95.34 |       90 |     100 |   95.18 |
  generate-drafts-client.ts  |   93.22 |     87.5 |     100 |   92.98 | 73-77
  generation-state.ts        |     100 |      100 |     100 |     100 |
  sse-parser.ts              |     100 |     87.5 |     100 |     100 | 21
-----------------------------|---------|----------|---------|---------|-------------------
Test Suites: 9 passed, 9 total
Tests:       57 passed, 57 total
```

## Refactor — `parseSseBuffer`

`event:` e `data:` eram lidos com tratamentos diferentes do espaço após os dois-pontos. Passaram a usar um único helper (`fieldValue`). Comportamento igual, testes iguais.

```
$ FORCE_COLOR=0 NO_COLOR=1 npx nx test web --skip-nx-cache --output-style=static
Test Suites: 9 passed, 9 total
Tests:       57 passed, 57 total
```

## Verificação antes do push (uma vez)

```
$ npx nx affected -t lint typecheck test --base=origin/main --output-style=static
 NX   Running targets lint, typecheck, test for 11 projects and 1 task they depend on:
Test Suites: 2 passed, 2 total
Tests:       6 passed, 6 total
Test Suites: 4 passed, 4 total
Tests:       26 passed, 26 total
Test Suites: 5 passed, 5 total
Tests:       24 passed, 24 total
Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Test Suites: 4 passed, 4 total
Tests:       44 passed, 44 total
Test Suites: 1 passed, 1 total
Tests:       23 passed, 23 total
Test Suites: 2 passed, 2 total
Tests:       34 passed, 34 total
✖ 5 problems (0 errors, 5 warnings)
Test Suites: 10 passed, 10 total
Tests:       110 passed, 110 total
Test Suites: 5 passed, 5 total
Tests:       26 passed, 26 total
✖ 2 problems (0 errors, 2 warnings)
Test Suites: 9 passed, 9 total
Tests:       57 passed, 57 total
 NX   Successfully ran targets lint, typecheck, test for 11 projects and 1 task they depend on
```

Os 7 avisos de lint (`any`, imports não usados) são de `api` e `import-*`, anteriores a este PR. Nenhum é do `web` nem do `contracts`.

### `nx build web` — o primeiro build falhou (Turbopack)

O Next só acusa este erro no build, não nos testes:

```
$ npx nx build web --skip-nx-cache --output-style=static
> next build
▲ Next.js 16.4.5 (Turbopack)
Error: Turbopack build failed with 13 errors:
./libs/shared/domain/src/lib/result.ts
Error: Specified module format (CommonJs) is not matching the module format of the source code (EcmaScript Modules)
 NX   Running target build for project web and 2 tasks it depends on failed
```

Causa: os `package.json` das libs (`libs/shared/domain`, `libs/shared/contracts`) declaram `"type": "commonjs"` e o Turbopack não aceita sintaxe ESM nesse caso. Mudar as libs estava fora do escopo; o webpack compila as mesmas libs. Correção: `apps/web/project.json` passa `--webpack` para os alvos `build` e `dev`. Um segundo aviso (`Failed to find font override values for font Bitcount Single`) foi resolvido com `adjustFontFallback: false` na fonte.

```
$ npx nx build web --skip-nx-cache --output-style=static
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/hello
└ ○ /rascunhos/novo
 NX   Successfully ran target build for project web and 2 tasks it depends on
```

Os `rewrites` foram para o manifesto do build: `/api/draft-questions/:path*` → `http://localhost:3333/api/draft-questions/:path*`.
