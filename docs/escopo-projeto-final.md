# Escopo do projeto final

Documento de escopo do StudyForge como projeto final do curso (Semanas 11 a 14). Cada afirmação de "já existe" aponta para um arquivo ou PR; o que não existe está marcado **a entregar**, sem resultado inventado. Fonte de verdade de produto: `README.md`; de regras de código: `CLAUDE.md`.

## 1. Objetivo

Usar o StudyForge como **demonstração integrada dos 4 estágios de maturidade** (Assisted Developer, Context Orchestrator, Agentic Orchestrator, Harness/Loop Engineer), e não só como entrega técnica. O produto é o veículo; a evidência de cada estágio no repositório é o resultado.

## 2. Fatia vertical do produto

Mentor importa ou gera rascunhos → revisa → publica → aluno responde.

- Importação por modelo estruturado ([ADR-004](adrs/adr-004-importacao-por-modelo-estruturado.md)) e geração opcional por IA gratuita, atrás do port `QuestionDraftGenerator`, `mock` como padrão ([ADR-010](adrs/adr-010-ia-opcional-na-geracao-de-rascunhos.md), aceito).
- A revisão do mentor é obrigatória; nenhum fluxo automatizado publica (CLAUDE.md, seção 2, regra 7).
- O aluno responde ao quiz publicado e vê o resultado.

## 3. Dentro e fora do escopo

**Dentro**

- Marco 3.1 (`identity`: `Organization`, `Membership`, `UserRepository`), na medida em que a fatia vertical precisa.
- Autenticação (Marco 3.2), importação (3.3), contexto `quiz` (3.4), publicação (3.5), execução pelo aluno (3.6).
- Camada de IA do ADR-010: app com API (streaming, system prompt, structured output, tool calling), agente n8n, RAG simples.
- CI, testes e documentação.

**Fora (backlog pós-curso)**

- Etapa 4 inteira: contexto `course` ([ADR-006](adrs/adr-006-course-fora-do-mvp1.md)), importers de PDF/DOCX, banco de questões por certificação ([ADR-008](adrs/adr-008-banco-de-questoes-por-certificacao.md)), organização pessoal e moderação ([ADR-007](adrs/adr-007-organizacao-pessoal-visibilidade-e-moderacao.md)).
- Chave própria do mentor para IA (backlog já registrado no ADR-010, seção 7).

## 4. Regras de corte

Se o prazo apertar, corta-se nesta ordem:

1. **Convite por link** (`Invitation`, T11 em diante de `docs/tasks/marco-3-1-tarefas.md`). O demo usa `Membership` criada por seed.
2. **Job de integração obrigatório** e os testes de integração C09, C11, C12 e C17 completos.

**Nunca cai:** CI verde, o fluxo publicar → responder e a apresentação.

## 5. Evidência por estágio

### Assisted Developer

| Evidência | Onde |
|---|---|
| Ciclo red-green-refactor registrado | `LOG-RED-GREEN-REFACTOR-1.md` a `-4.md` |
| Teste que dá cobertura sem provar nada, analisado | `TESTE-QUE-NAO-PROVA-NADA.md` |
| Testes unitários sem banco | 124 testes (ver `docs/RESUMO_REPO.md`, seção 6) |

### Context Orchestrator

| Evidência | Onde |
|---|---|
| Regras para agentes | `CLAUDE.md`, `AGENT.md` |
| Specs com cenários BDD/EARS | `docs/specs/s5-identity-repositories.md`, `docs/specs/marco-3-1-identity-completo.md` |
| Decisões arquiteturais | `docs/adrs/` (ADR-003 a ADR-010) |
| Tarefas derivadas da spec | `docs/tasks/marco-3-1-tarefas.md` |
| Skill de scaffolding | `.claude/skills/bounded-context-scaffolder/` |

### Agentic Orchestrator

| Evidência | Onde |
|---|---|
| Subagente revisor só de leitura | `.claude/agents/revisor.md` (PR #14) |
| Skill de revisão com as regras que o lint não pega | `.claude/skills/revisao-studyforge/SKILL.md` |
| Revisão do agente aplicada a um PR real | comentários do PR #15 (1 sugestão aceita, sem bloqueio) |
| Agente n8n com 2+ tools | **a entregar** (Semana 12) |
| Versão em Google ADK ou LangChain com teste básico | **a entregar** (Semana 12) |

### Harness/Loop Engineer

| Evidência | Onde |
|---|---|
| CI com 7 checks por PR (5 obrigatórios) | `.github/workflows/ci.yml`; `docs/RESUMO_REPO.md`, seção 7 |
| Ruleset `proteger-main` bloqueando merge sem checks | `docs/evidencias/` (prints e PDF da Semana 8) |
| Job de integração com PostgreSQL | PR #11 |
| Fronteiras de camada e contexto no lint | `eslint.config.mjs`, tags do Nx |
| RAG simples (chunking, embedding, retrieval) | **a entregar** (Semana 13) |

## 6. Cronograma

| Semana | Conteúdo | Entregável |
|---|---|---|
| 11 | App funcional com API: streaming, system prompt, structured output, tool calling | link do GitHub |
| 12 | Agente n8n com 2+ tools; versão portada em Google ADK ou LangChain com teste básico; este documento de escopo | GitHub e n8n |
| 13 | RAG simples: chunking, embedding, retrieval sobre base própria | GitHub ou n8n |
| 14 | Projeto completo com CI, testes e documentação; apresentação de 5 a 8 min usando 4+ competências | GitHub |

## 7. Riscos

| Risco | Mitigação |
|---|---|
| Cota gratuita de IA esgotada (ADR-010: tool calling multiplica requisições) | adaptador `mock` como padrão; CI sem chamada real; limite diário por mentor e global |
| Prazo curto para 4 semanas de entrega | regras de corte da seção 4 |
| Custo de Codespace | trabalhar em worktrees, parar o Codespace quando ocioso, CI no GitHub Actions |
