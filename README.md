# StudyForge

> Plataforma de estudos para criação, edição, publicação e execução de simulados,
> construída a partir de material fornecido pelo mentor em formatos variados.

Status: **Etapa 2 concluída** (Marcos 2.1–2.6: fluxo `DraftQuestion` ponta a ponta e contexto `identity` scaffoldado). **Etapa 3 (MVP 1) é a próxima**; o Marco 3.1 está parcial (`UserRepository` com `findByEmail` e `save`).

---

## 1. Contexto e problema

O projeto nasce da experiência real de mentoria voluntária em uma escola de formação
para certificações AWS. A criação de simulados hoje é manual e não existe uma
plataforma que permita transformar material de estudo — em diferentes formatos —
em simulados interativos sem forçar o conteúdo a um formato rígido de entrada.

## 2. Visão do produto

Uma plataforma onde o mentor fornece conteúdo em formatos variados (inicialmente
por modelo estruturado (JSON e Markdown), com um modelo para baixar e preencher;
futuramente PDF e DOCX que sigam esse modelo), e o sistema transforma esse
material em uma estrutura de questões editável — sempre revisável pelo mentor antes
de qualquer publicação.

O estudante responde aos simulados publicados e acompanha seus resultados. O mentor
cria, revisa, configura e publica simulados dentro de uma organização.

No médio/longo prazo, a mesma base evolui para cursos, trilhas de estudo,
certificados e acompanhamento de progresso.

## 3. Princípios

- **AWS é o primeiro contexto de uso, não o domínio estrutural do sistema.** O núcleo
  de domínio (quiz, questão, tentativa) é genérico e não conhece "certificação AWS"
  como conceito de primeira classe.
- **Novos formatos de entrada não devem exigir reescrever o núcleo de quizzes.**
  Importação de material é um módulo plugável, separado do domínio de quiz.
- **Nada de complexidade prematura.** O backend começa como uma aplicação modular,
  organizada dentro de um monorepo Nx, sem microserviços, filas ou múltiplos bancos
  nesta fase.
- **Revisão humana é obrigatória.** Nenhum conteúdo gerado automaticamente (heurística
  ou IA) é publicado sem passar pela revisão explícita do mentor.
- **Multi-tenancy desde o início.** Todo recurso pertencente a uma organização
  (material, quiz, tentativa, curso etc.) pertence a uma organização desde o modelo
  inicial. `User` representa a identidade global e se relaciona às organizações por
  `Membership`.

## 4. Arquitetura-alvo (aprovada)

Camadas conceituais, independentemente de app/lib física:

```
                    ┌───────────────┐
                    │   Interface   │
                    │  Web / API    │
                    └───────┬───────┘
                            ↓
                    ┌───────────────┐
                    │  Application  │
                    │   Use Cases   │
                    └───────┬───────┘
                            ↓
                    ┌───────────────┐
                    │     Domain    │
                    │  Quiz / User  │
                    └───────┬───────┘
                            ↑
              ┌─────────────┴─────────────┐
              │                           │
        Import / Infra              Database / Auth
```

Importadores, banco, autenticação e outros serviços externos implementam portas
usadas pela camada de aplicação; o domínio permanece independente dessas
tecnologias.

- O núcleo de domínio de quiz **não conhece** a origem do conteúdo (PDF, texto
  colado, IA etc.) nem detalhes de persistência ou autenticação — essas
  dependências são invertidas via portas declaradas em `application`.
- A ingestão produz um formato intermediário (`DraftQuestion`) que passa por revisão
  antes de virar uma `Question` oficial do domínio de quiz.
- `quiz` e `import` nunca dependem um do outro diretamente — comunicam-se apenas via
  contratos compartilhados (DTOs).

### 4.1 Monorepo (Nx) — Estado Atual

```
studyforge/
├── apps/
│   ├── api/            # NestJS (com ZodValidationPipe, POST /api/draft-questions)
│   ├── api-e2e/
│   ├── web/            # Next.js (App Router, sem acesso a libs de domínio)
│   └── web-e2e/
├── libs/
│   ├── shared/
│   │   ├── domain/      # kernel comum (EntityId, OrganizationId, Result, DomainError, Alternative, QuestionType)
│   │   ├── contracts/   # DTOs/Zod schemas (CreateDraftQuestionCommandSchema)
│   │   └── prisma/      # PrismaService centralizado
│   ├── identity/        # ✅ NOVO (Etapa 2, Marco 2.6)
│   │   ├── domain/      # User (com createdAt), Organization, Membership, MembershipRole
│   │   ├── application/ # port UserRepository, DuplicateEmailError (use cases na Etapa 3)
│   │   └── infra/       # PrismaUserRepository (ainda não registrado no IdentityInfraModule)
│   ├── quiz/            # ⏳ TODO (Etapa 3)
│   │   ├── domain/
│   │   ├── application/
│   │   └── infra/
│   └── import/          # ✅ Marcos 2.2–2.5
│       ├── domain/      # DraftQuestion, Alternative, QuestionType
│       ├── application/ # CreateDraftQuestionUseCase, ports (IdGenerator, DraftQuestionRepository)
│       └── infra/       # CryptoIdGeneratorAdapter, PrismaDraftQuestionRepository, ImportInfraModule
├── prisma/
│   ├── schema.prisma    # models: User, DraftQuestion, Alternative; Prisma 7.10 + pg adapter
│   └── migrations/      # 20261001231755_init, 20261109190000_create_users
├── prisma.config.ts     # DATABASE_URL via env (na raiz do repositório)
└── nx.json
```

**Estrutura-alvo:** adicionar `quiz` (domain + application + infra) na Etapa 3 e `course` na Etapa 4.

### 4.2 Fronteiras protegidas

1. `web` só depende de `shared/contracts` — nunca de domínio/aplicação/infra do backend.
2. `domain` não depende de nada (sem framework, sem Nest, sem Prisma).
3. `application` depende do `domain` do próprio contexto e pode depender de
   `shared/domain`/`shared/contracts` para atravessar fronteiras; declara *ports*
   e nunca importa implementações concretas de `infra`. Inversão de dependência:
   `infra → application`.
4. `quiz` e `import` nunca dependem um do outro — só via `shared/contracts`.
5. `shared/contracts` não contém lógica de negócio, apenas tipos/DTOs/validação.
6. Todo recurso pertencente a uma organização (`Quiz`, `DraftQuestion`, `Attempt`,
   `Material`, `Course` etc.) carrega `organizationId` como invariante de domínio,
   não como filtro opcional de query. `User` é a exceção: é a identidade global do
   usuário e se relaciona a organizações via `Membership` (ver seção 6.1).
7. Nenhum fluxo automatizado (IA, importer) publica conteúdo diretamente — publicação
   é uma ação explícita do mentor, modelada como use case próprio.
8. Controllers são "burros": recebem DTO validado, chamam use case, mapeiam saída.
   Nenhuma regra de negócio vive em controller.

Essas fronteiras são reforçadas via tags do Nx (`type:*`, `scope:*`) e
`enforce-module-boundaries` no ESLint.

## 5. Domínio: tipos de questão (MVP)

- `SINGLE_CHOICE`: 4 alternativas (A–D), exatamente 1 correta e 3 incorretas.
- `MULTIPLE_CHOICE`: 5 alternativas (A–E), exatamente 2 corretas e 3 incorretas.

Não implementados neste momento: dissertativa, verdadeiro/falso.

## 6. Multi-tenancy

- Mentor cria uma organização.
- Todo acesso a dados respeita o vínculo do usuário com a organização.
- Entrada em uma organização é por convite com link (ver [ADR-005](docs/adrs/adr-005-convite-por-link-com-token.md)): o professor gera o convite e o aluno aceita após autenticar com Google OAuth, o que cria a `Membership`.

### 6.1 Modelo conceitual

`User` representa a identidade global do usuário e **não carrega `organizationId`
diretamente**. O vínculo com uma ou mais organizações é modelado por `Membership`:

```
User
  │
  └── Membership ──▶ Organization
```

Recursos que pertencem a uma organização (`Quiz`, `DraftQuestion`, `Attempt`,
`Material`, `Course`, entre outros) carregam `organizationId` como invariante do
próprio recurso — não como um atributo herdado do usuário. Isso permite que um
mesmo `User` participe de múltiplas organizações (ex.: mentor em uma escola e
estudante em outra) sem ambiguidade no modelo de dados.

## 7. Stack

| Camada | Escolha |
|---|---|
| Monorepo | Nx |
| Backend | NestJS (use cases como *interactors*, ports como interfaces) |
| Frontend | Next.js (App Router) |
| Banco | PostgreSQL |
| ORM | Prisma |
| Contratos/validação | Zod (`shared/contracts`) |
| Autenticação | Google OAuth |
| Importação de conteúdo | Modelo estruturado (JSON e Markdown) validado com Zod, sem IA paga, via port `QuestionImporter`. A porta pode ganhar adaptadores de PDF/DOCX depois do MVP 1 (ver [ADR-004](docs/adrs/adr-004-importacao-por-modelo-estruturado.md)) |
| Testes | Jest |

## 8. Roadmap por etapas

**Etapa 1 — Fundação documental** *(concluída)*
`README.md`, `CLAUDE.md`, `AGENT.md` revisados antes de qualquer código.

**Etapa 2 — Primeiro artefato** *(concluída)*
Criação do monorepo Nx e implementação do menor fluxo que valida a arquitetura de
ponta a ponta: texto estruturado → `DraftQuestion` → persistência → consulta.

- Marco 2.1 — infraestrutura do monorepo (Nx, `api`, `web`, Prisma) *(concluído)*
- Marco 2.2 — domínio mínimo (`shared/domain` e `import/domain`) *(concluído)*
- Marco 2.3 — application layer: ports, use cases, contratos Zod *(concluído)*
- Marco 2.4 — infra: PrismaDraftQuestionRepository, CryptoIdGeneratorAdapter, módulos NestJS *(concluído)*
- Marco 2.5 — API REST: ZodValidationPipe, POST /api/draft-questions, testes e2e *(concluído)*
- Marco 2.6 — contexto `identity`: User, Organization, Membership, MembershipRole (domínio scaffoldado) *(concluído)*

**Etapa 3 — MVP 1** *(próxima)*
Implementação das camadas application e infra dos contextos, importação por modelo
estruturado, publicação e execução de quiz.

- Marco 3.1: fechar `identity` (`findById`, `OrganizationRepository`, `MembershipRepository`, entidade `Invitation`, migrations) e registrar os repositórios no `IdentityInfraModule` *(parcial: `UserRepository` com `findByEmail` e `save`)*
- Marco 3.2: autenticação (Google OAuth) e fluxo de convite por link
- Marco 3.3: importação por modelo estruturado (`JsonImporter` e `MarkdownImporter`, modelo para download, erros de validação por questão)
- Marco 3.4: contexto `quiz` (scaffold + domain: Quiz, Question, Attempt, Answer)
- Marco 3.5: publicação (`DraftQuestion` aprovado vira `Question`, ação explícita do mentor)
- Marco 3.6: execução pelo aluno (responder e calcular resultado)

**Etapa 4 — Cursos e novos formatos** *(planejada)*
- Contexto `course` (scaffold + domain models), fora do MVP 1 porque nenhum fluxo do MVP depende dele (ver [ADR-006](docs/adrs/adr-006-course-fora-do-mvp1.md)).
- Importers de PDF e DOCX (candidatas gratuitas: `pdfjs-dist` ou `pdf-parse`, e `mammoth`), só para materiais que sigam o modelo estruturado.
- Organização pessoal, visibilidade e moderação ([ADR-007](docs/adrs/adr-007-organizacao-pessoal-visibilidade-e-moderacao.md)), a implementar depois do Marco 3.5.

## 9. Decisões

### Decisões fechadas

- **Sem IA paga:** a importação usa modelo estruturado (JSON/Markdown) validado com Zod; quem quiser pode pedir a uma IA externa que preencha o modelo. [ADR-004](docs/adrs/adr-004-importacao-por-modelo-estruturado.md)
- **Importers de PDF e DOCX:** ficam para depois do MVP 1 (Etapa 4), só para materiais que sigam o modelo. [ADR-004](docs/adrs/adr-004-importacao-por-modelo-estruturado.md)
- **Entrada em organização:** convite por link com token e `Invitation`; no MVP o professor copia e envia o link, e o envio automático de email fica para depois. [ADR-005](docs/adrs/adr-005-convite-por-link-com-token.md)
- **Contexto `course`:** sai do MVP 1 e vai para a Etapa 4. [ADR-006](docs/adrs/adr-006-course-fora-do-mvp1.md)
- **Organização pessoal, visibilidade e moderação:** todo usuário tem organização pessoal automática; simulados são `PRIVATE`, `UNLISTED` ou `PUBLIC`; o admin da plataforma (`platformRole` no `User`) modera. Depois do Marco 3.5. [ADR-007](docs/adrs/adr-007-organizacao-pessoal-visibilidade-e-moderacao.md)

### Decisões em aberto

Nenhuma no momento.

## 📋 Documentação de Atividades

Ver **[DELIVERABLES.md](./DELIVERABLES.md)** para histórico completo:
- **Semanas 1 a 8 (S1–S8):** entregues ✅, exceto a Semana 7 (3 specs de quiz), que segue como está no DELIVERABLES.md (🔄 planejada)
- **Marco 3.1:** parcial 🔄 (Semana 8)
- **Marcos 3.2–3.6:** planejados ⏳

Inclui:
- Status de cada entregável
- Localização de arquivos
- Como testar
- Commits relacionados