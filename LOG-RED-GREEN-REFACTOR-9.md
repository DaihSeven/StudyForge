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

## Pergunta em aberto

A mensagem antiga de falha de rede avisava "não foi possível confirmar se a tentativa contou no limite diário". A nova,
pedida para o caso "API indisponível", não diz isso. Se a conexão cair depois de a API já ter debitado a cota, o mentor
não é avisado. Vale decidir se a mensagem de rede deve manter esse aviso.
