# Marco 3.1: Tarefas de implementação

**Baseado em:** [spec do Marco 3.1](../specs/marco-3-1-identity-completo.md), [ADR-009](../adrs/adr-009-persistencia-identity-marco-3-1.md), [ADR-003](../adrs/adr-003-identity-repositories.md), [ADR-005](../adrs/adr-005-convite-por-link-com-token.md)  
**Data:** 2026-11-17  
**Substitui:** o checklist de [`s6-identity-implementation-tasks.md`](s6-identity-implementation-tasks.md), que usa nomes e caminhos anteriores à nota de 2026-11-09 do ADR-003 (`IUserRepository`, `adapters/`, unicidade com papel)

Cada tarefa é um ciclo red-green-refactor ou um commit. A ordem segue as dependências: domínio e ports antes dos adapters, model no schema antes do adapter que usa o delegate, migration depois dos models, wiring e integração por último.

**Legenda:**

- **Sem banco:** roda no alvo `test` (local e CI), com delegate Prisma falso e erros reais do Prisma (`P2002`, `P2003`), como no LOG-RED-GREEN-REFACTOR-3.
- **Precisa de banco (só CI):** roda no alvo `test-integration`, provado só no job Integration (Postgres). Localmente não há PostgreSQL.

**Critério de pronto comum a todas as tarefas** (além do específico de cada uma): `npx nx run-many -t lint typecheck` verde, `npm run test:cov` verde com cobertura ≥ 80% por projeto, regras do CLAUDE.md preservadas (domínio sem Node/Nest/Prisma, `organizationId` como invariante, nada importado de `*/infra` em `application`).

---

## Resumo

| # | Letra | Tarefa | Cenários | Banco |
|---|---|---|---|---|
| T0 | a | Comentário de `Organization` e contagens | — | — (feito, PR #12) |
| T1 | b | `UserRepository.findById` | C01, C02 | sem banco |
| T2 | c | `Organization`: model, port e `findById` | C03, C04 | sem banco |
| T3 | c | `OrganizationRepository.save` | C05 (C06 já coberto) | sem banco |
| T4 | d | `Membership`: model, port e `findByOrganization` | C07, C08, C09 (parte sem banco) | sem banco |
| T5 | d | `MembershipRepository.save` e erros | C10, C11 e C12 (parte sem banco) | sem banco |
| T6 | e | `Invitation.create` (caso feliz) | C13 | sem banco |
| T7 | e | `Invitation.create` rejeita dados inválidos | C14, C15 | sem banco |
| T8 | e | `invitation.accept(now)` | C20, C21, C22, C23 | sem banco |
| T9 | e | `invitation.revoke()` | C26, C27 | sem banco |
| T10 | e | Port `TokenHasher` e adapter SHA-256 | — (Decisão 7) | sem banco |
| T11 | e | `Invitation`: model, port e `save` | C16, C17 (parte sem banco) | sem banco |
| T12 | e | `InvitationRepository.findByTokenHash` | C18, C19 | sem banco |
| T13 | f | Migration das tabelas do Marco 3.1 | — (C12: FK `Restrict`) | aplicação provada só no CI |
| T14 | g | Registro no `IdentityInfraModule` | — | sem banco |
| T15 | h | Alvo `test-integration` em `identity-infra` e `--parallel=1` | — | só CI |
| T16 | h | Integração de `Membership` | C09, C11, C12 | **precisa de banco (só CI)** |
| T17 | h | Integração de `Invitation` | C17 | **precisa de banco (só CI)** |

Fora do Marco 3.1 (use cases do 3.2, só rastreabilidade): C24, C25, C28, C29.

**Atenção à ordem do schema:** T2, T4 e T11 acrescentam models ao `schema.prisma` (o Prisma 7 tipa o delegate a partir do client gerado, então o adapter não compila sem o model), e a migration só nasce em T13. Entre T2 e T13 o schema fica à frente das migrations. Por isso T2 a T13 devem entrar na `main` no mesmo PR, ou a estratégia muda para uma migration por tarefa (pergunta em aberto 11 abaixo).

---

## T0 (a): comentário de `Organization` e contagens — feito

- **Objetivo:** atualizar o comentário de `organization.ts` (convite faz parte do Marco 3.1) e as contagens de teste do `AGENT.md`.
- **Cenários:** nenhum.
- **Arquivos:** `libs/identity/domain/src/lib/organization.ts`, `AGENT.md`, `docs/RESUMO_REPO.md`.
- **Pronto:** mergeado no PR #12.

## T1 (b): `UserRepository.findById`

- **Objetivo:** carregar um `User` pelo id, devolvendo `null` quando não existe (M1).
- **Cenários:** C01, C02.
- **Arquivos:**
  - `libs/identity/application/src/lib/ports/user.repository.ts` (método novo no port);
  - `libs/identity/infra/src/lib/user/prisma-user.repository.ts` e `.spec.ts`.
- **Pronto:** C01 e C02 viram testes com os títulos da spec; id inexistente devolve `null` sem lançar erro.

## T2 (c): `Organization`: model, port e `findById`

- **Objetivo:** criar o port `OrganizationRepository` com `findById` (M2) e o adapter Prisma.
- **Cenários:** C03, C04.
- **Arquivos:**
  - `prisma/schema.prisma` (model `Organization`, tabela `organizations`; **sem migration**, ver T13);
  - `libs/identity/application/src/lib/ports/organization.repository.ts` (`ORGANIZATION_REPOSITORY_TOKEN = Symbol(...)`);
  - `libs/identity/infra/src/lib/organization/prisma-organization.repository.ts` e `.spec.ts`.
- **Pronto:** C03 e C04 passam; o adapter devolve a entidade `Organization` (id, name), sem tipo gerado do Prisma no port.

## T3 (c): `OrganizationRepository.save`

- **Objetivo:** persistir uma `Organization` válida e devolvê-la (M3).
- **Cenários:** C05. C06 já é coberto pelos testes de domínio: manter, não duplicar.
- **Arquivos:** port e adapter de T2, com seus `.spec.ts`.
- **Pronto:** C05 passa; `findById` com o mesmo id encontra a organização salva (na tabela falsa).

## T4 (d): `Membership`: model, port e `findByOrganization`

- **Objetivo:** listar os vínculos de uma organização, só dela (M4, invariante 12).
- **Cenários:** C07, C08, C09 (parte sem banco: conferir o `where` recebido pelo delegate, sem checar o próprio fake).
- **Arquivos:**
  - `prisma/schema.prisma` (enum `MembershipRole`, model `Membership` com `@@unique([userId, organizationId])` e FKs `onDelete: Restrict`, ADR-009; **sem migration**);
  - `libs/identity/application/src/lib/ports/membership.repository.ts` (`MEMBERSHIP_REPOSITORY_TOKEN`);
  - `libs/identity/infra/src/lib/membership/prisma-membership.repository.ts` e `.spec.ts`.
- **Pronto:** C07 e C08 passam; o teste de C09 prova que o filtro usa `organizationId`. A garantia real de C09 fica para T16.

## T5 (d): `MembershipRepository.save` e erros

- **Objetivo:** persistir um vínculo e traduzir as falhas do banco (M5).
- **Cenários:** C10, C11 (tradução de `P2002` em `DuplicateMembershipError`), C12 (tradução de `P2003`).
- **Arquivos:**
  - `libs/identity/application/src/lib/errors/duplicate-membership.error.ts` (e o erro de integridade referencial, se for um erro novo: pergunta em aberto 4);
  - port e adapter de T4, com seus `.spec.ts`.
- **Pronto:** C10 passa; `P2002` vira `DuplicateMembershipError`; `P2003` vira o erro decidido. "Nada é gravado" (C11) e a FK real (C12) ficam para T16.

## T6 (e): `Invitation.create` (caso feliz)

- **Objetivo:** criar a entidade `Invitation` imutável com status `PENDING` (M6, M12, M13).
- **Cenários:** C13.
- **Arquivos:**
  - `libs/identity/domain/src/lib/invitation.ts`, `invitation-status.ts` (seção 4 da spec) e o `.spec.ts` correspondente;
  - export no `index.ts` de `identity/domain`.
- **Pronto:** C13 passa; a entidade é congelada (`Object.freeze`), como `Membership`; o domínio continua sem APIs do Node (`types: []` e `...domainLayer` já configurados na lib).

## T7 (e): `Invitation.create` rejeita dados inválidos

- **Objetivo:** recusar convite sem `organizationId`, com email inválido, papel diferente de `STUDENT`, hash vazio ou validade não posterior à criação.
- **Cenários:** C14 (uma tabela de casos, um teste por motivo), C15.
- **Arquivos:** `invitation.ts` e seu `.spec.ts`.
- **Pronto:** C14 e C15 passam com os erros nomeados na spec (`InvalidOrganizationIdError`, `InvalidInvitationError`).

## T8 (e): `invitation.accept(now)`

- **Objetivo:** regras de aceite no domínio, com o relógio passado como argumento (Decisão 8, M10, M11).
- **Cenários:** C20, C21, C22, C23.
- **Arquivos:** `invitation.ts` e seu `.spec.ts` (erros `InvitationExpiredError`, `InvitationAlreadyUsedError`, `InvitationRevokedError`).
- **Pronto:** os quatro cenários passam; aceitar devolve nova instância `ACCEPTED` e o original continua `PENDING`; expirado não muda o status; nenhum `Date.now()` no domínio.

## T9 (e): `invitation.revoke()`

- **Objetivo:** revogar convite pendente (M14).
- **Cenários:** C26, C27 (a spec pede para confirmar C27 ao implementar: pergunta em aberto 9).
- **Arquivos:** `invitation.ts` e seu `.spec.ts`.
- **Pronto:** C26 e C27 passam; revogar devolve nova instância `REVOKED` e o original continua `PENDING`.

## T10 (e): port `TokenHasher` e adapter SHA-256

- **Objetivo:** calcular o SHA-256 do token atrás de um port, para o domínio não depender de crypto do Node (Decisão 7, seção 4 da spec).
- **Cenários:** nenhum cenário BDD; teste do adapter com valor conhecido de SHA-256.
- **Arquivos:**
  - `libs/identity/application/src/lib/ports/token-hasher.port.ts` (nome sugerido, segue `id-generator.port.ts` do `import`), com token de DI;
  - adapter em `libs/identity/infra/src/lib/` com `.spec.ts`.
- **Pronto:** o adapter devolve o hash no formato decidido (pergunta em aberto 6); `application` não importa o adapter.

## T11 (e): `Invitation`: model, port e `save`

- **Objetivo:** persistir o convite gravando só o hash do token (M7, M9).
- **Cenários:** C16, C17 (tradução de `P2002` em `DuplicateInvitationTokenError`).
- **Arquivos:**
  - `prisma/schema.prisma` (enum `InvitationStatus` sem `EXPIRED`, model `Invitation` com `tokenHash @unique` e FK `Restrict`, ADR-009; **sem migration**);
  - `libs/identity/application/src/lib/ports/invitation.repository.ts` (`INVITATION_REPOSITORY_TOKEN`);
  - `libs/identity/application/src/lib/errors/duplicate-invitation-token.error.ts`;
  - `libs/identity/infra/src/lib/invitation/prisma-invitation.repository.ts` e `.spec.ts`.
- **Pronto:** C16 confere o `data` recebido pelo delegate (contém o hash e nenhum campo com o token); `P2002` vira `DuplicateInvitationTokenError`. "Nada é gravado" (C17) fica para T17.

## T12 (e): `InvitationRepository.findByTokenHash`

- **Objetivo:** localizar o convite pelo hash, sem filtrar por status nem validade (M8).
- **Cenários:** C18, C19.
- **Arquivos:** port e adapter de T11, com seus `.spec.ts`; factory de reconstituição da entidade, se decidida (pergunta em aberto 3).
- **Pronto:** C18 devolve a `Invitation` com status, role, organizationId e expiresAt; C19 devolve `null` sem erro.

## T13 (f): migration das tabelas do Marco 3.1

- **Objetivo:** gerar uma migration única para `organizations`, `memberships`, `invitations` e os enums (ADR-009, seção 6).
- **Cenários:** nenhum diretamente; materializa os índices de C11 e C17 e as FKs de C12.
- **Arquivos:** `prisma/migrations/<timestamp>_<nome>/migration.sql`, gerado com `npx prisma migrate diff --from-schema <schema anterior> --to-schema prisma/schema.prisma --script` (sem banco).
- **Pronto:** o SQL tem `UNIQUE` em (`userId`, `organizationId`) e em `tokenHash`, e todas as FKs com `ON DELETE RESTRICT`; nenhuma migration existente foi editada; o job Integration (Postgres) aplica a migration com `prisma migrate deploy` (**aplicação provada só no CI**).

## T14 (g): registro no `IdentityInfraModule`

- **Objetivo:** ligar os ports aos adapters: `UserRepository` (pendente desde a S5), `OrganizationRepository`, `MembershipRepository`, `InvitationRepository` e `TokenHasher`.
- **Cenários:** nenhum.
- **Arquivos:** `libs/identity/infra/src/lib/infra.module.ts` e `infra.module.spec.ts`.
- **Pronto:** o módulo resolve cada token para o adapter certo; o comentário "Vazio até existir o primeiro use case" é atualizado.

## T15 (h): alvo `test-integration` em `identity-infra` e `--parallel=1`

- **Objetivo:** preparar `identity-infra` para testes contra PostgreSQL real.
- **Cenários:** nenhum.
- **Arquivos:**
  - `libs/identity/infra/jest.integration.config.cts` (mesmo formato de `import-infra`);
  - `libs/identity/infra/project.json` (alvo `test-integration`; padrões vêm de `targetDefaults`);
  - `.github/workflows/ci.yml` (`npx nx run-many -t test-integration --parallel=1`).
- **Pronto:** `npx nx show projects --with-target test-integration` lista `identity-infra`; o alvo `test` continua ignorando `*.integration.spec.ts`; o job de integração continua não obrigatório.

## T16 (h): integração de `Membership` — precisa de banco (só CI)

- **Objetivo:** provar no PostgreSQL as garantias de `Membership`.
- **Cenários:** C09 (não vaza outra organização), C11 (duplicada é recusada e nada é gravado), C12 (FK recusa User ou Organization inexistente).
- **Arquivos:** `libs/identity/infra/src/lib/membership/prisma-membership.repository.integration.spec.ts`.
- **Pronto:** passa no job Integration (Postgres). Cada execução usa ids e emails próprios (`randomUUID`) e apaga o que criou, respeitando a ordem imposta pelo `Restrict` (vínculos antes de usuários e organizações).

## T17 (h): integração de `Invitation` — precisa de banco (só CI)

- **Objetivo:** provar no PostgreSQL a unicidade do hash do token.
- **Cenários:** C17 (token repetido é recusado e nada é gravado).
- **Arquivos:** `libs/identity/infra/src/lib/invitation/prisma-invitation.repository.integration.spec.ts`.
- **Pronto:** passa no job Integration (Postgres), com a mesma disciplina de dados de T16.

---

## Perguntas em aberto que bloqueiam tarefas

As perguntas 1 a 10 estão no [ADR-009](../adrs/adr-009-persistencia-identity-marco-3-1.md#decisões-em-aberto). Esta tarefa acrescenta:

11. **Uma migration para o grupo × uma por tarefa:** com a migration única em T13, T2 a T13 precisam entrar na `main` juntas. A alternativa é cada tarefa de model (T2, T4, T11) trazer a própria migration. Qual das duas?

| Tarefa | Depende das perguntas |
|---|---|
| T4 | 1 (índice em `organizationId`) |
| T5 | 4 (erro do `P2003`) |
| T7 | 5 (normalização do email) |
| T9 | 9 (C27) |
| T10 | 6 (formato do hash), 7 (gerador do token) |
| T11 | 1, 2 (enum do papel), 6, 10 (colunas de auditoria) |
| T12 | 3 (reconstituição de `Invitation`) |
| T13 | 8 (FK de `draft_questions`), 11 |
