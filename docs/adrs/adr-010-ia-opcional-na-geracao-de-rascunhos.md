# ADR-010: IA gratuita e opcional na geração de rascunhos

**Date:** 2026-11-21  
**Status:** Proposed  
**Decision Maker:** Responsável do projeto (aprovação pelo merge deste ADR)  
**Affected By:** ADR-004, `import-application`, `import-infra`, `shared/contracts`, variáveis de ambiente da API, CLAUDE.md seções 2 (regra 7) e 4  

---

## Title

Geração opcional de `DraftQuestion[]` por IA gratuita, atrás do port `QuestionDraftGenerator`, com adaptadores `mock`, `groq` e `google`, chave só no servidor e limite diário de uso por mentor.

---

## Status

**Proposed**: ajusta parcialmente o [ADR-004](adr-004-importacao-por-modelo-estruturado.md), trocando "sem IA paga" por "IA gratuita e opcional". Este ADR é só documentação: nenhum código, dependência, variável de ambiente ou migration é criado por ele. O que não foi decidido está em "Decisões em aberto", sem resposta.

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

- Limite diário **por mentor**: padrão **10 gerações por dia**, configurável em `AI_DAILY_LIMIT_PER_MENTOR`.
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

Sem resposta. O responsável do projeto decide antes da tarefa correspondente.

1. **Onde guardar o contador de uso:** memória no curso; tabela depois? Quando migrar?
2. **Fuso e horário do reset diário** do limite.
3. **Hospedagem da API**, que define onde ficam as variáveis secretas de produção.
4. **Aviso ao mentor e LGPD:** texto e momento do aviso de que o conteúdo vai para um provedor externo.
5. **Tamanho máximo do texto de entrada** enviado ao provedor.
6. **Capacidades do modelo gratuito escolhido:** confirmar que suporta tool calling, streaming e structured output.

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
