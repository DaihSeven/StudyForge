# S5: Especificação — Identity Repositories

**Bounded Context:** `identity`  
**Data:** 2026-10-13  
**Status:** Especificação Completa  

---

## 📌 Linguagem Ubíqua

### Entidades

- **User:** Identidade global do usuário do sistema (mentor ou estudante). Único por email.
- **Organization:** Tenant/grupo que agrupa usuários e compartilha quizzes, material e configurações.
- **Membership:** Vínculo entre User e Organization com um Role (MENTOR ou STUDENT).
- **MembershipRole:** Enum: `MENTOR` (cria quiz, revisa), `STUDENT` (responde quiz).

### Invariantes

1. **User.organizationId:** NÃO EXISTE em User. User é global, não pertence a uma Org.
2. **Organization.organizationId:** NÃO EXISTE em Organization. Org não tem parent.
3. **Membership.organizationId:** Deve estar presente. Membership SEMPRE pertence a uma Org.
4. **Email uniqueness:** Não pode haver 2 Users com mesmo email no banco.
5. **Membership uniqueness:** Não pode haver 2 Memberships de mesmo User na mesma Org com mesmo Role.

---

## 🎯 5 Critérios EARS

### E1: FindUserByEmail (Repository Method)

| Aspecto | Descrição |
|---|---|
| **Condition (Quando)** | Um serviço de application layer precisa encontrar um User pelo email |
| **Event (O quê)** | `UserRepository.findByEmail(email: string)` é chamado |
| **Scenario (Contexto)** | Email é válido (formato RFC 5322) e existe no banco |
| **Exception (Erro)** | Email não encontrado → retorna `null` ou throw `UserNotFoundError` |
| **Result (Resultado)** | Retorna `User { id, email, createdAt }` ou `null` |

### E2: FindUserById (Repository Method)

| Aspecto | Descrição |
|---|---|
| **Condition** | Um serviço precisa carregar User por ID |
| **Event** | `UserRepository.findById(id: string)` é chamado |
| **Scenario** | ID é válido UUID e existe no banco |
| **Exception** | ID não encontrado → retorna `null` |
| **Result** | Retorna `User` completo ou `null` |

### E3: SaveUser (Repository Method)

| Aspecto | Descrição |
|---|---|
| **Condition** | Um use case precisa persistir novo User ou atualizar existente |
| **Event** | `UserRepository.save(user: User)` é chamado com entidade válida |
| **Scenario** | User passa em todas as validações de domain rules |
| **Exception** | Violação de email uniqueness → throw `DuplicateEmailError` |
| **Result** | Persiste no banco e retorna `User` com ID gerado (se novo) |

### E4: FindOrganizationById (Repository Method)

| Aspecto | Descrição |
|---|---|
| **Condition** | Um serviço precisa carregar Organization |
| **Event** | `OrganizationRepository.findById(id: string)` é chamado |
| **Scenario** | ID é válido e Org existe no banco |
| **Exception** | ID não encontrado → retorna `null` |
| **Result** | Retorna `Organization { id, name, createdAt }` ou `null` |

### E5: FindMembershipsByOrganization (Repository Method)

| Aspecto | Descrição |
|---|---|
| **Condition** | Um use case precisa listar todos os Memberships de uma Org |
| **Event** | `MembershipRepository.findByOrganization(orgId: string)` é chamado |
| **Scenario** | OrgId é válido e pode ter 0, 1 ou N Memberships |
| **Exception** | OrgId não encontrado → retorna `[]` (lista vazia) |
| **Result** | Retorna `Membership[]` com User, Organization, Role populated |

---

## 🎬 3 Cenários BDD

### Scenario 1: Encontrar User existente por email (Caso Feliz)

```gherkin
Scenario: FindUserByEmail retorna User quando email existe

Given um User com email "mentor@studyforge.com" existe no banco
And o email é único
When chamo UserRepository.findByEmail("mentor@studyforge.com")
Then retorna um User { id, email, createdAt }
And o email retornado é "mentor@studyforge.com"
And nenhum erro é lançado
```

**Entrada:**
```typescript
const email = "mentor@studyforge.com";
```

**Saída esperada:**
```typescript
{
  id: "user-uuid-123",
  email: "mentor@studyforge.com",
  createdAt: "2026-10-13T10:00:00Z"
}
```

---

### Scenario 2: Validação falha — Email não encontrado

```gherkin
Scenario: FindUserByEmail retorna null quando email não existe

Given nenhum User com email "notexist@studyforge.com" existe no banco
When chamo UserRepository.findByEmail("notexist@studyforge.com")
Then retorna null
And nenhum erro é lançado (findByEmail é lenient)
```

**Entrada:**
```typescript
const email = "notexist@studyforge.com";
```

**Saída esperada:**
```typescript
null
```

---

### Scenario 3: SaveUser falha — Email duplicado (Edge Case)

```gherkin
Scenario: SaveUser lança erro quando email já existe

Given um User com email "mentor@studyforge.com" já existe no banco
When tento salvar novo User com email "mentor@studyforge.com"
Then lança DuplicateEmailError
And a mensagem de erro contém "Email already in use"
And nenhuma alteração é feita no banco
```

**Entrada:**
```typescript
const newUser = new User({
  email: "mentor@studyforge.com",  // já existe
  createdAt: new Date()
});
```

**Saída esperada:**
```typescript
throw new DuplicateEmailError("Email already in use: mentor@studyforge.com");
```

---

## 🏗️ Estrutura de Implementação (Marco 3.1)

### Repository Interfaces (Application Layer)

**Localização:** `libs/identity/application/src/repositories/`

```typescript
// user.repository.ts
export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
}

// organization.repository.ts
export interface IOrganizationRepository {
  findById(id: string): Promise<Organization | null>;
  save(organization: Organization): Promise<Organization>;
}

// membership.repository.ts
export interface IMembershipRepository {
  findByOrganization(orgId: string): Promise<Membership[]>;
  save(membership: Membership): Promise<Membership>;
}
```

### Prisma Adapters (Infra Layer)

**Localização:** `libs/identity/infra/src/adapters/`

```typescript
// prisma-user.adapter.ts
@Injectable()
export class PrismaUserAdapter implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    // Implementação real
  }

  async findById(id: string): Promise<User | null> {
    // Implementação real
  }

  async save(user: User): Promise<User> {
    // Implementação real
  }
}
```

---

## ✅ Validação com MCP Validator

Esta spec será validada usando `studyforge-mcp-validator`:

```bash
# Comando (após implementar MCP integration)
Claude: "Validate this spec against identity bounded context rules"

# Validações:
✅ Ubíqua language: User, Organization, Membership, Role
✅ Bounded context: identity (sem misturar com quiz, course)
✅ EARS criteria: 5 completos (Condition, Event, Scenario, Exception, Result)
✅ BDD scenarios: 3 completos (Given/When/Then)
✅ Invariantes: organizationId regras respeitadas
```

---

## 📊 Cobertura

| Aspecto | Status | Detalhe |
|---|---|---|
| **Bounded Context** | ✅ | identity |
| **Entities** | ✅ | User, Organization, Membership, MembershipRole |
| **Ubiquitous Language** | ✅ | 4 termos principais + 5 invariantes |
| **EARS Criteria** | ✅ | 5 métodos (FindByEmail, FindById, Save, FindOrgById, FindMembershipsByOrg) |
| **BDD Scenarios** | ✅ | 3 cenários (feliz, not found, duplicate email) |
| **Interface** | ✅ | Definida pra Marco 3.1 |
| **Adapter** | ✅ | Sketchado pra Marco 3.1 (Prisma) |

---

## 🔗 Próximos Passos

1. **S5 Entrega:** Commitar esta spec
2. **S6:** Criar ADR-003 (justificativa arquitetural) + Tasks (checklist)
3. **S6+:** RPI evidence (notas de refinement)
4. **Marco 3.1:** Implementar repositories (Prisma adapters + testes)

---

## 📝 Referências

- **CLAUDE.md:** Regras de domain purity, organizationId invariante
- **AGENT.md:** Fluxo de desenvolvimento
- **Bounded Context:** identity (User, Organization, Membership)
- **MCP Validator:** Validar spec contra rules