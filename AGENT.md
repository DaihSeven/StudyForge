# AGENT.md

Instruções operacionais para qualquer agente de codificação (Claude Code, ou
outro) que trabalhe neste repositório. Este arquivo foca em *como executar
tarefas* no repositório; para regras de arquitetura e domínio, ver `CLAUDE.md`
e `README.md`.

`AGENT.md` complementa o `CLAUDE.md`. Em caso de conflito, as decisões
específicas registradas no `CLAUDE.md` e no `README.md` prevalecem.

## 1. Estado atual do repositório

O projeto está na **Etapa 2 — Primeiro artefato**, com o **Marco 2.1**
(infraestrutura do monorepo) e o **Marco 2.2** (domínio mínimo) concluídos.
Existe hoje:

- monorepo Nx 23 inicializado;
- `apps/api` (NestJS 11) e `apps/web` (Next.js 16, App Router), ambos ainda com
  o scaffold padrão gerado pelo Nx e sem acesso direto a nenhuma lib;
- `libs/shared/domain` (`shared-domain`, tags `scope:shared`, `type:domain`):
  `DomainError`, `OrganizationId`, `Alternative`, `QuestionType` e as regras
  estruturais por tipo (`QUESTION_TYPE_RULES`);
- `libs/import/domain` (`import-domain`, tags `scope:import`, `type:domain`):
  `DraftQuestion`, que depende apenas de `shared-domain`;
- Prisma 7 configurado (`prisma/schema.prisma` + `prisma.config.ts`), provider
  PostgreSQL, sem models e sem migrations;
- lint, testes (Jest) e build funcionando para todos os projetos.

Não existe ainda:

- `libs/quiz/domain`, libs de aplicação/infra e `shared/contracts`;
- nenhum use case, repositório, controller ou endpoint do StudyForge;
- nenhum model Prisma nem banco de dados real conectado (`DATABASE_URL` só em
  `.env.example`).

## 2. Como este repositório evolui

O desenvolvimento segue três etapas definidas pelo responsável do projeto:

1. **Etapa 1 — Fundação documental**: apenas `README.md`, `CLAUDE.md`, `AGENT.md`.
2. **Etapa 2 — Primeiro artefato**: monorepo Nx + fluxo mínimo (texto estruturado
   → `DraftQuestion` → persistência → consulta), validando a arquitetura de ponta
   a ponta.
3. **Etapa 3 — MVP 1**: importação/extração automatizada, revisão do mentor,
   criação/publicação de quiz, política de feedback, resposta do estudante e
   resultado.

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

## 6. Referências

- Visão de produto, princípios, arquitetura-alvo e roadmap: `README.md`
- Regras de arquitetura e convenções de código: `CLAUDE.md`