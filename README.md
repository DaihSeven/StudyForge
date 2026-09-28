# StudyForge

> Plataforma de estudos para criação, edição, publicação e execução de simulados,
> construída a partir de material fornecido pelo mentor em formatos variados.

Status: **Etapa 2 — Primeiro artefato.** Marco 2.1 concluído.

---

## 1. Contexto e problema

O projeto nasce da experiência real de mentoria voluntária em uma escola de formação
para certificações AWS. A criação de simulados hoje é manual e não existe uma
plataforma que permita transformar material de estudo — em diferentes formatos —
em simulados interativos sem forçar o conteúdo a um formato rígido de entrada.

## 2. Visão do produto

Uma plataforma onde o mentor fornece conteúdo em formatos variados (inicialmente
texto colado; futuramente PDF, JSON e documentos), e o sistema transforma esse
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

### 4.1 Monorepo (Nx)

```
studyforge/
├── apps/
│   ├── api/            # NestJS
│   ├── api-e2e/
│   ├── web/             # Next.js
│   └── web-e2e/
├── libs/
│   ├── shared/
│   │   ├── domain/      # kernel comum (EntityId, OrganizationId, Result, DomainError)
│   │   ├── contracts/    # DTOs/enums que cruzam fronteiras (Zod)
│   │   └── util/
│   ├── identity/
│   │   ├── domain/       # Organization, User, Membership, Role
│   │   ├── application/  # use cases + ports
│   │   └── infra/        # Prisma, Google OAuth
│   ├── quiz/
│   │   ├── domain/       # Quiz, Question, AlternativeOption, FeedbackPolicy, Attempt, Answer
│   │   ├── application/  # use cases + ports
│   │   └── infra/        # Prisma
│   └── import/
│       ├── domain/       # DraftQuestion, ImportSource, ExtractionConfidence
│       ├── application/  # use cases + ports (ContentImporter, AiQuestionExtractor)
│       └── infra/
│           ├── pasted-text/
│           └── ai-extraction/
├── prisma/
└── nx.json
```

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

- Mentor pode criar uma organização ou escolher uma existente.
- Estudante pode escolher uma organização disponível para participar.
- Todo acesso a dados respeita o vínculo do usuário com a organização.
- Detalhes de convite, aprovação ou código de entrada: a definir futuramente.

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
| Extração de conteúdo (IA) | Abstraída via port `AiQuestionExtractor`; provedor (Claude/OpenAI/Gemini/Mistral) é decisão de infraestrutura, ainda em aberto |
| Testes | Jest |

## 8. Roadmap por etapas

**Etapa 1 — Fundação documental** *(concluída)*
`README.md`, `CLAUDE.md`, `AGENT.md` revisados antes de qualquer código.

**Etapa 2 — Primeiro artefato** *(atual — Marco 2.1 concluído)*
Criação do monorepo Nx e implementação do menor fluxo que valida a arquitetura de
ponta a ponta: texto estruturado → `DraftQuestion` → persistência → consulta.

**Etapa 3 — MVP 1**
Evolução para: importação/extração automatizada (IA), revisão do mentor, criação e
publicação de quiz, configuração de política de feedback, resposta do estudante e
cálculo de resultado.

## 9. Decisões em aberto

- Provedor concreto de IA para `AiQuestionExtractor` (comparação futura entre Claude,
  OpenAI, Gemini e Mistral por qualidade, capacidade de processar documentos, custo
  por token e uso em volume).
- Fluxo de convite/aprovação/código de entrada para organizações.
- Momento de priorizar importers de PDF e DOCX (posterior ao MVP 1).