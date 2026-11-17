# ADR-009: Persistência do contexto `identity` no Marco 3.1

**Date:** 2026-11-17  
**Status:** Proposed  
**Decision Maker:** Responsável do projeto (aprovação pelo merge deste ADR)  
**Affected By:** Marco 3.1, contexto `identity`, `prisma/schema.prisma`, `prisma/migrations/`, job Integration (Postgres) do CI  

---

## Title

Models Prisma `Organization`, `Membership` e `Invitation`, chaves estrangeiras `Restrict`, token de convite guardado só como hash, estratégia de migration e testes de integração do `identity-infra`.

---

## Status

**Proposed**: registra como as decisões já fechadas da [spec do Marco 3.1](../specs/marco-3-1-identity-completo.md) (seção 7) chegam ao banco. Não cria decisão de produto nova. O que a spec não fixa está em "Decisões em aberto", sem resposta. Este ADR é só documentação: nenhum código, model ou migration é criado por ele.

---

## Context

Hoje o banco tem `draft_questions`, `alternatives` e `users` (migrations `20261001231755_init` e `20261109190000_create_users`). O domínio de `identity` já tem `User`, `Organization`, `Membership` e `MembershipRole`, mas só `User` tem model e repositório.

A spec do Marco 3.1 pede `OrganizationRepository`, `MembershipRepository`, a entidade `Invitation` com `InvitationRepository` e os models e a migration correspondentes (seção 1.2). Ela fecha as regras (Decisões 1 a 10), mas não descreve o schema. Este ADR liga as regras ao schema, para que a implementação não decida isso no meio de um ciclo red-green-refactor.

Restrições:

- ADR-003: repositórios são ports em `identity/application` e adapters Prisma em `identity/infra`, sem vazar tipos gerados do Prisma.
- CLAUDE.md regra 6: `Membership` e `Invitation` carregam `organizationId` como invariante. `User` não carrega.
- ADR-005: o banco nunca guarda o token do convite em texto puro.
- Ambiente local sem PostgreSQL. Garantias de índice único, FK e "nada é gravado" só se provam no job Integration (Postgres) do CI (PR #11).

---

## Decision

### 1. Models novos

Campos derivados das entidades de domínio existentes (`Organization`, `Membership`) e da spec (`Invitation`, M6 e Decisões 1 a 3, 6 e 7). Tabelas seguem a convenção atual (`@@map` em snake_case no plural, como `users` e `draft_questions`).

| Model | Tabela | Campos | Origem |
|---|---|---|---|
| `Organization` | `organizations` | `id` (PK), `name` | `organization.ts` (a spec segue o código: sem `createdAt`, conflito 4 da seção 8) |
| `Membership` | `memberships` | `id` (PK), `userId` (FK → `users`), `organizationId` (FK → `organizations`), `role` | `membership.ts` (a entidade tem `id` próprio) |
| `Invitation` | `invitations` | `id` (PK), `organizationId` (FK → `organizations`), `email`, `role`, `tokenHash`, `status`, `createdAt`, `expiresAt` | spec M6, M7, M12, M13 |

Enums:

| Enum | Valores | Observação |
|---|---|---|
| `MembershipRole` | `MENTOR`, `STUDENT` | espelha `MembershipRole` de `identity/domain` |
| `InvitationStatus` | `PENDING`, `ACCEPTED`, `REVOKED` | **sem `EXPIRED`** (Decisão 3) |

### 2. Índices únicos

- `Membership`: `@@unique([userId, organizationId])`. Um papel por organização no MVP (Decisão 4, invariante 11). O papel **não** entra na chave. Substitui a invariante 5 da S5.
- `Invitation`: `tokenHash @unique` (invariante 7, M9).

A violação desses índices chega ao adapter como `P2002` e é traduzida em `DuplicateMembershipError` e `DuplicateInvitationTokenError` (`identity/application/src/lib/errors/`), como o `PrismaUserRepository` já faz com `DuplicateEmailError`.

### 3. Chaves estrangeiras: `onDelete: Restrict` em todas

`Membership.userId`, `Membership.organizationId` e `Invitation.organizationId` usam `onDelete: Restrict` (Decisão 9). Não há `Cascade` nem `SetNull`. Apagar um `User` ou uma `Organization` que tenha vínculos ou convites é recusado pelo banco. Os ports não têm `delete`, então isso é propriedade da migration, não de cenário de repositório (C12). Gravar uma `Membership` com `userId` ou `organizationId` inexistente gera `P2003` (C12).

### 4. Token do convite: só o hash

- O token tem 32 bytes aleatórios e vai só no link entregue ao mentor (Decisão 7).
- O banco guarda apenas `tokenHash`, o **SHA-256** do token. Não existe coluna com o token em texto puro (C16).
- O hash é calculado pelo use case através do port `TokenHasher` (`identity/application`), implementado em `identity/infra` com o crypto do Node. O domínio `Invitation` recebe o hash pronto e continua TypeScript puro (CLAUDE.md regra 2).
- `findByTokenHash` busca pelo hash e **não** filtra por status nem validade (M8): quem decide é o domínio.

### 5. `EXPIRED` é calculado

`status` persiste só `PENDING`, `ACCEPTED` e `REVOKED`. Um convite está expirado quando está `PENDING` e `now >= expiresAt`, com `now` passado como argumento (`accept(now)`, C20). Expirar um convite não grava nada e não muda o status no banco.

### 6. Estratégia de migration

- **Uma migration por grupo coerente.** As três tabelas do Marco 3.1 (`organizations`, `memberships`, `invitations`) e os dois enums formam um grupo só: as FKs de `memberships` e `invitations` dependem de `organizations`. Vão numa migration única.
- **Nunca editar migration já aplicada.** `20261001231755_init` e `20261109190000_create_users` ficam como estão. Correção depois do merge é migration nova.
- Gerar sem banco, como em `create_users` (LOG-RED-GREEN-REFACTOR-1): `npx prisma migrate diff --from-schema <schema anterior> --to-schema prisma/schema.prisma --script`, revisando o SQL antes de commitar.
- A aplicação real é provada pelo job Integration (Postgres), que roda `prisma migrate deploy` contra `postgres:16`.

### 7. Testes de integração em `identity-infra`

- Criar `libs/identity/infra/jest.integration.config.cts` (mesmo formato de `import-infra` e `shared-prisma`) e declarar o alvo `test-integration` no `project.json`. Os padrões (`cache: false`, `dependsOn: prisma-generate`) já vêm de `targetDefaults` no `nx.json`. A exclusão de `*.integration.spec.ts` do alvo `test` já existe no `jest.config.cts` de `identity-infra`.
- Cenários provados contra PostgreSQL real, como `*.integration.spec.ts`:
  - **C09:** `findByOrganization` não vaza outra organização;
  - **C11:** `Membership` duplicada (User, Organization) é recusada e nada é gravado;
  - **C12:** `Membership` com User ou Organization inexistente é recusada pela FK;
  - **C17:** token repetido é recusado e nada é gravado.
- No job Integration (Postgres), o passo `nx run-many -t test-integration` passa a usar `--parallel=1`. Todos os projetos usam o mesmo banco, o `runInBand` só vale dentro de cada projeto, e índices únicos globais (email de `User`) podem colidir entre projetos rodando ao mesmo tempo.
- A versão sem banco de cada um desses cenários (tradução de `P2002`/`P2003`, filtro recebido pelo delegate) continua no alvo `test`, com delegate Prisma falso, e conta para a cobertura.

---

## Consequences

### Positivos ✅

1. As garantias que dependem do banco (C09, C11, C12, C17) passam a ser provadas no CI, e não só descritas.
2. Vazamento do banco não expõe tokens de convite utilizáveis.
3. `Restrict` evita apagar organização ou usuário com vínculos sem uma decisão explícita.
4. Uma migration para o grupo evita estados intermediários com FK apontando para tabela que ainda não existe.

### Negativos ❌

1. `Restrict` deixa a remoção de organização ou usuário para um use case futuro, que vai precisar decidir o que fazer com vínculos e convites.
2. O token perdido não pode ser recuperado. O mentor precisa gerar outro convite.
3. O `--parallel=1` deixa o job de integração mais lento à medida que crescem os projetos com testes de integração.
4. O ambiente local continua sem banco: quem implementa só vê C09, C11, C12 e C17 rodarem no CI.

---

## Alternatives Considered

### ❌ Alternativa 1: guardar o token em texto puro

**Problemas:** quem lê o banco consegue aceitar convites.  
**Por que rejected:** contraria o ADR-005 (risco 3) e a Decisão 7.

### ❌ Alternativa 2: persistir `EXPIRED`

**Problemas:** exige job agendado para virar o status, e o status gravado pode ficar inconsistente com `expiresAt`.  
**Por que rejected:** Decisão 3 da spec.

### ❌ Alternativa 3: `onDelete: Cascade`

**Problemas:** apagar uma organização apagaria vínculos e convites em silêncio.  
**Por que rejected:** Decisão 9 da spec.

### ❌ Alternativa 4: unicidade de `Membership` por (User, Organization, Role)

**Problemas:** permite a mesma pessoa ser MENTOR e STUDENT da mesma organização.  
**Por que rejected:** Decisão 4 da spec (substitui a invariante 5 da S5).

### ✅ Alternativa 5: models acima, `Restrict`, hash SHA-256, `EXPIRED` calculado, migration única do grupo (ESCOLHIDA)

**Por que aceita:** aplica as decisões fechadas da spec sem acrescentar regra nova.

---

## Decisões em aberto

A spec não fixa estes pontos. Ficam para o responsável do projeto decidir antes da tarefa correspondente em [`docs/tasks/marco-3-1-tarefas.md`](../tasks/marco-3-1-tarefas.md).

1. **Índice em `organizationId`:** `findByOrganization` (M4) consulta `memberships` por `organizationId`, mas o índice único (`userId`, `organizationId`) começa por `userId`. `draft_questions` tem `@@index([organizationId])`. Criar `@@index([organizationId])` em `memberships` e em `invitations`?
2. **Enum do papel no convite:** `Invitation.role` reaproveita o enum `MembershipRole` do Prisma (aceita `MENTOR` no banco, o domínio barra) ou ganha um enum próprio só com `STUDENT`?
3. **Reconstituição de `Invitation`:** `Invitation.create` só produz convites `PENDING` com `expiresAt > createdAt`. Ler do banco um convite `ACCEPTED`, `REVOKED` ou vencido exige outra factory (M12 fala em "mapeamento de linha → entidade"). Nome e regras dessa factory?
4. **Erro do `P2003` (C12):** a spec diz "erro de integridade referencial", sem nomear. Erro de aplicação novo ou o erro do Prisma propagado?
5. **Email do convite:** normalizar (trim, minúsculas) antes de gravar? `User` hoje faz `trim` e não troca a caixa. Importa para a conferência com o email do Google no aceite (Marco 3.2).
6. **Formato do `tokenHash`:** hexadecimal (64 caracteres) ou base64url? Tipo da coluna (`TEXT` ou `CHAR(64)`)?
7. **Port de geração do token:** a seção 4 da spec põe a geração dos 32 bytes atrás de port, mas só nomeia o `TokenHasher`. O gerador entra no Marco 3.1 ou só com os use cases do 3.2?
8. **FK de `draft_questions.organizationId`:** o schema diz "sem FK por enquanto: o model Organization nasce com o contexto identity". Criar essa FK cruza os contextos `import` e `identity` no banco. Entra nesta migration, em outra, ou não entra?
9. **C27 (revogar convite já aceito):** a spec pede para confirmar ao implementar.
10. **Colunas de auditoria:** `Organization` e `Membership` não têm `createdAt` no domínio, e `Invitation` não tem `acceptedAt`/`revokedAt`. O schema segue o domínio (sem essas colunas)?

---

## Related ADRs

- **ADR-003:** repositórios de `identity` como ports e adapters (este ADR acrescenta `InvitationRepository`, que o checklist do ADR-003 não prevê).
- **ADR-005:** convite por link com token (validade, hash, `EXPIRED` calculado).
- **ADR-007:** organização pessoal. A criação automática para contas novas é posterior e não muda estes models.

---

## References

- [Spec do Marco 3.1](../specs/marco-3-1-identity-completo.md), seções 1.2, 2, 3, 5 e 7
- [S5](../specs/s5-identity-repositories.md)
- [Tarefas do Marco 3.1](../tasks/marco-3-1-tarefas.md)
- `LOG-RED-GREEN-REFACTOR-1.md` (migration gerada com `prisma migrate diff`) e `LOG-RED-GREEN-REFACTOR-3.md` (cenários de infra sem PostgreSQL)
- PR #11 (job Integration (Postgres)) e `docs/RESUMO_REPO.md`, seção 10
