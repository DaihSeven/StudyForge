# AGENT.md

Instruções operacionais para qualquer agente de codificação (Claude Code, ou
outro) que trabalhe neste repositório. Este arquivo foca em *como executar
tarefas* no repositório; para regras de arquitetura e domínio, ver `CLAUDE.md`
e `README.md`.

`AGENT.md` complementa o `CLAUDE.md`. Em caso de conflito, as decisões
específicas registradas no `CLAUDE.md` e no `README.md` prevalecem.

## 1. Estado atual do repositório

O projeto está na **Etapa 2 — Primeiro artefato**, com os **Marcos 2.1–2.5**
concluídos e o contexto `identity` scaffoldado (domínio completo com 21 testes;
application e infra com o `UserRepository`, o `PrismaUserRepository` e o model `User`;
restante de application/infra do `identity` ainda por fazer). Existe hoje:

- monorepo Nx 23 com 11 projetos
- `apps/api` (NestJS 11): ZodValidationPipe, POST /api/draft-questions endpoint com validação Zod
- `apps/web` (Next.js 16, App Router): scaffold padrão, sem dependências de domínio
- **shared (kernel)**:
  - `libs/shared/domain`: EntityId, OrganizationId, Result, DomainError, Alternative, QuestionType, regras por tipo
  - `libs/shared/contracts`: Zod schemas (CreateDraftQuestionCommandSchema)
  - `libs/shared/prisma`: PrismaService centralizado (Prisma 7.10 + pg adapter)
- **import context** (Marcos 2.2–2.5):
  - `libs/import/domain`: DraftQuestion, Alternative, regras de validação
  - `libs/import/application`: CreateDraftQuestionUseCase, ports (IdGenerator, DraftQuestionRepository)
  - `libs/import/infra`: CryptoIdGeneratorAdapter, PrismaDraftQuestionRepository, ImportInfraModule
- **identity context** (Marco 2.6, novo):
  - `libs/identity/domain`: User, Organization, Membership, MembershipRole (21 testes, sem organizationId em User)
  - `libs/identity/application`: port `UserRepository` e `DuplicateEmailError` (use-cases/ ainda vazio)
  - `libs/identity/infra`: `PrismaUserRepository` (ainda não registrado no `IdentityInfraModule`, que segue vazio)
- Prisma 7.10 com schema: models User, DraftQuestion (com alternativas compostas) e Alternative
- Migrações criadas: 20261001231755_init, 20261109190000_create_users
- ESLint: regras scope (shared, import, identity, api, web) e type (domain, application, infra, contracts)
- 108 testes (shared-domain 26, import-domain 31, identity-domain 21, mais 30 de application/infra/api)
- lint, test, build funcionando para todos os projetos
- skill `bounded-context-scaffolder` criada (gera novo bounded context com estrutura + proteções)

Não existe ainda:

- `libs/quiz/domain`, `libs/quiz/application`, `libs/quiz/infra` (Etapa 3)
- `libs/course/domain`, `libs/course/application`, `libs/course/infra` (Etapa 3)
- Restante das camadas application e infra do contexto `identity` (ports e adapters de Organization, Membership e Invitation — Etapa 3)
- Prisma models `Organization`, `Membership` e `Invitation` (Etapa 3; o model `User` já existe)
- Endpoints para `identity` (criar organização, criar usuário, gerenciar membership)
- Autenticação/autorização (OAuth, JWT) — identity context isolado, sem login ainda
- Importadores de PDF/DOCX (apenas texto estruturado em POST /api/draft-questions por enquanto)
- Importação por modelo estruturado JSON/Markdown via port QuestionImporter (ver ADR-004), ainda não implementada
- Quiz: criação, publicação, execução, resultado do estudante (Etapa 3)
- Banco de dados real conectado (`DATABASE_URL` em `.env.local` com Neon ou local PostgreSQL)

## 2. Como este repositório evolui

O desenvolvimento segue três etapas definidas pelo responsável do projeto:

1. **Etapa 1 — Fundação documental**: apenas `README.md`, `CLAUDE.md`, `AGENT.md`.
2. **Etapa 2 — Primeiro artefato**: monorepo Nx + fluxo mínimo (texto estruturado
   → `DraftQuestion` → persistência → consulta), validando a arquitetura de ponta
   a ponta.
3. **Etapa 3 — MVP 1**: importação/extração automatizada, revisão do mentor,
   criação/publicação de quiz, política de feedback, resposta do estudante e
   resultado.

Marcos dentro de uma etapa representam progressos coesos e devem ser commitados
isoladamente.

Um agente não deve pular etapas nem antecipar trabalho de etapas futuras sem
instrução explícita do responsável do projeto.

## 3. Comandos

Não há scripts em `package.json`; todos os comandos passam pelo Nx (`npx nx`).

```bash
# Setup (instalação reprodutível a partir do lockfile)
npm ci

# Checks em todos os projetos
npx nx run-many -t lint test build

# Por projeto (<projeto>: api, web, shared-domain, import-domain)
npx nx lint <projeto>
npx nx test <projeto>
npx nx build <projeto>     # nas libs de domínio, compila com `lib: es2022` e `types: []`, sem tipos de Node/DOM

# Testes de domínio (sem banco)
npx nx test shared-domain
npx nx test import-domain

# Grafo de dependências entre projetos
npx nx graph

# Execução local
PORT=3333 npx nx serve api   # http://localhost:3333/api (sem PORT, usa 3000)
npx nx dev web               # http://localhost:3000

# Testes de integração (com banco PostgreSQL real)
npx nx run import-infra:test-integration

# Testes de um bounded context específico
npx nx run identity-domain:test
npx nx run import-application:test

# Gerar novo bounded context (via Claude Code)
# Invocar skill: "Using the Bounded Context Scaffolder skill, scaffold a new bounded context called 'quiz'"
# Skill gera 3 libs (domain/application/infra) com proteções (types: [], domainLayer)

# Prisma (não requer banco para validar o schema)
npx prisma validate
```

Os install scripts de dependências nativas (Prisma, SWC, Nx, sharp etc.) estão
aprovados no campo `allowScripts` do `package.json`. Novas dependências com
install scripts precisam ser aprovadas explicitamente
(`npm install-scripts approve <pkg>`).

Este arquivo deve ser atualizado sempre que novos comandos reais existirem — não
inventar comandos hipotéticos.

## 4. Convenções de commit e mudanças

- Cada etapa do roadmap deve corresponder a um conjunto coeso de mudanças,
  revisável isoladamente.
- Mudanças que alterem uma fronteira arquitetural (ver `CLAUDE.md`, seção
  "Regras não negociáveis") devem ser explicadas antes de implementadas, mesmo
  que pequenas.
- Não introduzir dependências novas (bibliotecas, serviços externos, provedores
  de IA) sem que isso esteja explicitamente decidido no `README.md` ou aprovado
  na conversa com o responsável do projeto.

## 5. Checklist antes de propor código

Um agente que for gerar código neste repositório deve, antes de escrever
qualquer arquivo:

- [ ] Confirmar em qual etapa do roadmap a tarefa se encaixa.
- [ ] Confirmar que a mudança respeita as fronteiras de `libs/*/domain`,
      `libs/*/application`, `libs/*/infra` descritas em `CLAUDE.md`.
- [ ] Confirmar que `scope:quiz` e `scope:import` não estão sendo acoplados
      diretamente.
- [ ] Confirmar que nenhum recurso pertencente a uma organização (`Quiz`,
      `DraftQuestion`, `Attempt`, `Material`, `Course` etc.) está sendo criado sem
      `organizationId` — lembrando que `User` é a exceção (relaciona-se a
      organizações via `Membership`, ver `README.md`, seção 6.1).
- [ ] Confirmar que nenhum fluxo automatizado está publicando conteúdo sem
      revisão do mentor.
- [ ] Confirmar que a mudança respeita as regras de tagging do Nx (`scope:*` e
      `type:*`) e não viola `enforce-module-boundaries` do ESLint.
- [ ] Confirmar que skill `bounded-context-scaffolder` pode ser usada para gerar
      novo bounded context, se aplicável (nunca criar lib manualmente se há skill).

## 6. Referências

- Visão de produto, princípios, arquitetura-alvo e roadmap: `README.md`
- Regras de arquitetura e convenções de código: `CLAUDE.md`