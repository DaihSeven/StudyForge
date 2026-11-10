# Marco 3.1: Especificação — Identity completo

**Bounded Context:** `identity`
**Data:** 2026-11-10
**Status:** Rascunho — aguardando decisão das "Perguntas em aberto" (seção 7)
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
- O **fluxo de aceite** do convite como use case (abrir o link, autenticar, criar a `Membership`). Aqui entra só a *regra* de transição do convite no domínio (`accept`), ver Pergunta 8.
- Endpoints HTTP, controllers e DTOs em `shared/contracts`.
- Envio automático de email (ADR-005: no MVP o professor copia e envia o link).
- Reemissão automática de convite vencido, listagem/gestão de convites na interface.

---

## 2. Linguagem ubíqua

Reaproveita os termos da S5 (User, Organization, Membership, MembershipRole `MENTOR`/`STUDENT`) e acrescenta:

- **Invitation (convite):** autorização emitida por um mentor para que uma pessoa entre em uma `Organization` com um papel. Pertence a uma organização.
- **Token:** segredo de uso único gerado pelo sistema, que vai no link do convite. No banco guarda-se só o **hash** do token (ADR-005, riscos); o token em texto puro existe só no link entregue ao mentor.
- **Status:** estado do convite. Valores do ADR-005: `PENDING` (pendente), `ACCEPTED` (aceito), `EXPIRED` (expirado), `REVOKED` (revogado).
- **Expiração (`expiresAt`):** instante a partir do qual um convite `PENDING` deixa de poder ser aceito.
- **Convidado:** pessoa a quem o convite se destina (identificada por email, ver Pergunta 1).

### Invariantes (continuam a numeração da S5, 1 a 5)

6. **Invitation.organizationId:** obrigatório, invariante da factory (CLAUDE.md regra 6). Nunca parâmetro opcional de query.
7. **Token único:** não existem dois convites com o mesmo hash de token.
8. **Validade:** `expiresAt` é posterior ao instante de criação.
9. **Uso único:** um convite `ACCEPTED` não pode ser aceito de novo; só um convite `PENDING` e não vencido pode ser aceito.
10. **Papel:** o convite carrega um `MembershipRole` válido, e a `Membership` criada no aceite usa esse papel.
11. **Membership única:** a S5 (invariante 5) diz "mesmo User, mesma Org, mesmo Role". Ver Pergunta 4: pode precisar ser "mesmo User, mesma Org".
12. **Isolamento por organização:** `findByOrganization` só devolve vínculos da organização pedida.

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
| **Scenario** | O vínculo ainda não existe e `userId` e `organizationId` existem |
| **Exception** | Vínculo repetido → lança `DuplicateMembershipError` e nada é gravado. `userId` ou `organizationId` inexistente → erro de integridade referencial (ver Pergunta 9) |
| **Result** | Persiste e devolve a `Membership` |

### M6: CreateInvitation (domínio)

| Aspecto | Descrição |
|---|---|
| **Condition** | O mentor de uma organização gera um convite |
| **Event** | `Invitation.create(props)` é chamado com `id`, `organizationId`, email do convidado, `role`, `tokenHash`, `createdAt` e `expiresAt` |
| **Scenario** | Todos os campos são válidos e `expiresAt > createdAt` |
| **Exception** | Falta de `organizationId`, email inválido, papel desconhecido, hash vazio ou `expiresAt` não posterior a `createdAt` → erro de domínio específico |
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
| **Event** | `InvitationRepository.findByTokenHash(tokenHash)` é chamado (quem chama calcula o hash do token recebido, ver Pergunta 7) |
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
| **Scenario** | Status `PENDING` e `now < expiresAt` |
| **Exception** | `now >= expiresAt` → `InvitationExpiredError` |
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
| **Condition** | O mentor escolhe com que papel a pessoa entra |
| **Event** | `Invitation.create` recebe `role` |
| **Scenario** | `role` é `MENTOR` ou `STUDENT` |
| **Exception** | Papel desconhecido → `InvalidInvitationError` |
| **Result** | O convite guarda o papel; o aceite (3.2) cria a `Membership` com esse papel |

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
Given o User "u-1" já tem Membership na Organization "o-1"
When tento salvar outra Membership do mesmo User na mesma Organization
Then lança DuplicateMembershipError
And nada é gravado
```
Camada: **infra** (tradução de `P2002` em erro de aplicação). Sem PG: a tradução do erro, sim; "nada é gravado" não (mesma situação do cenário 3 da S5: quem garante é o índice único) → **integração com PG**. A definição de "duplicado" depende da Pergunta 4.

#### C12 — SaveMembership falha com User ou Organization inexistente (M5)
```gherkin
Given a Organization "o-x" não existe
When tento salvar uma Membership apontando para "o-x"
Then a escrita é recusada com erro de integridade referencial
```
Camada: **infra**. Sem PG: a tradução de `P2003`, sim; a FK em si → **integração com PG**. Depende da Pergunta 9.

### Convite

#### C13 — Invitation nasce pendente com token e validade (M6, M12, M13)
```gherkin
Given organizationId "o-1", email "aluno@escola.com", role STUDENT, tokenHash "h1",
      createdAt T e expiresAt T+7d
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
When chamo com role "ADMIN"
Then lança InvalidInvitationError
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

#### C24 — Aceite por quem já é membro da organização (invariante 11)
```gherkin
Given o User "u-1" já tem Membership na Organization "o-1"
And existe convite PENDING válido de "o-1" para o email de "u-1"
When "u-1" tenta aceitar o convite
Then o comportamento depende da Pergunta 5
```
Camada: **application** (use case de aceite, Marco 3.2), com fakes dos ports. Sem PG: sim. **Bloqueado pela Pergunta 5**: não vira teste até a decisão.

### Mapa resumido

| Camada | Cenários |
|---|---|
| domain | C06, C13, C14, C15, C20, C21, C22, C23 |
| application | C24 (Marco 3.2, bloqueado) |
| infra | C01–C05, C07–C12, C16–C19 |
| Precisa de PG para a garantia completa | C09, C11, C12, C17 (o resto da cláusula é provável sem banco) |

Obs.: nenhum cenário de `application` entra no 3.1 além do C24, porque o 3.1 só define ports, e não há use case para testar com fakes. Isso é consistente com o ADR-003 ("testes de integração com repository mockado") apenas quando os use cases do 3.2 existirem.

---

## 6. Cobertura

| Aspecto | Status |
|---|---|
| Bounded context | `identity` |
| Entidades | User, Organization, Membership, MembershipRole, **Invitation** (nova) |
| Critérios EARS | 13 (M1–M13) |
| Cenários BDD | 24 (C01–C24), 23 sem dependência de decisão |
| `organizationId` como invariante | Membership (S5) e Invitation (M12); `User` continua sem |
| Fora do escopo | Google OAuth, use case de aceite, endpoints, email |

---

## 7. Perguntas em aberto (precisam de decisão)

1. **Convite por email específico ou link genérico?** O ADR-005 lista `email` no `Invitation` e fala em "conferência do email do Google com o email do convite", o que implica email específico. Mas não diz isso como decisão fechada. Esta spec assume email específico (M6, C13). Confirmar?
2. **Tempo de validade padrão.** O ADR-005 diz só "validade curta". Qual valor (ex.: 7 dias, 48 horas)? Fica constante do domínio, configuração, ou escolha do mentor ao gerar o convite?
3. **`EXPIRED` é status gravado ou derivado?** Opção A: só `PENDING` no banco e `EXPIRED` calculado por `expiresAt < now` (sem job). Opção B: gravar `EXPIRED` por um processo. A spec assume A (C20 compara `now` com `expiresAt`), mas o ADR-005 lista `EXPIRED` como status.
4. **Chave de unicidade da Membership.** S5 invariante 5: (User, Organization, Role). O pedido desta spec fala em duplicata "para o mesmo user e organização". Um User pode ser MENTOR e STUDENT na mesma organização? Se não, a chave é (User, Organization).
5. **Email do convidado já tem conta, ou já é membro.** O que acontece no aceite: (a) reaproveita o `User` existente e cria a `Membership`; (b) se já é membro com o mesmo papel, erro ou aceite idempotente; (c) se já é membro com papel diferente, atualiza o papel, recusa ou cria um segundo vínculo (depende da Pergunta 4)? Bloqueia C24.
6. **Quem pode gerar e revogar convite.** Só quem tem `Membership` `MENTOR` na organização? Essa checagem é de use case (application), não da entidade. Entra no 3.1 ou no 3.2? E o convite pode ter papel `MENTOR`, ou só `STUDENT`?
7. **Token e hash.** Algoritmo de hash (SHA-256 basta para token aleatório de alta entropia?), tamanho do token, e quem hasheia: o use case via port (esta spec assume isso: o repositório recebe `tokenHash`) ou o repositório recebe o token e hasheia internamente.
8. **A transição `accept` e `revoke` do convite pertence ao 3.1 ou ao 3.2?** A spec põe as regras no domínio no 3.1 (para provar "uso único" e "expirado" sem banco) e deixa o use case para o 3.2. Alternativa: tudo no 3.2.
9. **Integridade referencial.** `Membership` e `Invitation` devem ter chaves estrangeiras para `users` e `organizations` no banco (C12)? E o que fazer com convites ao apagar uma organização (não há remoção de organização no MVP)?
10. **Quem vira MENTOR da organização criada.** O README diz "Mentor cria uma organização". Criar a organização e a `Membership` MENTOR do criador é uma operação atômica? Isso é use case do 3.1 ou do 3.2? Hoje o 3.1 só tem os repositórios.

---

## 8. Conflitos e lacunas entre S5, ADR-003, ADR-005 e o código

| # | Onde | Conflito |
|---|---|---|
| 1 | S5 invariante 5 × este pedido | S5: unicidade por (User, Org, Role). Pedido: por (User, Org). Vira Pergunta 4. |
| 2 | S5 E1 | "retorna `null` **ou** throw `UserNotFoundError`" é ambíguo; o BDD da S5 e o código usam `null`. Adotado `null`. |
| 3 | S5 E1/E2 × código | S5 descreve `User { id, email, createdAt }`; o código também tem `name`. |
| 4 | S5 E4 × código | S5 descreve `Organization { id, name, createdAt }`; a entidade tem só `id` e `name`. Esta spec segue o código (M2). |
| 5 | S5 E5 × código | S5 diz "Membership[] com User, Organization, Role populated"; `Membership` guarda só ids e role. Esta spec segue o código (M4). Se precisar de dados populados, será outro read model. |
| 6 | S5 E2 e ADR-003 × código | `findById` consta na S5 e no ADR-003 como entregue, mas só existe `findByEmail` e `save`. Entra aqui (M1). |
| 7 | ADR-003 × padrão do repo | Nomes e caminhos (`IUserRepository`, `repositories/`, `adapters/`, token string). Já reconciliado na nota de 2026-11-09 do próprio ADR; esta spec usa o padrão real. |
| 8 | ADR-003, "Related ADRs" | Cita "ADR-004 (futuro): Quiz repositories" e "ADR-005 (futuro): API endpoints"; hoje ADR-004 é importação por modelo estruturado e ADR-005 é convite. Referências desatualizadas. |
| 9 | ADR-003, checklist | Não prevê `Invitation` nem `InvitationRepository`; só User, Organization e Membership. O ADR-005 acrescenta a entidade sem emendar o ADR-003. |
| 10 | ADR-005 × CLAUDE.md §4 e `organization.ts` | O CLAUDE.md ainda diz "Implementar lógica de convite... ainda não definida" como proibido sem aprovação, e o comentário de `organization.ts` também diz "fora de escopo". O ADR-005 fechou a decisão. Esta spec é a aprovação do escopo do convite no 3.1, mas o CLAUDE.md deveria ser atualizado. |
| 11 | ADR-005 × própria definição | Mitigação "validade curta" e "guardar apenas o hash" aparecem em Consequências, não em Decision, e sem valores. Vira Perguntas 2 e 7. |
| 12 | ADR-005 item 4 | Lista status "pendente, aceito, expirado e revogado" sem dizer se `EXPIRED` é persistido. Vira Pergunta 3. |
| 13 | AGENT.md seção 1 | Ainda diz que `identity/application` e `infra` estão vazios e que não há models Prisma de identity, mas já existem `UserRepository`, `PrismaUserRepository` e o model `User`. |

---

## 9. Validação com MCP Validator

Não executada. O `studyforge-mcp-validator` não está configurado neste ambiente (nenhum servidor MCP no `~/.claude.json` nem em `.claude/`). Ver o resumo da entrega para como conectá-lo.

---

## 10. Referências

- [S5: identity repositories](s5-identity-repositories.md)
- [ADR-003](../adrs/adr-003-identity-repositories.md), [ADR-005](../adrs/adr-005-convite-por-link-com-token.md)
- README.md seções 6, 6.1 e 8; CLAUDE.md seções 2 a 4
- LOG-RED-GREEN-REFACTOR-3.md (como provar cenários de infra sem PostgreSQL)
