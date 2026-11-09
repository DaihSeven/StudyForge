# ADR-003: Identity Repositories (FindByEmail, FindById, Save)

**Date:** 2026-10-13  
**Status:** Accepted  
**Decision Maker:** Study Team (Mentor + AI)  
**Affected By:** S5 Spec (identity repositories), Marco 3.1 Implementation  

---

## Title

Implementar repositories pattern para User, Organization e Membership com métodos FindByEmail, FindById, Save no contexto `identity`.

---

## Status

**Accepted** — Decisão aprovada, pronta pra implementação em Marco 3.1.

---

## Context

### Problema

Após escrever a S5 spec (bounded context `identity`), precisamos decidir:

1. **Como persistir User, Organization, Membership?**
   - Opção A: Usar `PrismaService` direto nos use cases (acoplamento)
   - Opção B: Criar interface `IUserRepository` e adapters (inversão de dependência)

2. **Quais métodos são obrigatórios?**
   - FindByEmail (usar case: login)
   - FindById (usar case: verificar ownership)
   - Save (usar case: criar/atualizar)

3. **Como garantir que repositories respeitam DDD?**
   - Application layer define portas (interfaces)
   - Infra layer implementa adapters (Prisma, MongoDB, etc)
   - Domain layer NÃO conhece repository

### Constraints

- **CLAUDE.md regra 1:** Domain libs não podem importar de infra
- **CLAUDE.md regra 4:** Ports devem estar em application, não domain
- **ESLint:** `scope:identity` pode importar `scope:shared` + `scope:identity`
- **DDD:** Aggregate root = User, Organization, Membership (bounded context `identity`)

### Motivação

A S5 spec define 3 BDD scenarios que dependem de repository:

1. FindUserByEmail(email) → User | null
2. FindUserById(id) → User | null
3. SaveUser(user) → throws DuplicateEmailError

Precisamos de uma arquitetura que:
- ✅ Suporte múltiplos adapters (Prisma agora, MongoDB depois)
- ✅ Seja testável (mock repository em unit tests)
- ✅ Respeite DDD (domain puro, ports em application)
- ✅ Siga CLAUDE.md (sem imports ilegais)

---

## Decision

**Implementar Repository Pattern com Ports & Adapters:**

### Estrutura (Marco 3.1)

libs/identity/
├── domain/
│ └── src/
│ └── entities/ (User, Organization, Membership — domain puro)
│
├── application/
│ └── src/
│ └── repositories/ (Portas/interfaces — application defines)
│ ├── user.repository.ts (IUserRepository)
│ ├── organization.repository.ts (IOrganizationRepository)
│ └── membership.repository.ts (IMembershipRepository)
│
└── infra/
└── src/
└── adapters/ (Adapters — infra implements)
├── prisma-user.adapter.ts
├── prisma-organization.adapter.ts
└── prisma-membership.adapter.ts


### Métodos obrigatórios (baseado em S5 EARS)

#### IUserRepository

```typescript
interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;  // throws DuplicateEmailError
}
```

#### IOrganizationRepository

```typescript
interface IOrganizationRepository {
  findById(id: string): Promise<Organization | null>;
  save(organization: Organization): Promise<Organization>;
}
```

#### IMembershipRepository

```typescript
interface IMembershipRepository {
  findByOrganization(orgId: string): Promise<Membership[]>;
  save(membership: Membership): Promise<Membership>;
}
```

### Dependency Injection (NestJS)

```typescript
// identity-infra.module.ts
@Module({
  providers: [
    {
      provide: 'IUserRepository',
      useClass: PrismaUserAdapter,  // pode trocar pra MongoUserAdapter depois
    },
    // ... outros adapters
  ],
})
export class IdentityInfraModule {}
```

### Validação (com MCP validator em S6+)

Claude: “Validate this ADR against architecture rules”

MCP checks:
✅ Ports estão em application/ (não domain/)
✅ Domain/ é puro (sem Prisma imports)
✅ Scope boundaries: identity → [shared, identity]
✅ 7 seções obrigatórias presentes


---

## Consequences

### Positivos ✅

1. **Testabilidade:** Mock repositories em unit tests (sem banco real)
2. **Flexibilidade:** Trocar Prisma por MongoDB depois sem mexer em domain/application
3. **DDD puro:** Domain entidades não conhecem persistência
4. **CLAUDE.md compliant:** Respeita regra 4 (ports em application)
5. **Escala:** Novos bounded contexts (quiz, course) seguem mesmo pattern

### Negativos ❌

1. **Boilerplate:** 3 interfaces + 3 adapters por context (necessário)
2. **Complexity:** Mais classes, mais IndInjection (standard NestJS)
3. **Testes:** Precisa testar adapter (Prisma) separado de domain logic (mais testes)

### Mitigation

- Skill `bounded-context-scaffolder` (S3) gera boilerplate automaticamente
- Testes de adapter são simples (mocking de `PrismaService.user.findUnique()`)
- Documentação clara em CLAUDE.md e AGENT.md

---

## Alternatives Considered

### ❌ Alternativa 1: Usar Prisma direto em use cases

```typescript
// ❌ BAD: acoplamento com infra
export class LoginUseCase {
  constructor(private prisma: PrismaService) {}
  
  async execute(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }
}
```

**Problemas:**
- ❌ Acoplamento tight com Prisma
- ❌ Difícil de testar (precisa banco real)
- ❌ Violar CLAUDE.md regra 4
- ❌ Não reutilizável em outros contexts

**Por que rejected:** Viola arquitetura DDD e CLAUDE.md.

---

### ❌ Alternativa 2: Repository em domain/ (anti-pattern)

```typescript
// ❌ BAD: domain conhece persistência
@Entity()
export class User {
  static repository: UserRepository;
  
  static async findByEmail(email) {
    return this.repository.find(email);  // ❌ BAD
  }
}
```

**Problemas:**
- ❌ Domain perde pureza (estático, global)
- ❌ Difícil de testar (lado effects)
- ❌ Não segue DDD
- ❌ ESLint `scope:import` não permitiria isso

**Por que rejected:** Anti-pattern DDD, violaria ESLint rules.

---

### ✅ Alternativa 3: Repository em application/ (ESCOLHIDA)

```typescript
// ✅ GOOD: application define porta
export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
}

// infra implementa
@Injectable()
export class PrismaUserAdapter implements IUserRepository {
  async findByEmail(email) {
    return this.prisma.user.findUnique({ where: { email } });
  }
}
```

**Vantagens:**
- ✅ Domain puro (sem Prisma)
- ✅ Fácil de testar (mock IUserRepository)
- ✅ Segue DDD
- ✅ CLAUDE.md compliant
- ✅ Flexível (trocar adapter depois)

**Por que aceita:** Best practice DDD + arquitetura testável.

---

## Nota de implementação (2026-11-09, Semana 8)

A implementação seguiu o **padrão já usado no contexto `import`**, e não os nomes e caminhos ilustrativos deste ADR:

| Neste ADR | Como foi implementado |
|---|---|
| `IUserRepository` | `UserRepository` |
| `application/src/repositories/user.repository.ts` | `application/src/lib/ports/user.repository.ts` |
| `infra/src/adapters/prisma-user.adapter.ts` (`PrismaUserAdapter`) | `infra/src/lib/user/prisma-user.repository.ts` (`PrismaUserRepository`) |
| token string `'IUserRepository'` | `USER_REPOSITORY_TOKEN = Symbol('UserRepository')` |

**Por quê:** a decisão deste ADR (ports em application, adapters Prisma em infra) não muda. Só a forma: um único padrão no repo inteiro facilita achar e comparar código entre contextos, e o token `Symbol` segue o CLAUDE.md (ports com `InjectionToken`) e evita colisão de strings. Até aqui só existem `findByEmail` e `save`, os métodos que os cenários BDD da S5 exigem. Detalhes em [`LOG-RED-GREEN-REFACTOR-1.md`](../../LOG-RED-GREEN-REFACTOR-1.md).

---

## Related ADRs

- **ADR-001:** Monorepo Nx com scope boundaries (S2)
- **ADR-002:** DDD bounded contexts + CLAUDE.md (S3)
- **ADR-004** (futuro): Quiz repositories (S7)
- **ADR-005** (futuro): API endpoints + controllers (Marco 3.3)

---

## Questions Answered

**Q: Por que não usar Active Record (Sequelize, TypeORM)?**  
A: Repository pattern é mais flexível. Active Record acoplaria domain com ORM.

**Q: Precisa fazer @Injectable() no adapter?**  
A: Sim, pra NestJS dependency injection funcionar. Sem isso, não consegue injetar em use cases.

**Q: E se quiser trocar Prisma por MongoDB depois?**  
A: Só criar novo adapter `MongoUserAdapter implements IUserRepository`. Use cases não mexem.

**Q: Quantos testes precisa de adapter?**  
A: Unit tests do adapter testam cada método (findByEmail, findById, save). ~8 testes por adapter.

---

## Implementation Checklist (Marco 3.1)

- [ ] Criar `libs/identity/application/src/repositories/user.repository.ts` (interface)
- [ ] Criar `libs/identity/application/src/repositories/organization.repository.ts`
- [ ] Criar `libs/identity/application/src/repositories/membership.repository.ts`
- [ ] Criar `libs/identity/infra/src/adapters/prisma-user.adapter.ts` (implementação)
- [ ] Criar `libs/identity/infra/src/adapters/prisma-organization.adapter.ts`
- [ ] Criar `libs/identity/infra/src/adapters/prisma-membership.adapter.ts`
- [ ] Criar migrations Prisma (User, Organization, Membership tables)
- [ ] Testes de adapter (8 testes por adapter, ~24 testes total)
- [ ] Testes de integração (use cases com repository mockado)
- [ ] Validar com ESLint + MCP validator

---

## Validation with MCP Validator (S6+)

```bash
# Comando (após implementar integração MCP)
Claude: "Validate this ADR against identity repositories architecture rules"

# Validações:
✅ Title: presente e descritivo
✅ Status: válido (Proposed|Accepted|Deprecated|Superseded)
✅ Context: explica o problema
✅ Decision: clara e justificada
✅ Consequences: positivos + negativos
✅ Alternatives: alternativas consideradas
✅ Related ADRs: links pra ADRs relacionadas

# MCP também valida implementação:
✅ Ports em application/ (não domain/)
✅ Domain é puro (sem imports de infra)
✅ Scope boundaries respeitados
```

---

## Approval

- **Reviewed by:** Study Team + AI
- **Approved:** 2026-10-13
- **Next review:** Após implementação Marco 3.1 (se necessário)

---

## References

- S5 Spec: `docs/specs/s5-identity-repositories.md`
- CLAUDE.md: Rules + constraints
- AGENT.md: Development flow
- MCP Validator: `https://github.com/DaihSeven/studyforge-mcp-validator`
