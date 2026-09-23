# AGENT.md

Instruções operacionais para qualquer agente de codificação (Claude Code, ou
outro) que trabalhe neste repositório. Este arquivo foca em *como executar
tarefas* no repositório; para regras de arquitetura e domínio, ver `CLAUDE.md`
e `README.md`.

`AGENT.md` complementa o `CLAUDE.md`. Em caso de conflito, as decisões
específicas registradas no `CLAUDE.md` e no `README.md` prevalecem.

## 1. Estado atual do repositório

O projeto está na **Etapa 1 — Fundação documental**. Não existe ainda:

- monorepo Nx inicializado;
- aplicações (`api`, `web`);
- libs de domínio/aplicação/infra;
- banco de dados ou schema Prisma;
- dependências de runtime instaladas.

Comandos de setup, build, lint e teste **ainda não se aplicam** e serão
adicionados a este arquivo assim que o monorepo Nx for criado (Etapa 2). Até lá,
qualquer agente que for solicitado a "rodar o projeto" deve informar que o
projeto ainda não tem código executável.

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

O projeto ainda não possui comandos executáveis definidos. Eles serão
documentados nesta seção na Etapa 2, após a criação do monorepo Nx — cobrindo ao
menos setup, build, lint, testes, e execução de `api` (NestJS) e `web`
(Next.js).

Este arquivo deve ser atualizado assim que os comandos reais existirem — não
inventar comandos hipotéticos antes disso.

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