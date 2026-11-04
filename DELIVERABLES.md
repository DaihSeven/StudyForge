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
| **Spec** | ✅ Entregue | \`docs/specs/s5-identity-repositories.md\` | Ubíqua language: User, Organization, Membership, MembershipRole (+ 5 invariantes) |
| **5 EARS Criteria** | ✅ Entregue | Spec completa | FindByEmail, FindById, Save, FindOrgById, FindMembershipsByOrg |
| **3 BDD Scenarios** | ✅ Entregue | Spec completa | Caso feliz, not found, duplicate email |
| **Validação MCP** | ⏳ S6 | MCP validator | Validar spec contra bounded context rules |
| **Commit** | ✅ Entregue | — | \`docs(s5): spec identity repositories — ubíqua language + EARS + BDD\` |

**O que é:**
- Especificação comportamental (sem implementação, apenas documento)
- Blueprint pra S6 (ADR + tasks) e Marco 3.1 (code)
- Validável com MCP validator (studyforge-mcp-validator)

**Como testar (em S6+):**
\`\`\`
Claude Code: "Validate this spec against identity bounded context"
→ MCP validator roda
→ Resultado: ✅ OK ou ❌ Erros
\`\`\`

**Estrutura de linguagem ubíqua:**
- User: Identidade global (mentor ou estudante)
- Organization: Tenant que agrupa usuários
- Membership: Vínculo User → Organization com Role
- MembershipRole: MENTOR ou STUDENT
- Invariante: User.organizationId NÃO EXISTE; Membership.organizationId obrigatório


---

## Semana 6 (S6) — ADR + Tasks + RPI

| Item | Status | Localização | O quê |
|---|---|---|---|
| **ADR-003** | ✅ Entregue | `docs/adrs/adr-003-identity-repositories.md` | Repository pattern, ports em application, 7 seções |
| **Tasks** | ✅ Entregue | `docs/tasks/s6-identity-implementation-tasks.md` | 25 tasks em 7 phases (interfaces → testes → commit) |
| **RPI Evidence** | ✅ Entregue | `docs/rpi/s6-identity-rpi-evidence.md` | Decisões refinadas, conversas-chave, evidência numérica |
| **Commit** | ✅ Entregue | — | `docs(s6): ADR + tasks identity repositories` |

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

## Semana 8 — Verificadores

| Item | Status | Localização | O quê |
|---|---|---|---|
| **Scripts de verificação** | ✅ Entregue | `package.json` | `lint`, `typecheck`, `build`, `test`, `test:cov`, `audit`, `audit:full` (todos via Nx) |
| **Alvo `typecheck`** | ✅ Entregue | `project.json` de cada projeto + `nx.json` | `tsc --noEmit` no tsconfig lib/app **e** no `tsconfig.spec.json` |
| **Cobertura mínima** | ✅ Entregue | `jest.config.*` de cada projeto | `collectCoverageFrom` + `coverageThreshold.global` de 80% |
| **CI** | ✅ Entregue | `.github/workflows/ci.yml` | 6 jobs em push/PR na `main` |

### O que cada check garante

| Job (`name:`) | Comando | Garante |
|---|---|---|
| **Lint** | `npm run lint` | ESLint em todos os projetos, incluindo `enforce-module-boundaries` e `domainLayer` (regras 2, 4 e 8 do CLAUDE.md) |
| **Type check** | `npm run typecheck` | Código **e** specs compilam sem erro de tipo (`tsc --noEmit`) |
| **Build** (needs Lint, Type check) | `npm run build` | Todos os projetos compilam |
| **Test** (needs Lint, Type check) | `npm run test:cov` | Testes passam e cada projeto cumpre 80% de statements, branches, functions e lines; `coverage/` é publicado como artefato (7 dias, `if: always()`) |
| **Dependency check: vulnerabilidade conhecida (npm audit)** | `npm run audit` (+ `audit:full` informativo) | Nenhuma vulnerabilidade high/critical em dependências de **produção** |
| **Dependency check: revisão do PR (dependency-review-action)** | só em `pull_request` | O PR não introduz dependência com severidade high ou maior (`fail-on-severity: high`) |

O CI define `NX_DAEMON=false`, `NX_NO_CLOUD=true` e um `DATABASE_URL` fictício (o `prisma generate` lê a variável via `prisma.config.ts`). O `test-integration` (PostgreSQL real) **não** roda no CI.

**Como a cobertura mínima bloqueia o merge:** se um projeto fica abaixo de 80% em qualquer métrica, o Jest sai com erro (`"global" coverage threshold for ... not met`), o `nx run-many` falha, e o job **Test** fica vermelho. Com o job como *required check* na branch protection, o PR não pode ser mergeado. Arquivos sem teste contam como 0%, porque o `collectCoverageFrom` inclui `src/**/*.{ts,tsx}` (exclui specs, `index.ts`, `*.module.ts`, `main.ts`, `dto/`, `generated/` e `*.d.ts`).

### Cobertura por projeto (antes → depois)

"Antes" = com `collectCoverageFrom` e threshold já ativos, antes dos testes novos.

| Projeto | Antes (stmts / branch / func / lines) | Depois (stmts / branch / func / lines) |
|---|---|---|
| shared-domain | — | 93.22 / 100 / 96.29 / 92.72 |
| shared-contracts | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| import-domain | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| import-application | 95.23 / **50** / 100 / 94.73 | 100 / 100 / 100 / 100 |
| shared-prisma | 81.96 / 100 / **33.33** / 84.21 | 100 / 100 / 100 / 100 |
| import-infra | 94.11 / 100 / **50** / 91.66 | 100 / 100 / 100 / 100 |
| identity-domain | 100 / 95.83 / 100 / 100 | 100 / 95.83 / 100 / 100 |
| identity-infra | 0/0 (sem código medido) | 0/0 |
| identity-application | 0/0 (sem código nem testes; `passWithNoTests`) | 0/0 |
| api | 100 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| web | **25** / 100 / **33.33** / **28.57** | 100 / 100 / 100 / 100 |

Em negrito, abaixo de 80% antes dos testes novos. Nenhum projeto precisou baixar o threshold, então não há exceção a justificar.

**Testes novos** (unitários, sem banco):
- `import-application` — `CreateDraftQuestionUseCase` relança erro que não é `DomainError` (ex.: `alternatives` malformado) e não persiste nada.
- `shared-prisma` — `PrismaService`: `onModuleInit` conecta, propaga falha de conexão; `onModuleDestroy` desconecta.
- `import-infra` — `PrismaDraftQuestionRepository` (`prisma-draft-question.repository.spec.ts`): payload exato enviado ao Prisma (questão + alternativas numa única chamada) e propagação de falhas. O caminho com PostgreSQL real segue coberto só pelo `test-integration`.
- `web` — `specs/route.spec.ts` (`GET /api/hello`) e `specs/layout.spec.tsx` (shell `html`/`body` e metadata).

### Provas de que os verificadores bloqueiam

1. **Typecheck:** `export const __bad: number = "x";` em `libs/shared/domain/src/lib/result.ts` → `npm run typecheck` falhou com `error TS2322` e código de saída 1. Revertido.
2. **Cobertura:** threshold de branches de `identity-domain` subido para 100% (cobertura real 95.83%) → `npm run test:cov` falhou com `"global" coverage threshold for branches (100%) not met: 95.83%` e código 1. Revertido.

### Decisão de dependências

- **Vulnerabilidades: 69 → 49, 0 críticas.** Feito com `nx` e todos os `@nx/*` em 23.3.1 (lockfile regenerado, pois o `npm install` dava `ERESOLVE` com `@nx/*@23.2.1`), `npm audit fix` sem `--force` e `next` (+ `eslint-config-next`, `@next/eslint-plugin-next`) em `~16.4.5`. Sem downgrade de major.
- **Produção bloqueia, desenvolvimento só informa.** `npm run audit` usa `--omit=dev`: o que chega ao usuário final precisa estar limpo. O `audit:full` (inclui dev) roda no CI com `continue-on-error: true` e só informa, porque vulnerabilidades de ferramentas de build não correm em produção e muitas dependem de upgrade de major das ferramentas.
- **Override do `multer`.** O `multer` 2.4.0 (via `@nestjs/platform-express`) tinha vulnerabilidade high de DoS (GHSA-q7qp-rjg7-q26m). A correção está no `multer@2.5.0`, mas nenhuma versão 11.x do `@nestjs/platform-express` (até 11.2.8) o declara; só existe a 12.x (major). Por isso, `overrides: { "multer": "^2.5.0" }` no `package.json` (mesma major, sem `--force`). `npm ls multer` mostra só `multer@2.5.0 overridden`, e o `package-lock.json` reflete isso (o CI usa `npm ci`).
  - **Uso de upload no código:** `grep -rnE "multer|FileInterceptor|FilesInterceptor|UploadedFile" apps libs --include=*.ts` não retornou nada, então o projeto não usa upload de arquivos.
  - **Remover o override quando o Nest 11 declarar `multer >= 2.5`.**
- **`undici` (só desenvolvimento).** Vulnerabilidade high, transitiva do `nx`. O `npm audit` só a corrige com `nx@17.2.8`, um downgrade major, o que está fora de cogitação. Fica visível no `audit:full`, sem bloquear.

### Branch protection

<!-- Preencher com prints: regra da branch `main`, required status checks (os 6 jobs), PR obrigatório. -->

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
| **S8** | Verificadores | ✅ Entregue | `.github/workflows/ci.yml` + scripts + cobertura mínima |
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


