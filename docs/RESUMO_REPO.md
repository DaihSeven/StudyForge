# Resumo do repositório

Fotografia do estado do StudyForge em **2026-11-10**, na `main` (commit `a686dad`). Documento de apoio: a fonte de verdade sobre produto é o `README.md` e sobre como trabalhar no código é o `CLAUDE.md`. Não contém segredos, connection strings nem valores do `.env`.

## 1. Projeto

**StudyForge** é uma plataforma de simulados: o mentor fornece material em formato estruturado (JSON e Markdown), o sistema gera questões editáveis (`DraftQuestion`), o mentor revisa e publica, e o estudante responde e acompanha resultados. Nasceu da mentoria voluntária para certificações AWS, mas o domínio é genérico.

Regra arquitetural central: o núcleo de quiz nunca conhece a origem do conteúdo, e a ingestão de material nunca depende do núcleo de quiz. Todo recurso de organização carrega `organizationId` como invariante. Nenhum fluxo automatizado publica conteúdo.

## 2. Stack

| Camada | Escolha |
|---|---|
| Monorepo | Nx 23.3 |
| Backend | NestJS 11 (use cases como interactors, ports como interfaces) |
| Frontend | Next.js 16 (App Router) + React 19 |
| Banco / ORM | PostgreSQL / Prisma 7.10 com `@prisma/adapter-pg` |
| Contratos | Zod 4 (`shared/contracts`) |
| Testes | Jest 30 (ts-jest) |
| Linguagem | TypeScript 6 |
| Autenticação | Google OAuth (Marco 3.2, ainda não implementada) |
| CI | GitHub Actions, Node 22 |

## 3. Estrutura de pastas (resumida)

```
apps/
  api/                    NestJS: ZodValidationPipe, POST /api/draft-questions
  web/                    Next.js (só consome shared/contracts)
libs/
  shared/{domain,contracts,prisma}
  import/{domain,application,infra}     DraftQuestion, use case, repositório Prisma
  identity/{domain,application,infra}   User, Organization, Membership; UserRepository
prisma/                   schema.prisma (User, DraftQuestion, Alternative) e migrations
prisma.config.ts          na raiz do repositório
docs/
  adrs/                   ADR-003 a ADR-008
  specs/                  S5 e Marco 3.1
  tasks/, rpi/, evidencias/
.github/workflows/ci.yml
README.md  CLAUDE.md  AGENT.md  DELIVERABLES.md  LOG-RED-GREEN-REFACTOR-{1,2,3}.md
```

Projetos Nx (11): `api`, `web`, `shared-domain`, `shared-contracts`, `shared-prisma`, `import-domain`, `import-application`, `import-infra`, `identity-domain`, `identity-application`, `identity-infra`.

Ainda não existem: `libs/quiz/*` (Etapa 3) e `libs/course/*` (Etapa 4).

## 4. Scripts do `package.json`

| Script | Comando |
|---|---|
| `lint` | `nx run-many -t lint` |
| `typecheck` | `nx run-many -t typecheck` |
| `build` | `nx run-many -t build` |
| `test` | `nx run-many -t test` |
| `test:cov` | `nx run-many -t test --coverage` |
| `audit` | `npm audit --omit=dev --audit-level=high` |
| `audit:full` | `npm audit --audit-level=high` |

## 5. Como rodar

```bash
npm ci                 # instalação reprodutível a partir do lockfile
npm run lint
npm run typecheck
npm run build
npm run test:cov
```

Tudo passa pelo Nx. Os alvos de `lint`, `test` e `typecheck` dependem de `prisma-generate`, que gera o client em `libs/shared/prisma/src/generated/`. Não é preciso banco de dados para esses comandos. Para ver a tabela de cobertura no terminal:

```bash
npx nx run-many -t test --coverage --coverageReporters=text-summary --skip-nx-cache --output-style=static
```

**Não use `npx jest` na raiz** (ver seção 10).

## 6. Cobertura atual por projeto

Saída real de `npx nx run-many -t test --coverage --coverageReporters=text-summary --skip-nx-cache` na `main` (12 tarefas, todas com sucesso; 122 testes no total). Os projetos têm limite mínimo de 80% no `jest.config` (`coverageThreshold`).

```
== shared-contracts
Statements   : 100% ( 3/3 )
Branches     : 100% ( 0/0 )
Functions    : 100% ( 0/0 )
Lines        : 100% ( 3/3 )
Tests:       4 passed, 4 total
== shared-domain
Statements   : 93.22% ( 55/59 )
Branches     : 100% ( 12/12 )
Functions    : 96.29% ( 26/27 )
Lines        : 92.72% ( 51/55 )
Tests:       26 passed, 26 total
== shared-prisma
Statements   : 100% ( 12/12 )
Branches     : 100% ( 2/2 )
Functions    : 100% ( 3/3 )
Lines        : 100% ( 10/10 )
Tests:       5 passed, 5 total
== import-domain
Statements   : 100% ( 35/35 )
Branches     : 100% ( 22/22 )
Functions    : 100% ( 8/8 )
Lines        : 100% ( 31/31 )
Tests:       31 passed, 31 total
== import-application
Statements   : 100% ( 21/21 )
Branches     : 100% ( 2/2 )
Functions    : 100% ( 3/3 )
Lines        : 100% ( 19/19 )
Tests:       11 passed, 11 total
== identity-application
No tests found, exiting with code 0
Statements   : Unknown% ( 0/0 )
Branches     : Unknown% ( 0/0 )
Functions    : Unknown% ( 0/0 )
Lines        : Unknown% ( 0/0 )
== identity-domain
Statements   : 100% ( 49/49 )
Branches     : 96.42% ( 27/28 )
Functions    : 100% ( 10/10 )
Lines        : 100% ( 49/49 )
Tests:       23 passed, 23 total
== web
Statements   : 100% ( 8/8 )
Branches     : 100% ( 0/0 )
Functions    : 100% ( 3/3 )
Lines        : 100% ( 7/7 )
Tests:       4 passed, 4 total
== import-infra
Statements   : 100% ( 14/14 )
Branches     : 100% ( 0/0 )
Functions    : 100% ( 4/4 )
Lines        : 100% ( 10/10 )
Tests:       5 passed, 5 total
== api
Statements   : 100% ( 36/36 )
Branches     : 100% ( 4/4 )
Functions    : 100% ( 9/9 )
Lines        : 100% ( 30/30 )
Tests:       9 passed, 9 total
== identity-infra
Statements   : 89.47% ( 17/19 )
Branches     : 83.33% ( 5/6 )
Functions    : 100% ( 5/5 )
Lines        : 88.23% ( 15/17 )
Tests:       4 passed, 4 total
```

Observações:

- `identity-application` não tem testes (só um port e um erro), por isso a cobertura aparece como `Unknown%`.
- `identity-infra` (89,47% de statements) e `shared-domain` (93,22%) são os únicos abaixo de 100% em statements, e ambos acima do limite de 80%.
- A garantia "nada é gravado" do cenário 3 da S5 (email duplicado) depende do PostgreSQL e não é provada por teste sem banco (ver `LOG-RED-GREEN-REFACTOR-3.md`).

## 7. CI e proteção da `main`

Workflow `.github/workflows/ci.yml`, disparado em `push` e `pull_request` para `main`. Jobs:

| Check | Obrigatório no ruleset |
|---|---|
| Lint | sim |
| Type check | sim |
| Build | sim |
| Test (`npm run test:cov`, publica o artefato `coverage`) | sim |
| Dependency check: vulnerabilidade conhecida (npm audit) | sim |
| Dependency check: revisão do PR (`dependency-review-action`) | não (roda e aparece no PR) |

Ruleset `proteger-main` (ativo, alvo: branch padrão):

- **5 checks obrigatórios:** Lint, Type check, Build, Test e Dependency check (npm audit).
- Exige pull request (0 aprovações exigidas), bloqueia exclusão da branch e força de push (`non_fast_forward`).
- Merge permitido por merge, squash ou rebase.
- A política estrita de status (branch atualizada com a `main`) está desligada.

Estado: os últimos 3 runs na `main` (merges dos PRs #7, #8 e #9) terminaram com sucesso. O `npm audit` de produção bloqueia; o completo (inclui dev) é informativo.

## 8. Marcos

| Etapa | Estado |
|---|---|
| Etapa 1 — Fundação documental | concluída |
| Etapa 2 — Marcos 2.1 a 2.6 (monorepo, domínio, application, infra, API REST, contexto `identity` scaffoldado) | concluída |
| Etapa 3 — Marco 3.1 (fechar `identity`) | **parcial**: `UserRepository` com `findByEmail` e `save`, `PrismaUserRepository` (ainda não registrado no `IdentityInfraModule`), model e migration de `User`. Spec pronta, falta implementar. |
| Marco 3.2 | autenticação (Google OAuth) e fluxo de convite por link: planejado |
| Marco 3.3 | importação por modelo estruturado (JSON e Markdown): planejado |
| Marco 3.4 | contexto `quiz` (scaffold e domain): planejado |
| Marco 3.5 | publicação (`DraftQuestion` aprovado vira `Question`): planejado |
| Marco 3.6 | execução pelo aluno: planejado |
| Etapa 4 | `course`, importers PDF/DOCX, banco por certificação (ADR-008), organização pessoal e moderação (ADR-007): planejada |

**Próximo passo:** implementar o Marco 3.1 conforme `docs/specs/marco-3-1-identity-completo.md` (`findById`, `OrganizationRepository`, `MembershipRepository`, entidade `Invitation` e repositório, models Prisma e migration, registro no `IdentityInfraModule`). Item do primeiro commit: atualizar o comentário de `libs/identity/domain/src/lib/organization.ts`, que ainda diz que o convite está fora de escopo.

## 9. Specs e ADRs

**Specs** (`docs/specs/`)

- `s5-identity-repositories.md`: repositórios de `identity` (E1–E5, 3 cenários BDD); os 3 cenários já viraram teste.
- `marco-3-1-identity-completo.md`: fecha o `identity` (EARS M1–M17, cenários C01–C29, 10 decisões fechadas).

**ADRs** (`docs/adrs/`; ADR-001 e ADR-002 são citados nos ADRs, mas não estão no repositório)

- ADR-003: repositórios de `identity` como ports em `application` e adapters Prisma em `infra`.
- ADR-004: importação por modelo estruturado (JSON/Markdown) validado com Zod, sem IA paga.
- ADR-005: entrada em organização por convite por link com token (`Invitation`).
- ADR-006: contexto `course` fora do MVP 1, vai para a Etapa 4.
- ADR-007: organização pessoal automática, visibilidade `PRIVATE`/`UNLISTED`/`PUBLIC` e moderação por admin da plataforma.
- ADR-008: banco de questões por certificação e simulados de 25 ou 65 questões por sorteio estratificado.

Outros documentos: `DELIVERABLES.md` (histórico por semana), `LOG-RED-GREEN-REFACTOR-1/2/3.md`, `docs/tasks/`, `docs/rpi/`, `docs/evidencias/`.

## 10. Decisões em aberto mais relevantes

ADR-007 (organização pessoal, visibilidade, moderação):

- O que acontece com tentativas e resultados dos alunos quando um simulado é suspenso (sem decisão; LGPD).
- Como criar a organização pessoal das contas feitas no Marco 3.2, que ainda não terão uma.
- Quem é o primeiro admin da plataforma e como o `platformRole` é concedido.
- Contestação e denúncia: canal, prazo, quem decide, e se pode haver suspensão automática (colide com a regra 7 do CLAUDE.md).
- O link `UNLISTED` pode ser regenerado e revogado?

ADR-008 (banco de questões por certificação):

- Onde vivem o banco e o `ExamGenerator`: em `quiz` ou num contexto novo (exige explicar o racional antes, pelo CLAUDE.md).
- Fonte, formato e versionamento dos pesos por certificação (os pesos reais não estão definidos em lugar nenhum).
- O modelo de importação (ADR-004) precisa de certificação e domínio.
- A publicação de questão do banco (sem quiz) é o mesmo use case do Marco 3.5?
- O que o snapshot de questões guarda na tentativa, e por quanto tempo.

A lista completa está no fim de cada ADR.

## 11. Armadilhas conhecidas

- **`apps/web/next-env.d.ts` é reescrito pelo Next.** O arquivo é versionado, mas `next dev`/`next build` o regravam, deixando o working tree sujo sem mudança real. Não commitar: descartar com `git restore apps/web/next-env.d.ts`.
- **`claude` fora do PATH depois de reconstruir o Codespace.** Se o comando não for encontrado, o binário fica em `/usr/local/share/npm-global/bin`; adicione ao PATH com `export PATH="$PATH:/usr/local/share/npm-global/bin"` (e ao `~/.bashrc` para persistir).
- **`npx jest` na raiz quebra por causa do `apps/web`.** O `jest.config.ts` da raiz reúne os projetos, e o `jest.config.cts` do `web` chama o `next/jest`, que procura `app/` ou `pages/` a partir do diretório atual e falha com "Couldn't find any `pages` or `app` directory". Rode sempre pelo Nx: `npx nx test <projeto>` ou `npm run test`.
- **O Prisma Client gerado não é versionado.** `libs/shared/prisma/src/generated/` é gerado pelo alvo `prisma-generate`. Ao rodar `jest` ou `tsc` direto, sem o Nx, ele pode não existir.
- **Contagens de teste do `AGENT.md` estão desatualizadas** (cita 108 testes; hoje são 122).
- **Sem banco no CI nem neste ambiente:** testes de `infra` usam delegate Prisma falso com erros reais do Prisma; garantias de índice único e transação só se provam com teste de integração em PostgreSQL.
