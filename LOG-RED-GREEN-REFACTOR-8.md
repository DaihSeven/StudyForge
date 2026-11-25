# LOG-RED-GREEN-REFACTOR-8 — Groq: JSON final quebrado derrubava a geração inteira

Branch `fix/groq-formato-final`. Saída abaixo é a real do terminal (resumida só nas linhas de resultado).

## Diagnóstico (log temporário local, removido antes da correção, nunca commitado)

Chamada real: texto de ~300 caracteres, 3 questões, escolha única, `AI_PROVIDER=groq`, modelo `openai/gpt-oss-120b`.
Sem chave nem cabeçalhos no log.

```
[GROQ-DEBUG] turno 1: finish_reason=tool_calls, 1 tool_call, completion_tokens=426 (reasoning 255), message_keys=[role,reasoning,tool_calls]
[GROQ-DEBUG] turno 2: finish_reason=tool_calls, 1 tool_call, completion_tokens=318 (reasoning 199)
[GROQ-DEBUG] turno 3: finish_reason=tool_calls, 1 tool_call, completion_tokens=189 (reasoning 65)
[GROQ-DEBUG] turno 4: finish_reason=stop, sem tool_calls, total_tokens=1168, content_len=656
  content_head: {"questions":[{"type":"SINGLE_CHOICE","statement":"O que a fotossíntese converte?","alternatives":[...
  content_tail: ..."text":"Lis\\u00e9mao","isCorrect":false},{"letter":"C","organ":?}]}
```

Causa: NÃO é `length` (finish_reason `stop`, 1168 tokens), nem cerca de código, nem content vazio, nem campos renomeados.
O modelo chamou `validar_questao` 3 vezes (3 questões válidas) e depois **reescreveu o JSON final à mão e o quebrou**
(`"organ":?` e escape duplo). `JSON.parse` falha → `extractQuestions` devolve `null` → `parseFinalAnswer` emite 1 item
"malformed" → o use case o rejeita como `INVALID_GENERATED_FORMAT` e a geração fecha com `draftCount: 0`.

## RED

Fixture sem segredo que imita a resposta capturada (3 tool calls válidas + JSON final quebrado) e um caso de questão
corrigida (a 1ª tentativa inválida, a 2ª válida), com `fetch` falso.

```
$ npx nx test import-infra --skip-nx-cache --output-style=static -- groq-question
 FAIL   import-infra  src/lib/groq/groq-question-draft-generator.adapter.spec.ts
  ● ... › structured output › falls back to the questions already validated by the tool when the final JSON cannot be parsed
    - Expected  - 3
    + Received  + 1
      Array [ -   "Q1", -   "Q2", -   "Q3", +   undefined, ]
  ● ... › structured output › keeps the latest valid version of a corrected question and ignores invalid attempts in the fallback
    - "Q1 corrigida"   + undefined
Tests:       2 failed, 41 passed, 43 total
```

## GREEN

Menor correção: `ValidarQuestaoTool` guarda a última versão válida de cada questão (`validatedQuestions()`); quando o
JSON final não faz parse e há questões validadas, `parseFinalAnswer` as usa. Sem nenhuma questão validada, o
comportamento anterior (1 item "malformed") continua. A validação Zod do use case não mudou.

```
$ npx nx test import-infra --skip-nx-cache --output-style=static -- groq-question
Tests:       43 passed, 43 total
```

## REFACTOR

Nenhum além do comentário do método `parseFinalAnswer`.

## Verificação

```
$ npx nx affected -t lint typecheck test --base=origin/main
Tests: 112 passed / 26 passed / 57 passed (3 projetos)
lint: 0 errors (avisos `any`/imports não usados já existentes)
 NX   Successfully ran targets lint, typecheck, test for 3 projects and 1 task they depend on
```

Chamada real final (API reiniciada com a correção, 3 questões, mesmo corpo): `draftCount: 3`, `rejectedCount: 0`,
primeiro evento em ~4,6 s, total ~4,8 s, `usage` do `done`: mentor 9 / global 39. Obs.: nesta execução o modelo pode ter
devolvido JSON íntegro, então a chamada confirma ausência de regressão; o caminho de reserva é provado pelos testes.

## Perguntas em aberto

1. Cobrança de cota: não mudei quando a cota é devolvida. Hoje essa geração (quando falhava) contava no limite e não era
   devolvida; com a correção, passa a entregar drafts. A regra de devolução segue igual.
2. Quando o JSON final faz parse mas traz MENOS questões que as validadas pela tool, hoje vale o JSON final. Quer que
   a tool seja sempre a fonte de verdade?
