# Resumo do repositório

Fotografia do estado do StudyForge em **2026-11-21**, na `main` (commit `3937790`, merge do PR #16). Cobre os PRs #11 a #17. Documento de apoio: a fonte de verdade sobre produto é o `README.md` e sobre como trabalhar no código é o `CLAUDE.md`. Não contém segredos, connection strings nem valores do `.env`.

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
| CI | GitHub Actions, Node 22; PostgreSQL 16 como service container no job de integração |

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
  adrs/                   ADR-003 a ADR-010
  specs/                  S5 e Marco 3.1
  tasks/, rpi/, evidencias/
.github/workflows/ci.yml
README.md  CLAUDE.md  AGENT.md  DELIVERABLES.md  LOG-RED-GREEN-REFACTOR-{1,2,3,4}.md
```

Projetos Nx (11): `api`, `web`, `shared-domain`, `shared-contracts`, `shared-prisma`, `import-domain`, `import-application`, `import-infra`, `identity-domain`, `identity-application`, `identity-infra`.

Ainda não existem: `libs/quiz/*` (Etapa 3) e `libs/course/*` (Etapa 4).

Alvo Nx `test-integration` (testes `*.integration.spec.ts` contra PostgreSQL real): os padrões (`cache: false`, `dependsOn: prisma-generate`) ficam em `targetDefaults` do `nx.json`, e cada projeto declara o alvo com o próprio `jest.integration.config.cts`. Hoje existe em `shared-prisma` (fumaça `SELECT 1`) e `import-infra` (repositório de `DraftQuestion`). Os `jest.config.cts` de `shared-prisma`, `import-infra` e `identity-infra` excluem `*.integration.spec.ts` do alvo `test`.

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

Não há script npm para integração. O alvo roda pelo Nx: `npx nx run-many -t test-integration` (exige `DATABASE_URL` de um PostgreSQL com as migrations aplicadas).

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

Saída real de `npx nx run-many -t test --coverage --coverageReporters=text-summary --skip-nx-cache` na `main` (12 tarefas, todas com sucesso; 124 testes no total). O bloco abaixo é da fotografia de 2026-11-17 (122 testes); só `identity-infra` mudou desde então (PR #15), e dele estão atualizados apenas os dois percentuais abaixo, os únicos recontados. Os projetos têm limite mínimo de 80% no `jest.config` (`coverageThreshold`).

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
== identity-infra   (atualizado após o PR #15; só os percentuais foram recontados)
Statements   : 90.47%
Branches     : 83.33%
```

Observações:

- `identity-application` não tem testes (só um port e um erro), por isso a cobertura aparece como `Unknown%`.
- `identity-infra` (90,47% de statements e 83,33% de branches) e `shared-domain` (93,22%) são os únicos abaixo de 100% em statements, e ambos acima do limite de 80%.
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
| Integration (Postgres) | não (roda e aparece no PR) |

O job **Integration (Postgres)** (desde o PR #11) sobe um service container `postgres:16` com usuário, senha e banco descartáveis definidos no próprio workflow (não são secrets, sem Neon), espera o healthcheck `pg_isready`, roda `npm ci`, `npx prisma migrate deploy` e `npx nx run-many -t test-integration`. O `DATABASE_URL` vem do `env` do workflow: o `prisma.config.ts` lê `process.env.DATABASE_URL` e o `dotenv` não sobrescreve variável já definida. No PR #11 ele aplicou as 2 migrations e passou o teste de fumaça e os 2 testes de integração de `import-infra`.

No total, um PR mostra **7 checks**, dos quais 5 são obrigatórios.

Ruleset `proteger-main` (ativo, alvo: branch padrão):

- **5 checks obrigatórios:** Lint, Type check, Build, Test e Dependency check (npm audit).
- Exige pull request (0 aprovações exigidas), bloqueia exclusão da branch e força de push (`non_fast_forward`).
- Merge permitido por merge, squash ou rebase.
- A política estrita de status (branch atualizada com a `main`) está desligada.

Estado: o run do PR #11 terminou com os 7 checks em sucesso. O `npm audit` de produção bloqueia; o completo (inclui dev) é informativo.

## 8. Marcos

| Etapa | Estado |
|---|---|
| Etapa 1 — Fundação documental | concluída |
| Etapa 2 — Marcos 2.1 a 2.6 (monorepo, domínio, application, infra, API REST, contexto `identity` scaffoldado) | concluída |
| Etapa 3 — Marco 3.1 (fechar `identity`) | **parcial**: `UserRepository` com `findById` (T1, PR #15), `findByEmail` e `save`, `PrismaUserRepository` (ainda não registrado no `IdentityInfraModule`), model e migration de `User`. Spec pronta; faltam T2 a T17. O CI já tem PostgreSQL para os cenários que precisam de banco (C09, C11, C12, C17). |
| Marco 3.2 | autenticação (Google OAuth) e fluxo de convite por link: planejado |
| Marco 3.3 | importação por modelo estruturado (JSON e Markdown): planejado |
| Marco 3.4 | contexto `quiz` (scaffold e domain): planejado |
| Marco 3.5 | publicação (`DraftQuestion` aprovado vira `Question`): planejado |
| Marco 3.6 | execução pelo aluno: planejado |
| Etapa 4 | `course`, importers PDF/DOCX, banco por certificação (ADR-008), organização pessoal e moderação (ADR-007): **backlog pós-curso** (ver abaixo) |

**Plano do curso (Semanas 11 a 14):** o plano acrescentou a camada de IA (ADR-010, aceito) ao escopo, e a Etapa 4 virou backlog pós-curso. Escopo, regras de corte e cronograma em `docs/escopo-projeto-final.md`.

**Próximo passo:** responder as decisões em aberto do ADR-009 e da lista de tarefas (as que bloqueiam cada tarefa estão mapeadas no fim de `docs/tasks/marco-3-1-tarefas.md`) e implementar o Marco 3.1 na ordem T1 a T17 desse arquivo, a partir da T2 (a T1, `UserRepository.findById`, entrou no PR #15). O comentário de `organization.ts` e as contagens (T0) já foram feitos no PR #12.

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
- ADR-009 (`adr-009-persistencia-identity-marco-3-1.md`, **Proposed**): persistência do `identity` no Marco 3.1. Models `Organization`, `Membership` e `Invitation`, índices únicos (`Membership` por User e Organization, `Invitation.tokenHash`), `onDelete: Restrict` em todas as FKs, só o SHA-256 do token no banco, `EXPIRED` calculado, migration única do grupo e integração de C09, C11, C12 e C17 em `identity-infra` com `--parallel=1`. Traz 10 decisões em aberto.
- ADR-010 (`adr-010-ia-opcional-na-geracao-de-rascunhos.md`, **Accepted** em 2026-11-21, PR #16): IA gratuita e opcional na geração de rascunhos, ajustando parcialmente o ADR-004. Port `QuestionDraftGenerator` com adaptadores `mock` (padrão), `groq` e `google`, chave só no servidor, ação só para `MENTOR` com provedor configurado e limite diário por mentor e global. O fluxo manual continua sendo o caminho principal. Traz 6 decisões em aberto. A implementação só começa em PR próprio.

**Tarefas** (`docs/tasks/`)

- `marco-3-1-tarefas.md`: 18 tarefas ordenadas (T0 a T17), cada uma com objetivo, cenários C01–C29, arquivos esperados e critério de pronto. Marca as que precisam de banco (T16 e T17, só no CI). Substitui o checklist antigo `s6-identity-implementation-tasks.md`, que agora traz a marca "Substituído" no topo.

Outros documentos: `DELIVERABLES.md` (histórico por semana), `LOG-RED-GREEN-REFACTOR-1/2/3/4.md`, `TESTE-QUE-NAO-PROVA-NADA.md`, `docs/escopo-projeto-final.md`, `docs/rpi/`, `docs/evidencias/`.

## 10. Decisões em aberto mais relevantes

Marco 3.1 (testes de integração em `identity-infra`):

- Ao escrever C09, C11, C12 e C17, criar `libs/identity/infra/jest.integration.config.cts` e declarar o alvo `test-integration` no `project.json` de `identity-infra` (a exclusão de `*.integration.spec.ts` do alvo `test` já está feita). O job de integração pega o novo alvo sozinho.
- Usar `--parallel=1` no passo `nx run-many -t test-integration` do job de integração. Todos os projetos usam o mesmo banco, o `runInBand` só vale dentro de cada projeto e o Nx roda projetos em paralelo. Isso funciona hoje porque cada teste usa uma organização própria, mas índices únicos globais (email de `User`) podem colidir entre projetos.
- Tornar o job Integration (Postgres) obrigatório no `proteger-main` depois de alguns runs estáveis.

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

- **Override do `effect` no `package.json`** (`"effect": "^3.22.1"`, PR #17): corrige uma vulnerabilidade na dependência transitiva trazida pelo Prisma 7.10. Remover o override quando o Prisma 7.x trouxer o `effect` corrigido.
- **`apps/web/next-env.d.ts` é reescrito pelo Next.** O arquivo é versionado, mas `next dev`/`next build` o regravam, deixando o working tree sujo sem mudança real. Não commitar: descartar com `git restore apps/web/next-env.d.ts`.
- **`claude` fora do PATH depois de reconstruir o Codespace.** Se o comando não for encontrado, o binário fica em `/usr/local/share/npm-global/bin`; adicione ao PATH com `export PATH="$PATH:/usr/local/share/npm-global/bin"` (e ao `~/.bashrc` para persistir).
- **`npx jest` na raiz quebra por causa do `apps/web`.** O `jest.config.ts` da raiz reúne os projetos, e o `jest.config.cts` do `web` chama o `next/jest`, que procura `app/` ou `pages/` a partir do diretório atual e falha com "Couldn't find any `pages` or `app` directory". Rode sempre pelo Nx: `npx nx test <projeto>` ou `npm run test`.
- **O Prisma Client gerado não é versionado.** `libs/shared/prisma/src/generated/` é gerado pelo alvo `prisma-generate`. Ao rodar `jest` ou `tsc` direto, sem o Nx, ele pode não existir.
- **Banco só no job de integração do CI:** o CI tem PostgreSQL (service container) apenas no job Integration (Postgres). Localmente (Codespace) continua sem banco, então `test-integration` falha aqui por falta de conexão. Os testes do alvo `test` de `infra` usam delegate Prisma falso com erros reais do Prisma; garantias de índice único e transação só se provam com `*.integration.spec.ts` rodando no CI.
