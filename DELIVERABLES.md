# StudyForge — Rastreamento de Atividades Entregáveis

Este arquivo documenta todas as atividades entregues semana a semana, incluindo spec, código, testes e localização.

---

## Semana 1 (S1) — Claude Code Configurado

| Item | Status | Localização | O quê |
|---|---|---|---|
| **Claude Code** | ✅ Entregue | Log/Print | Instalação v2.1.273 com 9 skills |
| **Skills iniciais** | ✅ Configurado | `.claude/skills/` | Skills pré-carregadas |

**O que é:**
- Evidência de Claude Code instalado e funcional
- Skills básicas disponíveis

**Como confirmar:**

Claude Code v2.1.273 ou superior
Skills available: 9+


---

## Semana 2 (S2) — CLAUDE.md + Esqueleto Funcional

| Item | Status | Localização | O quê |
|---|---|---|---|
| **CLAUDE.md** | ✅ Entregue | `CLAUDE.md` | Contexto do projeto, 8 regras, convenções técnicas |
| **Esqueleto Nx** | ✅ Entregue | `apps/api`, `apps/web`, `libs/shared/`, `libs/import/` | Monorepo estruturado |
| **DraftQuestion** | ✅ Entregue | `libs/import/domain/src/lib/draft-question.ts` | Entidade com 37 testes ✅ |
| **Marcos 2.1–2.2** | ✅ Entregue | Commits 39edfcb, 9bf5584, d1391ac | Contratos e entidades |

**O que é:**
- Documentação arquitetural imutável
- Estrutura monorepo Nx pronta
- Primeira entidade (DraftQuestion) com testes

**Como testar:**
```bash
npx nx run-many -t lint test build
npx nx test import-domain  # 26 testes
```

**Commits:**

8a2a095 - CLAUDE.md
39edfcb, 9bf5584, d1391ac - Marcos 2.1–2.2


---

## Semana 3 (S3) — AGENT.md + Skill bounded-context-scaffolder

| Item | Status | Localização | O quê |
|---|---|---|---|
| **AGENT.md** | ✅ Entregue | `AGENT.md` | Estado do repo, fluxo por etapas, comandos, checklist |
| **Skill scaffolder** | ✅ Entregue | `.claude/skills/bounded-context-scaffolder/` | Gerador de bounded contexts (SKILL.md + reference.md + README.md) |
| **Contexto identity** | ✅ Entregue | `libs/identity/domain`, `libs/identity/application`, `libs/identity/infra` | User, Organization, Membership, MembershipRole (21 testes ✅) |
| **ESLint scope rule** | ✅ Entregue | `.eslintrc.base.json` | scope:identity → [scope:shared, scope:identity] |
| **Marcos 2.3–2.6** | ✅ Entregue | Commit 4976504 "step 2 complete" | Esqueleto identity + ESLint |

**O que é:**
- Documentação do estado atual do projeto
- Skill reutilizável para criar novos bounded contexts
- Contexto `identity` scaffoldado (ready pra application layer)

**Como testar:**
```bash
npx nx run-many -t lint test build  # 11 projetos, 108 testes
npx nx test identity-domain         # 21 testes da identity
```

**Como usar skill:**

Claude: “Create a new bounded context for quiz”
Skill: Scaffold quiz/domain, quiz/application, quiz/infra com ESLint


**Commits:**

33838ff - AGENT.md
4976504 - step 2 complete (Marcos 2.1–2.6)


---

## Semana 4 (S4) — MCP Validator

| Item | Status | Localização | O quê |
|---|---|---|---|
| **MCP Server** | ✅ Entregue | `https://github.com/seu-usuario/studyforge-mcp-validator` | 4 tools: validate-architecture, validate-spec, validate-adr, detect-conflicts |
| **Red Team** | ✅ 9 testes | `__tests__/red-team.test.ts` | 5 ataques bloqueados (node:crypto, scope boundaries, ubíqua language, contextos mistos, ADR incompleto) |
| **SECURITY.md** | ✅ Docs | `SECURITY.md` | Defesas contra prompt injection |
| **README.md** | ✅ Docs | `README.md` | Como usar, ferramentas, red team, testes |

**O que é:**
- MCP server EXTERNO (repo separado, reutilizável em S5–S7)
- Valida specs, ADRs e arquitetura contra regras hardcoded
- Defesa contra prompt injection (5 ataques testados)

**Como testar:**
```bash
npm run build   # tsc sem erros
npm test        # 9/9 PASS
```

**Commits:**

feat: studyforge-mcp-validator — MCP com red team


**Uso em S5–S7:**
- S5: Validar spec com ubíqua/EARS/BDD
- S6: Validar ADR (7 seções)
- S7: Detectar conflitos em 3 specs

---

## Semana 5 (S5) — Spec Identity Repositories

| Item | Status | Localização | O quê |
|---|---|---|---|
| **Spec** | 🔄 Em progresso | `docs/specs/s5-identity-repositories.md` | Ubíqua language (User, Organization, Membership), 5 critérios EARS, 3 cenários BDD |
| **Validação MCP** | 🔄 Planejado | MCP validator | Validar spec contra bounded context rules |
| **Commit** | 🔄 Pendente | — | `docs(s5): spec identity repositories — ubíqua language + EARS + BDD` |

**O que é:**
- Especificação comportamental (sem implementação)
- Documento blueprint pra S6 (ADR + tasks) e Marco 3.1 (code)
- Validado com MCP validator (estudy-forge-mcp-validator)

**Como testar (em S5+):**

Claude Code: “Validate this spec against identity bounded context”
→ MCP validator roda
→ Resultado: ✅ OK ou ❌ Erros


---

## Semana 6 (S6) — ADR + Tasks + RPI

| Item | Status | Localização | O quê |
|---|---|---|---|
| **ADR-003** | 🔄 Planejado | `docs/adrs/adr-003-identity-repositories.md` | Decisão arquitetural (7 seções obrigatórias) |
| **Tasks** | 🔄 Planejado | `docs/tasks/s6-identity-implementation.md` | Checklist de tasks pra implementar identity |
| **RPI Evidence** | 🔄 Planejado | Chat transcript ou documento | Evidência de sessões de refinement em paralelo |
| **Commit** | 🔄 Pendente | — | `docs(s6): ADR + tasks identity repositories` |

**O que é:**
- ADR: Justificativa arquitetural (por que fazer assim)
- Tasks: Trabalho a fazer (checklist)
- RPI: Refinement do Product Increment (evidência de sessões)

---

## Semana 7 (S7) — 3 Specs de Quiz

| Item | Status | Localização | O quê |
|---|---|---|---|
| **Spec 1: Quiz Creation** | 🔄 Planejado | `docs/specs/s7-quiz-creation.md` | Create Quiz workflow + ubíqua + EARS + BDD |
| **Spec 2: Quiz Publishing** | 🔄 Planejado | `docs/specs/s7-quiz-publishing.md` | Publish Quiz workflow |
| **Spec 3: Quiz Execution** | 🔄 Planejado | `docs/specs/s7-quiz-execution.md` | Student execution + scoring |
| **Conflict Detection** | 🔄 Planejado | MCP validator | Detectar conflitos entre 3 specs |
| **Commit** | 🔄 Pendente | — | `docs(s7): 3 specs quiz — creation, publishing, execution` |

**O que é:**
- 3 specs novas (não identity, mas quiz)
- Validação de conflitos entre eles (ubíqua language)
- Prepara pra implementação em Marco 3.2–3.4

---

## Marco 3.1 — Identity Repositories (Implementação)

| Item | Status | Localização | O quê |
|---|---|---|---|
| **User Repository** | ⏳ Planejado | `libs/identity/application/src/repositories/user.repository.ts` | FindByEmail, FindById, Save com porta |
| **Organization Repository** | ⏳ Planejado | `libs/identity/application/src/repositories/organization.repository.ts` | Similar pra Organization |
| **Prisma Adapter** | ⏳ Planejado | `libs/identity/infra/src/adapters/prisma-user.adapter.ts` | Implementação real do repository |
| **Testes** | ⏳ Planejado | `libs/identity/application.test.ts`, `libs/identity/infra.test.ts` | Unit + integration tests |

**Baseado em:** S5 spec + S6 ADR/tasks

**Quando:** Após S6

---

## Marco 3.2 — Quiz Context Scaffold + Domain

| Item | Status | Localização | O quê |
|---|---|---|---|
| **Quiz Domain** | ⏳ Planejado | `libs/quiz/domain/src/` | Quiz, Question, Attempt entities |
| **Quiz Application** | ⏳ Planejado | `libs/quiz/application/src/` | Use cases (CreateQuiz, PublishQuiz, ExecuteQuiz) |
| **Quiz Infra** | ⏳ Planejado | `libs/quiz/infra/src/` | Prisma adapters |
| **Testes** | ⏳ Planejado | `libs/quiz/domain.test.ts` | 20+ testes |

**Baseado em:** S7 specs (quiz-creation, quiz-publishing, quiz-execution)

**Quando:** Após S7

---

## Marco 3.3–3.4 — Quiz Application + Execution

| Item | Status | Localização | O quê |
|---|---|---|---|
| **CreateQuiz UseCase** | ⏳ Planejado | `libs/quiz/application/src/use-cases/create-quiz.ts` | Implementação completa |
| **PublishQuiz UseCase** | ⏳ Planejado | `libs/quiz/application/src/use-cases/publish-quiz.ts` | Lógica de publicação |
| **ExecuteQuiz UseCase** | ⏳ Planejado | `libs/quiz/application/src/use-cases/execute-quiz.ts` | Responder e scoring |
| **API Endpoint** | ⏳ Planejado | `apps/api/src/routes/quiz.controller.ts` | Endpoints REST |
| **E2E Tests** | ⏳ Planejado | `libs/quiz/e2e.test.ts` | Full workflow tests |

---

## 📊 Tabela de Status Geral

| Semana | Tipo | Status | Localização |
|---|---|---|---|
| **S1** | Setup | ✅ Entregue | Claude Code |
| **S2** | Docs + Skeleton | ✅ Entregue | CLAUDE.md + Nx monorepo |
| **S3** | Docs + Skill | ✅ Entregue | AGENT.md + bounded-context-scaffolder |
| **S4** | MCP | ✅ Entregue | GitHub externo (studyforge-mcp-validator) |
| **S5** | **Spec** | ✅ Entregue | `docs/specs/s5-identity-repositories.md` | Ubíqua language (User, Org, Membership), 5 EARS, 3 BDD scenarios |
| **S6** | ADR + Tasks | 🔄 Planejado | `docs/adrs/` + `docs/tasks/` |
| **S7** | 3 Specs | 🔄 Planejado | `docs/specs/` |
| **Marco 3.1** | Código | ⏳ Depois de S6 | `libs/identity/application` + `infra` |
| **Marco 3.2** | Código | ⏳ Depois de S7 | `libs/quiz/domain` + `application` + `infra` |
| **Marco 3.3–3.4** | Código | ⏳ Depois de 3.2 | `libs/quiz/` + `apps/api/` |

---

## 🔗 Estrutura de Documentação
```
docs/
├── specs/ # Especificações (S5, S7)
│ ├── s5-identity-repositories.md
│ ├── s7-quiz-creation.md
│ ├── s7-quiz-publishing.md
│ └── s7-quiz-execution.md
├── adrs/ # Architecture Decision Records (S6+)
│ ├── adr-001-monorepo-nx.md
│ ├── adr-002-ddd-bounded-context.md
│ └── adr-003-identity-repositories.md
└── tasks/ # Task lists (S6+)
├── s6-identity-implementation.md
└── s6-identity-rpi-evidence.md
```

---

## 📝 Como atualizar este arquivo

Toda semana, após commitar entrega:

```bash
git add DELIVERABLES.md
git commit -m "docs: :books: update DELIVERABLES — S5 spec entregue"
git push
```


