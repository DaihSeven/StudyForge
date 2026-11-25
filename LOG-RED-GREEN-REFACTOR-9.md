# LOG-RED-GREEN-REFACTOR-9 — "API indisponível" em vez de "HTTP 500" (web)

Branch `docs/fechamento-semana-11`. Escopo: `apps/web/src/lib/generate-drafts-client.ts`. Quando o proxy do Next não alcança
a API, ele responde 5xx com corpo de texto simples ("Internal Server Error"), e a tela mostrava "HTTP 500". Agora mostra
"API indisponível. Tente de novo em instantes." Erros JSON da API (429, 502 e evento `error`) continuam com a mensagem do servidor.
Saída abaixo é a real do terminal, filtrada para as linhas de resultado.

Testes alterados em `apps/web/specs/generate-drafts-client.spec.ts`:
- 5xx com corpo de texto simples vira `API_UNAVAILABLE`;
- falha de rede vira `API_UNAVAILABLE`;
- 4xx não JSON continua `HTTP_<status>` (404);
- 502 com o JSON da API continua mostrando a mensagem do servidor.

## RED

```
$ npx nx test web --skip-nx-cache --output-style=static -- generate-drafts-client   # RED
  ● streamGeneration › says the API is unavailable on a network failure
  ● streamGeneration › says the API is unavailable when a 5xx has a plain-text body (the Next proxy could not reach the API)
Test Suites: 1 failed, 1 total
Tests:       2 failed, 12 passed, 14 total
```

Os dois testes novos falham porque o código antigo devolvia `HTTP_500` e `NETWORK_ERROR`.

## GREEN

Menor mudança: constante `API_UNAVAILABLE_MESSAGE`; falha de rede e 5xx sem JSON da API chamam `fail('API_UNAVAILABLE', ...)`.

```
$ npx nx test web --skip-nx-cache --output-style=static -- generate-drafts-client   # GREEN
Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
```

## REFACTOR

Nenhum além de remover a mensagem antiga de rede (que dizia não ser possível confirmar se a tentativa contou).

## Ciclo 2 — separar "API indisponível" de "conexão caiu durante a geração"

A mensagem única do ciclo 1 perdia o aviso de cota. Agora há dois casos:
- (a) falha **antes de qualquer evento** (proxy sem alcançar a API, ECONNREFUSED, 5xx com corpo de texto, stream que falha ou termina vazio, resposta 200 sem corpo): `API_UNAVAILABLE`, "API indisponível. Tente de novo em instantes.", sem falar de cota;
- (b) conexão cortada **depois de ao menos um evento** e sem `done`/`error`: `STREAM_INTERRUPTED`, "A conexão caiu durante a geração. Não foi possível confirmar se a tentativa contou no limite diário."

Helper de teste: `streamResponse(chunks, failure?)` agora aceita um erro lançado depois do último pedaço (conexão cortada no meio).

### RED

```
$ npx nx test web --skip-nx-cache --output-style=static -- generate-drafts-client   # RED
  ● streamGeneration › says the API is unavailable when a 200 response has no body
  ● streamGeneration › says the API is unavailable when the stream ends empty, before any event
  ● streamGeneration › says the API is unavailable when the stream fails before any event
  ● streamGeneration › says the connection dropped when the read fails after an event
  ● streamGeneration › says the connection dropped when the stream ends after an event without done or error
Test Suites: 1 failed, 1 total
Tests:       5 failed, 12 passed, 17 total
```

### GREEN

O cliente conta os eventos recebidos (`received`); ao detectar a interrupção, `received === 0` vira `API_UNAVAILABLE` e `received > 0` vira `STREAM_INTERRUPTED` com a mensagem nova. A mensagem antiga (`INTERRUPTED_MESSAGE`) foi removida.

```
$ npx nx test web --skip-nx-cache --output-style=static -- generate-drafts-client   # GREEN
Test Suites: 1 passed, 1 total
Tests:       17 passed, 17 total
```

### REFACTOR

Nenhum além do helper local `interrupted()` que concentra a decisão.
