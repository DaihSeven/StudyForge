# ADR-010: IA gratuita e opcional na geração de rascunhos

**Date:** 2026-11-21  
**Status:** Accepted  
**Decision Maker:** Responsável do projeto (aprovação pelo merge deste ADR)  
**Affected By:** ADR-004, `import-application`, `import-infra`, `shared/contracts`, variáveis de ambiente da API, CLAUDE.md seções 2 (regra 7) e 4  

---

## Title

Geração opcional de `DraftQuestion[]` por IA gratuita, atrás do port `QuestionDraftGenerator`, com adaptadores `mock`, `groq` e `google`, chave só no servidor e limite diário de uso por mentor.

---

## Status

**Accepted**: ajusta parcialmente o [ADR-004](adr-004-importacao-por-modelo-estruturado.md), trocando "sem IA paga" por "IA gratuita e opcional". Este ADR é só documentação: nenhum código, dependência, variável de ambiente ou migration é criado por ele. O que não foi decidido está em "Decisões em aberto", sem resposta.

---

## Aprovação

A autora do projeto aprovou, junto com a aceitação deste ADR:

1. CLAUDE.md, seção 4: IA permitida somente como adaptador opcional e gratuito atrás do port `QuestionDraftGenerator`, com `mock` como padrão, CI sem chamada real e sem publicar (regra 7 mantida).
2. CLAUDE.md, seção 5, regra 2: a camada de IA (Semanas 11 a 13 do curso) entra no escopo; a implementação só começa em PR próprio, depois da aceitação deste ADR.
3. README.md: "sem IA paga" trocado por "IA gratuita e opcional (ADR-010)".

---

## Context

O ADR-004 fechou a importação por modelo estruturado (JSON e Markdown, validado com Zod) e rejeitou provedor de IA paga. O mentor que quer gerar questões a partir de um material hoje precisa pedir a uma IA externa que preencha o modelo e depois importar o arquivo. Esse caminho funciona, mas tem atrito. Existem provedores com camada gratuita que permitem oferecer a geração dentro da plataforma, sem custo por token para o projeto.

Restrições que continuam valendo:

- O núcleo de quiz nunca conhece a origem do conteúdo, e `import` nunca depende de `quiz` (CLAUDE.md, seção 1 e seção 2, regra 4).
- Nenhum fluxo automatizado publica conteúdo (CLAUDE.md, seção 2, regra 7). A saída da IA é sempre `DraftQuestion[]` para revisão do mentor.
- Tipos de questão fixos: `SINGLE_CHOICE` (A–D, 1 correta) e `MULTIPLE_CHOICE` (A–E, 2 corretas).

### Limites dos provedores gratuitos (verificados em nov/2026)

| Provedor | Limites verificados | Observações |
|---|---|---|
| **Groq** (free), modelo `gpt-oss-120b` | 30 req/min, 1.000 req/dia, 8.000 tokens/min, 200.000 tokens/dia | Sem cartão. Limites **por organização**, não por usuário ou chave |
| **Google AI Studio** (free) | Sem cartão. Limites só aparecem no painel do projeto | Dados podem ser usados para melhorar produtos do Google |
| **OpenRouter** (modelos `:free`) | 20 req/min e 50 req/dia sem créditos | Fora do escopo |

**Estes números podem mudar a qualquer momento e devem ser reconferidos no console de cada provedor** antes de implementar e antes de qualquer demonstração.

---

## Decision

### 1. Ajuste do ADR-004

"Sem IA paga" passa a **"IA gratuita e opcional"**. O fluxo manual (o mentor gera numa IA externa e importa JSON ou Markdown pelo modelo da plataforma) **continua sendo o caminho principal e está sempre disponível**, com ou sem provedor configurado.

### 2. Port e adaptadores

- Port `QuestionDraftGenerator` em `import-application`, com `InjectionToken` correspondente.
- Adaptadores em `import-infra`: `mock`, `groq` e `google`.
- Seleção por variável de ambiente `AI_PROVIDER`. `AI_MODEL` (opcional) sobrescreve o modelo padrão do adaptador. **Padrão: `mock`.**
- Provedor da demo: **Groq**. Segunda opção: **Google**.
- Fora do escopo: **Anthropic** (pago) e **OpenRouter** (50 req/dia sem créditos).

### 3. Chave só no servidor

- Local: arquivo `.env` fora do git.
- Desenvolvimento: Codespaces Secrets.
- Produção: variáveis secretas do serviço de hospedagem (hospedagem ainda não definida).
- **Nunca no CI e nunca no repositório.** CI e testes usam sempre o `mock`, sem chamada real.

### 4. Quem vê a ação de gerar

O botão ou ação de gerar aparece **só para o papel `MENTOR`** e **só quando há provedor real configurado**. Sem chave, a interface mostra orientação para a importação manual. O aluno nunca vê.

### 5. Limite de uso

- Limite diário **por mentor**: padrão **10 gerações por dia**, configurável em `AI_DAILY_LIMIT_PER_MENTOR`. Com a organização pessoal do [ADR-007](adr-007-organizacao-pessoal-visibilidade-e-moderacao.md), todo usuário é `MENTOR` da própria organização, então este limite por usuário é **obrigatório, não opcional**.
- **Teto global diário** configurável em `AI_DAILY_LIMIT_GLOBAL`.
- Port `AiUsageLimiter`. No curso, o adaptador é **em memória** (sem migration).
- Ao atingir qualquer um dos limites, a mensagem aponta para a importação manual.

### 6. Saída da IA

A saída é **validada com Zod** e convertida em `DraftQuestion`. **Nunca publica** (CLAUDE.md, seção 2, regra 7). A publicação continua sendo o use case explícito `PublishQuiz`, disparado pelo mentor.

### 7. Chave própria do mentor

Fora do escopo do curso. Registrada como **backlog pós-curso**: exigiria criptografia em repouso, model e migration.

---

## Consequences

### Positivos ✅

1. O mentor gera rascunhos sem sair da plataforma e sem custo para o projeto.
2. O fluxo manual do ADR-004 permanece, então a plataforma não depende de nenhum provedor.
3. CI e testes continuam determinísticos e sem rede (`mock` como padrão).
4. Trocar de provedor é trocar `AI_PROVIDER`, sem mexer em `application`.

### Negativos ❌ e riscos

1. **O limite real é de tokens, não de requisições.** Com 200.000 tokens/dia na Groq, 100 mentores dividindo a cota ficam com cerca de **2.000 tokens por mentor por dia**.
2. **Tool calling multiplica as requisições por geração.** Uma geração pode consumir várias chamadas, então **100 mentores × 10 gerações por dia não cabem na cota gratuita**. Por isso existem o teto global e o backlog da chave própria do mentor.
3. Os limites da Groq são por organização: um uso intenso de um mentor afeta todos.
4. O texto do material do mentor sai para um provedor externo. No Google AI Studio gratuito, os dados podem ser usados para melhorar produtos do Google.
5. Contador em memória zera a cada reinício da API e não é compartilhado entre instâncias, então o limite é aproximado.
6. A qualidade do conteúdo gerado não é garantida; só a validade estrutural (Zod) e a revisão do mentor.

### Mitigation

- Teto global diário abaixo da cota real do provedor.
- Mensagem clara apontando para a importação manual ao atingir o limite.
- Reconferir os limites no console antes de implementar e de demonstrar.

---

## Alternatives Considered

### ❌ Alternativa 1: Manter só o fluxo manual (ADR-004 sem ajuste)

**Problemas:** atrito para o mentor, que precisa sair da plataforma e voltar com um arquivo.  
**Por que rejected:** a camada gratuita permite oferecer a geração sem custo, mantendo o fluxo manual como caminho principal.

### ❌ Alternativa 2: Provedor pago (Anthropic)

**Problemas:** custo recorrente por token.  
**Por que rejected:** fora do escopo do projeto.

### ❌ Alternativa 3: OpenRouter com modelos `:free`

**Problemas:** 50 req/dia sem créditos, insuficiente até para a demo.  
**Por que rejected:** limite diário baixo demais.

### ❌ Alternativa 4: Chave do provedor no navegador ou no repositório

**Problemas:** vazamento da chave.  
**Por que rejected:** a chave fica só no servidor (Decisão 3).

### ✅ Alternativa 5: IA gratuita e opcional atrás de port, com `mock` como padrão e limite de uso (ESCOLHIDA)

**Por que aceita:** preserva o fluxo manual, o isolamento de `import` e a regra de não publicar sozinho, com custo zero.

---

## Decisões em aberto

Resolvidas pela autora do projeto na Semana 11 (PR 2) ou ainda em aberto:

1. **Onde guardar o contador de uso — RESOLVIDA:** em memória no curso (adaptador `InMemoryAiUsageLimiterAdapter`). A tabela fica para o backlog pós-curso, junto com a chave própria do mentor. Continua valendo a consequência já listada: o contador zera a cada reinício e não é compartilhado entre instâncias.
2. **Fuso e horário do reset diário — RESOLVIDA:** `America/Sao_Paulo`, meia-noite, dentro do adaptador do `Clock` (`SaoPauloClockAdapter`). O contador local é uma proteção aproximada: os provedores resetam as próprias cotas em horários próprios.
3. **Hospedagem da API — EM ABERTO.** Define onde ficam as variáveis secretas de produção.
4. **Aviso ao mentor e LGPD — RESOLVIDA (PR 3).** O texto está implementado na tela `/rascunhos/novo` (`apps/web/src/components/generate-drafts-screen.tsx`): "O texto é enviado ao provedor de IA configurado no servidor. Não cole dados pessoais de estudantes."
5. **Tamanho máximo do texto de entrada — RESOLVIDA:** 8.000 caracteres, configurável por `AI_MAX_INPUT_CHARS`. A relação tokens/caractere é uma estimativa; reconferir no teste manual e no console do provedor.
6. **Capacidades do modelo gratuito escolhido — RESOLVIDA (com ressalvas), conferida na documentação oficial da Groq em 2026-11-21:** `openai/gpt-oss-120b` lista Tool Use, JSON Object Mode e JSON Schema Mode, e o endpoint compatível com OpenAI aceita `stream`. Ressalvas que moldaram a implementação: (a) a Groq informa que **streaming e tool use não são suportados junto com Structured Outputs**, então a requisição leva `tools` e não leva `response_format`, e o JSON final é validado localmente com Zod; (b) a tabela do modelo diz "Parallel Tool Use: No", então a requisição envia `parallel_tool_calls: false`; (c) o formato dos chunks SSE do provedor (`delta.tool_calls`) não foi confirmado na leitura, então o adaptador chama o provedor sem `stream`, e o streaming SSE existe entre a API e o mentor (um evento por rascunho).

### Decisões adicionais do PR 2 (resolvidas)

7. **Cota de uso ao falhar ou rejeitar — RESOLVIDA.**
   - **Resposta recebida do provedor, mesmo com todos os itens rejeitados: a cota NÃO é devolvida.** O aviso (`notice` no evento `done`) explica que a tentativa contou.
   - **Provedor falha antes de qualquer resposta (429, 5xx, timeout, falha de rede) na primeira chamada: a cota É devolvida** (`AiUsageLimiter.refund`). A mensagem ao mentor diz que a tentativa não contou.
   - Não devolve: erro 4xx que não seja 429 (configuração, como chave inválida), resposta sem mensagem utilizável e falha depois de o provedor já ter respondido (rodadas de tool calling). Nesses casos a mensagem diz que a tentativa contou.
8. **Máximo de `quantity`: 10** por pedido.
9. **Teto global padrão: 40 gerações/dia** (`AI_DAILY_LIMIT_GLOBAL`), **valor provisório**, a reconferir com o consumo real de tokens (o smoke test mediu 665 tokens para 1 questão sem tool calling; com tool calling a conversa é reenviada a cada rodada) e com a cota do console da Groq. **Segue provisório após o PR #22:** numa geração real de 3 questões, só o último turno gastou 1.168 tokens (a conversa inteira é reenviada a cada rodada), e o **total por geração não foi medido**. Enquanto isso não for medido, 40 gerações/dia não está comprovado contra os 200.000 tokens/dia do plano gratuito.
10. **Rodadas de correção:** no máximo 2 por questão (contadas pelo `question_number` que o modelo envia a `validar_questao`). Itens que continuam inválidos vão para `rejected`.

### Riscos aceitos e itens adiados

11. **Endpoint sem autenticação — RISCO ACEITO até o Marco 3.2.** `organizationId` e `mentorId` vêm do corpo, não há checagem de papel `MENTOR` e, por isso, o limite por mentor pode ser contornado trocando o `mentorId`. Mitigações: o padrão é `mock`; com provedor real a API loga na subida "endpoint sem autenticação até o Marco 3.2; não expor publicamente"; o teto global limita o gasto da cota da Groq. **Não expor a API com provedor real publicamente antes do 3.2.**
12. **Adaptador `google` — FORA DO CURSO (backlog).** `AI_PROVIDER=google` falha na subida com erro claro, sem cair em outro provedor.
13. **Streaming real do provedor — ADIADO** (depende da facilitadora). O adaptador chama a Groq sem `stream`; o streaming SSE existe entre a API e o mentor, um evento por rascunho, depois que a resposta completa chega.

### Achados do fechamento da Semana 11

14. **Next com `--webpack` — REGISTRADO.** O build e o `dev` do web usam `next ... --webpack`, porque o Turbopack recusa as libs do workspace: os `package.json` delas declaram `"type": "commonjs"` e o código-fonte é ESM (erro: "Specified module format (CommonJs) is not matching the module format of the source code"). **Voltar ao Turbopack quando isso for resolvido** (alinhar o `type` das libs ao código ou outra forma de consumir as libs).
15. **JSON final quebrado pelo modelo (PR #22) — CORRIGIDO, com melhoria futura.** Numa geração real de 3 questões (`openai/gpt-oss-120b`, `finish_reason: "stop"`, sem truncar), o modelo chamou `validar_questao` 3 vezes (todas válidas) e depois **reescreveu o JSON final à mão e o quebrou** (um `"organ":?` solto e um escape duplo). O `JSON.parse` falhava e a geração inteira virava um item `INVALID_GENERATED_FORMAT`, com `draftCount: 0`. Correção: a tool guarda a última versão válida de cada questão e o adaptador usa essas questões quando o JSON final não faz parse (`validar-questao.tool.ts` e `groq-question-draft-generator.adapter.ts`). Regra de cota inalterada: a tentativa conta. **Melhoria futura:** tornar a tool a fonte de verdade das questões (o JSON final deixaria de ser reescrito pelo modelo); decidir o que fazer quando o JSON final parseia mas traz menos questões que as validadas.
16. **`usage` do evento `done` — REGISTRADO:** os números `usage.mentor` e `usage.global` são as gerações **RESTANTES** do dia (não as usadas). Ex.: `mentor: 9` depois de uma geração com limite 10.
17. **Teto global 40 — segue PROVISÓRIO** (ver item 9): a medição de tokens por geração completa ainda não existe.
18. **Observação de qualidade das questões — REGISTRADA.** Com uma **lista de tópicos** como entrada, o modelo gera perguntas sobre o que o texto "menciona" (ex.: "o que o material cita?"); com **texto explicativo**, gera perguntas conceituais. **Melhoria futura:** reforçar o system prompt (`system-prompt.ts`) para pedir perguntas conceituais mesmo com entrada em tópicos. Orientação ao mentor no README: colar texto de estudo explicativo, não uma lista de tópicos.

---

## Related ADRs

- **ADR-004:** importação por modelo estruturado (ajustado parcialmente por este ADR)
- **ADR-005:** convite por link com token (papéis `MENTOR` e `STUDENT` por organização)
- **ADR-007:** organização pessoal (todo usuário é `MENTOR` da própria organização, o que afeta quem vê a ação de gerar)

---

## References

- CLAUDE.md, seção 2 (regras 4, 6 e 7) e seção 4
- [ADR-004](adr-004-importacao-por-modelo-estruturado.md)
- README.md, seções 7 e 9
