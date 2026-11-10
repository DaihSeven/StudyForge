# Marco 3.1: Especificação — Identity completo

**Bounded Context:** `identity`
**Data:** 2026-11-10
**Status:** Decisões fechadas em 2026-11-10 (seção 7); pronta para virar testes
**Etapa:** 3 (MVP 1), Marco 3.1
**Baseada em:** [S5](s5-identity-repositories.md), [ADR-003](../adrs/adr-003-identity-repositories.md), [ADR-005](../adrs/adr-005-convite-por-link-com-token.md), README seções 6 e 8, CLAUDE.md

> Esta spec é **somente documentação**. Nenhum código, migration ou teste é criado por ela.
> Os cenários da seção 5 viram testes depois, na ordem red-green-refactor.

---

## 1. Escopo

### 1.1 O que o S5 já entregou (Semana 8)

- `UserRepository` (port em `libs/identity/application/src/lib/ports/`) com **`findByEmail`** e **`save`**.
- `DuplicateEmailError` em `identity/application`.
- `PrismaUserRepository` em `identity/infra`, com a migration `20261109190000_create_users`.
- Os 3 cenários BDD da S5 já viraram teste (`prisma-user.repository.spec.ts`): caso feliz, email não encontrado e email duplicado.
- Domínio de `User` (com `createdAt`), `Organization`, `Membership` e `MembershipRole`.

Pendências do que a S5 entregou: `PrismaUserRepository` **ainda não está registrado** no `IdentityInfraModule`, e a garantia "nada é gravado" do cenário 3 depende do PostgreSQL (ver LOG-RED-GREEN-REFACTOR-3).

### 1.2 O que esta spec adiciona

| Item | Camada |
|---|---|
| `UserRepository.findById` | application (port) + infra |
| `OrganizationRepository` (`findById`, `save`) | application + infra |
| `MembershipRepository` (`findByOrganization`, `save`) | application + infra |
| Entidade **`Invitation`** (domínio) e **`InvitationRepository`** (`save`, busca por token) | domain + application + infra |
| Prisma models `Organization`, `Membership`, `Invitation` e a migration correspondente | infra |
| Registro dos repositórios no `IdentityInfraModule` | infra |

### 1.3 O que NÃO entra (fica no Marco 3.2 ou depois)

- Google OAuth (autenticação).
- Os **use cases** do convite (gerar, revogar, aceitar: abrir o link, autenticar, criar a `Membership`) e o use case de criar organização com o criador como MENTOR numa única transação. Aqui entram só as *regras* de transição do convite no domínio (`accept`, `revoke`), ver Decisão 8.
- Endpoints HTTP, controllers e DTOs em `shared/contracts`.
- Envio automático de email (ADR-005: no MVP o professor copia e envia o link).
- Reemissão automática de convite vencido, listagem/gestão de convites na interface.
- Organização pessoal por usuário, simulados individuais com visibilidade PRIVATE/UNLISTED/PUBLIC, moderação por admin da plataforma e banco de questões por certificação: ver ADR-007 e ADR-008, a criar depois do merge deste PR.

---

## 2. Linguagem ubíqua

Reaproveita os termos da S5 (User, Organization, Membership, MembershipRole `MENTOR`/`STUDENT`) e acrescenta:

- **Invitation (convite):** autorização emitida por um mentor para que uma pessoa entre em uma `Organization` com um papel. Pertence a uma organização.
- **Token:** segredo de uso único, 32 bytes aleatórios, que vai no link do convite. No banco guarda-se só o **SHA-256** do token; o token em texto puro existe só no link entregue ao mentor. O hash é calculado pelo use case via port `TokenHasher`.
- **Status:** estado do convite. Valores do ADR-005: `PENDING` (pendente), `ACCEPTED` (aceito), `EXPIRED` (expirado), `REVOKED` (revogado). `EXPIRED` é **calculado** (`PENDING` com `now >= expiresAt`) e nunca persistido: o banco guarda só `PENDING`, `ACCEPTED` e `REVOKED`.
- **Expiração (`expiresAt`):** instante a partir do qual um convite `PENDING` deixa de poder ser aceito. Validade padrão: **7 dias** (constante do domínio, aplicada por quem cria o convite).
- **Convidado:** pessoa a quem o convite se destina, identificada por **email específico** (Decisão 1).

### Invariantes (continuam a numeração da S5, 1 a 5)

6. **Invitation.organizationId:** obrigatório, invariante da factory (CLAUDE.md regra 6). Nunca parâmetro opcional de query.
7. **Token único:** não existem dois convites com o mesmo hash de token.
8. **Validade:** `expiresAt` é posterior ao instante de criação (padrão: criação + 7 dias).
9. **Uso único:** um convite `ACCEPTED` não pode ser aceito de novo; só um convite `PENDING` e não vencido pode ser aceito.
10. **Papel:** no MVP o convite só pode ter papel `STUDENT`; a `Membership` criada no aceite usa esse papel.
11. **Membership única:** no máximo uma `Membership` por (User, Organization), ou seja, um papel por organização no MVP. Substitui a invariante 5 da S5 (que era por User, Org e Role).
12. **Isolamento por organização:** `findByOrganization` só devolve vínculos da organização pedida.
13. **Autoria do convite:** só quem é MENTOR da organização gera e revoga convites dela (regra de use case, Marco 3.2).

---

## 3. Critérios EARS

Os critérios `findByEmail` e `save` de `User` já estão na S5 (E1 e E3). Aqui, a numeração é própria deste marco (prefixo **M**).

### M1: FindUserById

| Aspecto | Descrição |
|---|---|
| **Condition** | Um use case precisa carregar um `User` pelo identificador |
| **Event** | `UserRepository.findById(id)` é chamado |
| **Scenario** | O `id` existe na tabela `users` |
| **Exception** | `id` inexistente → retorna `null`, sem lançar erro |
| **Result** | Retorna a entidade `User` (id, email, name, createdAt) ou `null` |

### M2: FindOrganizationById

| Aspecto | Descrição |
|---|---|
| **Condition** | Um use case precisa carregar uma `Organization` |
| **Event** | `OrganizationRepository.findById(id)` é chamado |
| **Scenario** | O `id` existe |
| **Exception** | `id` inexistente → retorna `null` |
| **Result** | Retorna a entidade `Organization` (id, name) ou `null` |

### M3: SaveOrganization

| Aspecto | Descrição |
|---|---|
| **Condition** | Um use case precisa persistir uma organização nova |
| **Event** | `OrganizationRepository.save(organization)` é chamado com entidade já válida |
| **Scenario** | A entidade passou por `Organization.create` (nome não vazio) |
| **Exception** | Nome vazio nunca chega ao repositório: `Organization.create` lança `InvalidOrganizationError` |
| **Result** | Persiste e devolve a `Organization` |

### M4: FindMembershipsByOrganization

| Aspecto | Descrição |
|---|---|
| **Condition** | Um use case precisa listar os vínculos de uma organização |
| **Event** | `MembershipRepository.findByOrganization(organizationId)` é chamado |
| **Scenario** | A organização tem 0, 1 ou N vínculos |
| **Exception** | Organização sem vínculos ou inexistente → lista vazia, sem erro |
| **Result** | Retorna `Membership[]` somente daquela organização (invariante 12) |

### M5: SaveMembership

| Aspecto | Descrição |
|---|---|
| **Condition** | Um use case precisa persistir o vínculo entre um `User` e uma `Organization` |
| **Event** | `MembershipRepository.save(membership)` é chamado com entidade válida (carrega `organizationId` e `role`) |
| **Scenario** | Não existe vínculo (User, Organization) e `userId` e `organizationId` existem |
| **Exception** | Já existe `Membership` para o mesmo (User, Organization), com qualquer papel → lança `DuplicateMembershipError` e nada é gravado. `userId` ou `organizationId` inexistente → erro de integridade referencial (chaves estrangeiras `onDelete: Restrict`, Decisão 9) |
| **Result** | Persiste e devolve a `Membership` |

### M6: CreateInvitation (domínio)

| Aspecto | Descrição |
|---|---|
| **Condition** | O mentor de uma organização gera um convite |
| **Event** | `Invitation.create(props)` é chamado com `id`, `organizationId`, email do convidado, `role`, `tokenHash` (SHA-256), `createdAt` e `expiresAt` (padrão: `createdAt` + 7 dias, aplicado por quem cria) |
| **Scenario** | Todos os campos são válidos e `expiresAt > createdAt` |
| **Exception** | Falta de `organizationId`, email inválido, papel diferente de `STUDENT`, hash vazio ou `expiresAt` não posterior a `createdAt` → erro de domínio específico |
| **Result** | Entidade imutável com status `PENDING` |

### M7: SaveInvitation

| Aspecto | Descrição |
|---|---|
| **Condition** | Um use case precisa persistir um convite novo |
| **Event** | `InvitationRepository.save(invitation)` é chamado |
| **Scenario** | O hash do token ainda não existe |
| **Exception** | Hash de token repetido → lança `DuplicateInvitationTokenError`, nada é gravado |
| **Result** | Persiste **apenas o hash** do token e devolve a `Invitation` |

### M8: FindInvitationByToken

| Aspecto | Descrição |
|---|---|
| **Condition** | O aceite do convite (Marco 3.2) precisa localizar o convite a partir do token do link |
| **Event** | `InvitationRepository.findByTokenHash(tokenHash)` é chamado (o use case calcula o SHA-256 do token recebido via port `TokenHasher`, Decisão 7) |
| **Scenario** | Existe convite com esse hash |
| **Exception** | Hash inexistente → retorna `null`, sem lançar erro |
| **Result** | Retorna a `Invitation` com seu status persistido, ou `null`. A busca **não** filtra por validade nem por status: quem decide é o domínio |

### M9: Token único do convite (invariante 7)

| Aspecto | Descrição |
|---|---|
| **Condition** | Dois convites são persistidos |
| **Event** | `save` é chamado duas vezes com o mesmo hash |
| **Scenario** | O banco tem índice único sobre o hash do token |
| **Exception** | A segunda escrita é recusada (`DuplicateInvitationTokenError`) |
| **Result** | Um hash identifica no máximo um convite |

### M10: Validade do convite (invariante 8 e 9)

| Aspecto | Descrição |
|---|---|
| **Condition** | Alguém tenta aceitar um convite |
| **Event** | `invitation.accept(now)` é chamado |
| **Scenario** | Status persistido `PENDING` e `now < expiresAt` |
| **Exception** | `now >= expiresAt` → `InvitationExpiredError` (expiração calculada, sem mudar o status gravado) |
| **Result** | Convite passa a `ACCEPTED` (nova instância, entidade imutável) |

### M11: Uso único (invariante 9)

| Aspecto | Descrição |
|---|---|
| **Condition** | Alguém tenta aceitar um convite que não está pendente |
| **Event** | `invitation.accept(now)` é chamado |
| **Scenario** | Status `ACCEPTED` ou `REVOKED` |
| **Exception** | `ACCEPTED` → `InvitationAlreadyUsedError`; `REVOKED` → `InvitationRevokedError` |
| **Result** | Nada muda; nenhuma `Membership` pode ser criada a partir desse convite |

### M12: Vínculo à organização (invariante 6)

| Aspecto | Descrição |
|---|---|
| **Condition** | Qualquer convite é criado ou carregado |
| **Event** | `Invitation.create` ou o mapeamento de linha → entidade |
| **Scenario** | O convite pertence a uma organização |
| **Exception** | Sem `organizationId` válido (`OrganizationId`) → `InvalidOrganizationIdError` |
| **Result** | Todo `Invitation` tem `organizationId`, sem exceção (CLAUDE.md regra 6) |

### M13: Papel do convite (invariante 10)

| Aspecto | Descrição |
|---|---|
| **Condition** | O convite define com que papel a pessoa entra |
| **Event** | `Invitation.create` recebe `role` |
| **Scenario** | `role` é `STUDENT` (único papel permitido no MVP) |
| **Exception** | `MENTOR` ou papel desconhecido → `InvalidInvitationError` |
| **Result** | O convite guarda o papel; o aceite (3.2) cria a `Membership` com esse papel |

### M14: RevokeInvitation (domínio)

| Aspecto | Descrição |
|---|---|
| **Condition** | O mentor cancela um convite que ainda não foi usado |
| **Event** | `invitation.revoke()` é chamado |
| **Scenario** | Status persistido `PENDING` |
| **Exception** | `ACCEPTED` → `InvitationAlreadyUsedError`; `REVOKED` → `InvitationRevokedError` |
| **Result** | Nova instância com status `REVOKED` (entidade imutável) |

### M15: Aceite por quem já é membro (use case, Marco 3.2)

| Aspecto | Descrição |
|---|---|
| **Condition** | Um usuário autenticado aceita um convite `PENDING` e válido |
| **Event** | O use case de aceite é executado |
| **Scenario** | O email já tem `User`: o aceite reaproveita esse `User` e cria a `Membership` (Decisão 5) |
| **Exception** | O `User` já é membro da organização (qualquer papel) → erro claro `AlreadyMemberError`; o convite **não** é consumido (continua `PENDING`) e nenhuma `Membership` é criada |
| **Result** | Sem vínculo prévio: `Membership` criada com o papel do convite e convite `ACCEPTED` |

### M16: Gerar e revogar convite só como MENTOR (use case, Marco 3.2)

| Aspecto | Descrição |
|---|---|
| **Condition** | Alguém pede para gerar ou revogar um convite de uma organização |
| **Event** | Os use cases de gerar/revogar convite são executados |
| **Scenario** | O solicitante tem `Membership` `MENTOR` naquela organização |
| **Exception** | Solicitante sem `Membership` ou `STUDENT` → erro de autorização, nada é criado ou alterado |
| **Result** | Convite criado (token de 32 bytes, só o SHA-256 persistido) ou revogado |

### M17: Criar organização com o criador como MENTOR (use case, Marco 3.2)

| Aspecto | Descrição |
|---|---|
| **Condition** | Um usuário cria uma organização de propósito |
| **Event** | O use case de criação é executado |
| **Scenario** | Dados válidos |
| **Exception** | Falha em qualquer das duas escritas → nenhuma delas fica gravada |
| **Result** | `Organization` e `Membership` `MENTOR` do criador gravadas **numa única transação** (Decisão 10) |

---

## 4. Estrutura de implementação (referência, não é código)

Segue o padrão real do repo (ADR-003, nota de 2026-11-09), não os nomes ilustrativos do ADR:

| Elemento | Local |
|---|---|
| Ports | `libs/identity/application/src/lib/ports/{user,organization,membership,invitation}.repository.ts` |
| Tokens de DI | `*_REPOSITORY_TOKEN = Symbol('...')`, como `USER_REPOSITORY_TOKEN` |
| Erros | `libs/identity/application/src/lib/errors/` (como `DuplicateEmailError`) |
| Entidade | `libs/identity/domain/src/lib/invitation.ts` + `invitation-status.ts` |
| Adapters | `libs/identity/infra/src/lib/{organization,membership,invitation}/prisma-*.repository.ts` |
| Wiring | `IdentityInfraModule` (registra os 4 repositórios, incluindo o `PrismaUserRepository` pendente) |

`Invitation` é domínio puro: sem NestJS, Prisma ou Node (`...domainLayer` no ESLint, `types: []` no tsconfig, como no CLAUDE.md regra 2). Geração do token aleatório e hash são crypto do Node, portanto ficam atrás de port em `application` e adapter em `infra` (mesmo padrão do `IdGenerator` do contexto `import`).

---

## 5. Cenários BDD

Cada título é **curto e estável**: vira o nome do teste. "Sem PG" = dá para provar sem PostgreSQL, usando um delegate Prisma falso com erros reais do Prisma (`P2002`, `P2003`), como no LOG-3 da Semana 8.

### Usuário

#### C01 — FindUserById retorna User quando o id existe (M1)
```gherkin
Given um User com id "u-1" existe
When chamo UserRepository.findById("u-1")
Then retorna o User com id, email, name e createdAt
```
Camada: **infra**. Sem PG: sim (delegate falso).

#### C02 — FindUserById retorna null quando o id não existe (M1)
```gherkin
Given nenhum User com id "u-x" existe
When chamo UserRepository.findById("u-x")
Then retorna null e nenhum erro é lançado
```
Camada: **infra**. Sem PG: sim.

### Organização

#### C03 — FindOrganizationById retorna Organization quando existe (M2)
```gherkin
Given uma Organization "Escola AWS" com id "o-1" existe
When chamo OrganizationRepository.findById("o-1")
Then retorna a Organization com id e name
```
Camada: **infra**. Sem PG: sim.

#### C04 — FindOrganizationById retorna null quando não existe (M2)
```gherkin
Given nenhuma Organization com id "o-x" existe
When chamo OrganizationRepository.findById("o-x")
Then retorna null
```
Camada: **infra**. Sem PG: sim.

#### C05 — SaveOrganization persiste Organization válida (M3)
```gherkin
Given uma Organization válida criada por Organization.create
When chamo OrganizationRepository.save(organization)
Then ela é gravada e devolvida
And findById com o mesmo id a encontra
```
Camada: **infra**. Sem PG: sim (leitura de volta pela tabela falsa prova o mapeamento, não a durabilidade).

#### C06 — Organization rejeita nome vazio (M3)
```gherkin
When chamo Organization.create com name "   "
Then lança InvalidOrganizationError
```
Camada: **domain** (já coberto pelos 21 testes do domínio; manter, não duplicar). Sem PG: sim.

### Vínculos

#### C07 — FindMembershipsByOrganization lista os vínculos (M4)
```gherkin
Given a organização "o-1" tem 2 vínculos (um MENTOR, um STUDENT)
When chamo MembershipRepository.findByOrganization("o-1")
Then retorna 2 Memberships, cada uma com userId, organizationId e role
```
Camada: **infra**. Sem PG: sim.

#### C08 — FindMembershipsByOrganization retorna lista vazia (M4)
```gherkin
Given a organização "o-2" não tem vínculos
When chamo MembershipRepository.findByOrganization("o-2")
Then retorna []
```
Camada: **infra**. Sem PG: sim.

#### C09 — FindMembershipsByOrganization não vaza outra organização (M4, invariante 12)
```gherkin
Given "o-1" tem 1 vínculo e "o-2" tem 1 vínculo
When chamo findByOrganization("o-1")
Then só o vínculo de "o-1" é retornado
```
Camada: **infra**. Sem PG: parcialmente. O delegate falso só prova que o `where` usa `organizationId` (e o teste deve conferir o filtro recebido, sem checar o próprio fake); a garantia real é do banco → **integração com PG**.

#### C10 — SaveMembership persiste vínculo válido (M5)
```gherkin
Given um User e uma Organization existentes
When chamo MembershipRepository.save(membership MENTOR)
Then o vínculo é gravado e devolvido
```
Camada: **infra**. Sem PG: sim.

#### C11 — SaveMembership rejeita vínculo duplicado (M5, invariante 11)
```gherkin
Given o User "u-1" já tem Membership MENTOR na Organization "o-1"
When tento salvar outra Membership do mesmo User na mesma Organization (com qualquer papel)
Then lança DuplicateMembershipError
And nada é gravado
```
Camada: **infra** (tradução de `P2002` em erro de aplicação). Sem PG: a tradução do erro, sim; "nada é gravado" não (mesma situação do cenário 3 da S5: quem garante é o índice único) → **integração com PG**. A chave única é (User, Organization), sem o papel (Decisão 4).

#### C12 — SaveMembership falha com User ou Organization inexistente (M5)
```gherkin
Given a Organization "o-x" não existe
When tento salvar uma Membership apontando para "o-x"
Then a escrita é recusada com erro de integridade referencial
```
Camada: **infra**. Sem PG: a tradução de `P2003`, sim; a FK em si → **integração com PG**. As chaves estrangeiras são `onDelete: Restrict` (Decisão 9); a recusa de apagar uma Organization ou User que tenha vínculos é propriedade da migration, só provável com PostgreSQL, e não tem cenário de repositório porque não há `delete` nos ports.

### Convite

#### C13 — Invitation nasce pendente com token e validade (M6, M12, M13)
```gherkin
Given organizationId "o-1", email "aluno@escola.com", role STUDENT, tokenHash "h1" (SHA-256),
      createdAt T e expiresAt T+7d (validade padrão)
When chamo Invitation.create
Then o convite tem status PENDING
And carrega organizationId "o-1", role STUDENT, tokenHash "h1" e expiresAt T+7d
```
Camada: **domain**. Sem PG: sim.

#### C14 — Invitation rejeita dados inválidos (M6, M12, M13)
```gherkin
When chamo Invitation.create sem organizationId válido
Then lança InvalidOrganizationIdError
When chamo com email "sem-arroba"
Then lança InvalidInvitationError
When chamo com role "MENTOR" ou "ADMIN"
Then lança InvalidInvitationError (no MVP só STUDENT)
When chamo com tokenHash vazio
Then lança InvalidInvitationError
```
Camada: **domain** (uma tabela de casos, um teste por motivo). Sem PG: sim.

#### C15 — Invitation rejeita validade no passado (M6)
```gherkin
When chamo Invitation.create com expiresAt igual ou anterior a createdAt
Then lança InvalidInvitationError
```
Camada: **domain**. Sem PG: sim.

#### C16 — SaveInvitation grava só o hash do token (M7)
```gherkin
Given um convite com tokenHash "h1"
When chamo InvitationRepository.save(invitation)
Then a linha gravada contém "h1" e nenhum campo com o token em texto puro
```
Camada: **infra**. Sem PG: sim (confere o `data` recebido pelo delegate).

#### C17 — SaveInvitation rejeita token repetido (M7, M9)
```gherkin
Given já existe um convite com tokenHash "h1"
When tento salvar outro convite com tokenHash "h1"
Then lança DuplicateInvitationTokenError
And nada é gravado
```
Camada: **infra**. Sem PG: a tradução de `P2002`, sim; "nada é gravado" → **integração com PG**.

#### C18 — FindInvitationByToken retorna o convite (M8)
```gherkin
Given existe convite PENDING com tokenHash "h1"
When chamo InvitationRepository.findByTokenHash("h1")
Then retorna a Invitation com status, role, organizationId e expiresAt
```
Camada: **infra**. Sem PG: sim.

#### C19 — FindInvitationByToken retorna null para token inexistente (M8)
```gherkin
Given nenhum convite tem tokenHash "zzz"
When chamo InvitationRepository.findByTokenHash("zzz")
Then retorna null e nenhum erro é lançado
```
Camada: **infra**. Sem PG: sim.

#### C20 — Aceitar convite expirado falha (M10)
```gherkin
Given um convite PENDING com expiresAt T+7d
When chamo invitation.accept(now = T+8d)
Then lança InvitationExpiredError
And o convite continua PENDING
```
Camada: **domain** (relógio passado como argumento, sem `Date.now()` no domínio). Sem PG: sim.

#### C21 — Aceitar convite já usado falha (M11)
```gherkin
Given um convite com status ACCEPTED
When chamo invitation.accept(now)
Then lança InvitationAlreadyUsedError
```
Camada: **domain**. Sem PG: sim.

#### C22 — Aceitar convite revogado falha (M11)
```gherkin
Given um convite com status REVOKED
When chamo invitation.accept(now)
Then lança InvitationRevokedError
```
Camada: **domain**. Sem PG: sim.

#### C23 — Aceitar convite pendente e válido marca ACCEPTED (M10)
```gherkin
Given um convite PENDING com expiresAt T+7d
When chamo invitation.accept(now = T+1d)
Then devolve um convite ACCEPTED com os mesmos dados
And o original continua PENDING (imutável)
```
Camada: **domain**. Sem PG: sim.

#### C24 — Aceite por quem já é membro não consome o convite (M15, invariante 11)
```gherkin
Given o User "u-1" já tem Membership na Organization "o-1"
And existe convite PENDING válido de "o-1" para o email de "u-1"
When "u-1" tenta aceitar o convite
Then lança AlreadyMemberError
And o convite continua PENDING
And nenhuma Membership nova é criada
```
Camada: **application** (use case de aceite, Marco 3.2), com fakes dos ports. Sem PG: sim.

#### C25 — Aceitar convite com email que já tem conta cria Membership para o User existente (M15)
```gherkin
Given o User "u-1" existe com o email do convite e não é membro de "o-1"
And o convite PENDING é válido
When "u-1" aceita o convite
Then uma Membership STUDENT de "u-1" em "o-1" é criada
And o convite passa a ACCEPTED
```
Camada: **application** (Marco 3.2), com fakes dos ports. Sem PG: sim.

#### C26 — Revogar convite pendente marca REVOKED (M14)
```gherkin
Given um convite PENDING
When chamo invitation.revoke()
Then devolve um convite REVOKED com os mesmos dados
And o original continua PENDING (imutável)
```
Camada: **domain**. Sem PG: sim.

#### C27 — Revogar convite já aceito falha (M14)
```gherkin
Given um convite com status ACCEPTED
When chamo invitation.revoke()
Then lança InvitationAlreadyUsedError
```
Camada: **domain**. Sem PG: sim. (Decorre da invariante 9; a decisão 8 não detalha este caso, confirmar ao implementar.)

#### C28 — Só MENTOR da organização gera convite (M16)
```gherkin
Given o User "u-2" é STUDENT de "o-1"
When "u-2" tenta gerar um convite para "o-1"
Then o use case lança erro de autorização
And nenhum convite é criado
```
Camada: **application** (Marco 3.2), com fakes dos ports. Sem PG: sim.

#### C29 — Criar organização torna o criador MENTOR na mesma transação (M17)
```gherkin
Given um User autenticado cria a Organization "Escola AWS"
When a gravação da Membership MENTOR falha
Then a Organization também não fica gravada
```
Camada: **application** (Marco 3.2) para a orquestração com fakes; a atomicidade real é do banco. Sem PG: a orquestração, sim; a garantia transacional → **integração com PG**.

### Mapa resumido

| Camada | Cenários |
|---|---|
| domain | C06, C13, C14, C15, C20, C21, C22, C23, C26, C27 |
| application (Marco 3.2) | C24, C25, C28, C29 |
| infra | C01–C05, C07–C12, C16–C19 |
| Precisa de PG para a garantia completa | C09, C11, C12, C17, C29 (o resto da cláusula é provável sem banco) |

Obs.: os cenários de `application` (C24, C25, C28, C29) pertencem ao Marco 3.2: o 3.1 só define ports e regras de domínio, e não há use case para testar com fakes. Ficam especificados aqui para rastreabilidade e para que as decisões 5, 6 e 10 estejam cobertas.

---

## 6. Cobertura

| Aspecto | Status |
|---|---|
| Bounded context | `identity` |
| Entidades | User, Organization, Membership, MembershipRole, **Invitation** (nova) |
| Critérios EARS | 17 (M1–M17); M15–M17 são use cases do Marco 3.2 |
| Cenários BDD | 29 (C01–C29), nenhum bloqueado por decisão |
| `organizationId` como invariante | Membership (S5) e Invitation (M12); `User` continua sem |
| Fora do escopo | Google OAuth, use cases do convite e de criar organização (3.2), endpoints, email, ADR-007/ADR-008 |

---

## 7. Decisões

Decisões do dono do projeto (2026-11-10) para as perguntas que esta spec levantou.

| # | Tema | Decisão |
|---|---|---|
| 1 | Convite | Por **email específico** (o ADR-005 já previa conferir o email do Google com o do convite). |
| 2 | Validade | Padrão de **7 dias**. |
| 3 | `EXPIRED` | **Calculado** por `expiresAt`, não persistido. |
| 4 | Unicidade da Membership | Por **(User, Org)**: um papel por organização no MVP. |
| 5 | Email com conta existente | O aceite cria a `Membership` para o `User` existente. Se já é membro: erro claro (`AlreadyMemberError`) e o convite **não** é consumido. |
| 6 | Autoria e papel do convite | Só **MENTOR** da organização gera e revoga convites. O convite só pode ter papel **STUDENT** no MVP. |
| 7 | Token | 32 bytes aleatórios, guardado como **SHA-256**; o hash é feito pelo use case via port `TokenHasher`. |
| 8 | `accept` e `revoke` | No **domínio**, no 3.1. Os use cases ficam no 3.2. |
| 9 | Chaves estrangeiras | `onDelete: Restrict` em `Membership` e `Invitation`. |
| 10 | Criador da organização | Quem cria uma organização de propósito vira **MENTOR** numa **única transação**, como use case do 3.2. |

Onde cada decisão aparece: 1 (M6, C13), 2 (M6, C13, C20), 3 (M10, C20), 4 (invariante 11, M5, C11), 5 (M15, C24, C25), 6 (invariante 13, M13, M16, C14, C28), 7 (M8, C16, C18), 8 (M10, M11, M14, C20–C23, C26, C27), 9 (M5, C12), 10 (M17, C29).

---

## 8. Conflitos e lacunas entre S5, ADR-003, ADR-005 e o código

| # | Onde | Conflito | Situação |
|---|---|---|---|
| 1 | S5 invariante 5 × pedido | Unicidade por (User, Org, Role) × por (User, Org) | **Resolvido** (Decisão 4); nota no topo da S5 |
| 2 | S5 E1 | "`null` ou `UserNotFoundError`" é ambíguo; BDD e código usam `null` | Adotado `null` |
| 3 | S5 E1/E2 × código | S5 descreve `User { id, email, createdAt }`; o código também tem `name` | Spec segue o código |
| 4 | S5 E4 × código | S5 descreve `Organization` com `createdAt`; a entidade tem só `id` e `name` | Spec segue o código (M2) |
| 5 | S5 E5 × código | S5 diz "populated"; `Membership` guarda só ids e papel | Spec segue o código (M4); dados populados seriam outro read model |
| 6 | S5 E2 e ADR-003 × código | `findById` consta como entregue, mas só existem `findByEmail` e `save` | **Resolvido**: entra aqui (M1); nota no topo da S5 |
| 7 | ADR-003 × padrão do repo | Nomes e caminhos (`IUserRepository`, `adapters/`, token string) | Já reconciliado na nota de 2026-11-09 do ADR; spec usa o padrão real |
| 8 | ADR-003, "Related ADRs" | Cita ADR-004 e ADR-005 como futuros com assuntos que não são os atuais | Aberto (ADR-003 não foi alterado) |
| 9 | ADR-003, checklist | Não prevê `Invitation` nem `InvitationRepository` | Aberto; coberto por esta spec |
| 10 | ADR-005 × CLAUDE.md §4 e `organization.ts` | CLAUDE.md dizia que o convite estava "ainda não definido"; o comentário de `organization.ts` também | **Resolvido no CLAUDE.md** neste PR. O comentário de `organization.ts` é código e fica para o primeiro commit do Marco 3.1 |
| 11 | ADR-005 | "Validade curta" e "guardar só o hash" sem valores | **Resolvido** (Decisões 2 e 7); nota no ADR-005 |
| 12 | ADR-005 item 4 | Não dizia se `EXPIRED` é persistido | **Resolvido** (Decisão 3); nota no ADR-005 |
| 13 | AGENT.md seção 1 | Dizia que `identity/application` e `infra` estavam vazios e que não havia models de identity | **Resolvido** neste PR |

---

## 9. Validação com MCP Validator

Não executada. O `studyforge-mcp-validator` não está configurado neste ambiente (nenhum servidor MCP no `~/.claude.json` nem em `.claude/`). Ver o resumo da entrega para como conectá-lo.

---

## 10. Referências

- [S5: identity repositories](s5-identity-repositories.md)
- [ADR-003](../adrs/adr-003-identity-repositories.md), [ADR-005](../adrs/adr-005-convite-por-link-com-token.md)
- README.md seções 6, 6.1 e 8; CLAUDE.md seções 2 a 4
- LOG-RED-GREEN-REFACTOR-3.md (como provar cenários de infra sem PostgreSQL)
