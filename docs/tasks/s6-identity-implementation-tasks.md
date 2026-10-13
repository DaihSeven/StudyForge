# S6: Tasks — Identity Repositories Implementation (Marco 3.1)

**Baseado em:** ADR-003 + S5 Spec  
**Status:** Ready to implement  
**Assignee:** You  
**Due:** Marco 3.1  

---

## 📋 Checklist de Implementação

### Phase 1: Repository Interfaces (Application Layer)

- [ ] **Task 1.1:** Criar arquivo `libs/identity/application/src/repositories/user.repository.ts`
  - [ ] Interface `IUserRepository`
  - [ ] Métodos: `findByEmail()`, `findById()`, `save()`
  - [ ] Documentação (JSDoc)
  - [ ] Localização: application/ (não domain/)

- [ ] **Task 1.2:** Criar `libs/identity/application/src/repositories/organization.repository.ts`
  - [ ] Interface `IOrganizationRepository`
  - [ ] Métodos: `findById()`, `save()`
  - [ ] ESLint check: `scope:identity` import apenas `scope:shared` + `scope:identity`

- [ ] **Task 1.3:** Criar `libs/identity/application/src/repositories/membership.repository.ts`
  - [ ] Interface `IMembershipRepository`
  - [ ] Métodos: `findByOrganization()`, `save()`
  - [ ] Error handling: `DuplicateMembershipError`

- [ ] **Task 1.4:** Criar barrel export `libs/identity/application/src/repositories/index.ts`
  - [ ] `export * from './user.repository';`
  - [ ] `export * from './organization.repository';`
  - [ ] `export * from './membership.repository';`

---

### Phase 2: Prisma Adapters (Infra Layer)

- [ ] **Task 2.1:** Criar `libs/identity/infra/src/adapters/prisma-user.adapter.ts`
  - [ ] Class `PrismaUserAdapter implements IUserRepository`
  - [ ] `@Injectable()` decorator
  - [ ] Implementar `findByEmail()` com Prisma
  - [ ] Implementar `findById()` com Prisma
  - [ ] Implementar `save()` com Prisma
  - [ ] Error handling: capturar `P2002` (unique constraint) → throw `DuplicateEmailError`

- [ ] **Task 2.2:** Criar `libs/identity/infra/src/adapters/prisma-organization.adapter.ts`
  - [ ] Class `PrismaOrganizationAdapter implements IOrganizationRepository`
  - [ ] Implementar métodos com Prisma

- [ ] **Task 2.3:** Criar `libs/identity/infra/src/adapters/prisma-membership.adapter.ts`
  - [ ] Class `PrismaMembershipAdapter implements IMembershipRepository`
  - [ ] Implementar métodos com Prisma
  - [ ] Error handling: unique constraint (userId + orgId + role)

- [ ] **Task 2.4:** Criar barrel export `libs/identity/infra/src/adapters/index.ts`

---

### Phase 3: Database Migrations (Prisma)

- [ ] **Task 3.1:** Criar migration `Create User table`
  - [ ] Coluna: `id` (UUID, primary key)
  - [ ] Coluna: `email` (string, unique, indexed)
  - [ ] Coluna: `createdAt` (timestamp)
  - [ ] Command: `npx prisma migrate dev --name create-user`

- [ ] **Task 3.2:** Criar migration `Create Organization table`
  - [ ] Coluna: `id` (UUID, primary key)
  - [ ] Coluna: `name` (string)
  - [ ] Coluna: `createdAt` (timestamp)

- [ ] **Task 3.3:** Criar migration `Create Membership table`
  - [ ] Coluna: `id` (UUID, primary key)
  - [ ] Coluna: `userId` (foreign key → User.id)
  - [ ] Coluna: `organizationId` (foreign key → Organization.id)
  - [ ] Coluna: `role` (enum: MENTOR, STUDENT)
  - [ ] Coluna: `createdAt` (timestamp)
  - [ ] Constraint: unique(userId, organizationId, role)

---

### Phase 4: Testes (Unit + Integration)

- [ ] **Task 4.1:** Criar `libs/identity/infra/__tests__/adapters/prisma-user.adapter.test.ts`
  - [ ] Test: findByEmail com email que existe → retorna User
  - [ ] Test: findByEmail com email que não existe → retorna null
  - [ ] Test: findById com id que existe → retorna User
  - [ ] Test: findById com id que não existe → retorna null
  - [ ] Test: save novo User → gera ID e persiste
  - [ ] Test: save User com email duplicado → throws DuplicateEmailError
  - [ ] Test: save atualizar User existente → atualiza createdAt não muda
  - [ ] Test: save retorna User com ID gerado
  - [ ] Total: 8 testes ✅

- [ ] **Task 4.2:** Criar `libs/identity/infra/__tests__/adapters/prisma-organization.adapter.test.ts`
  - [ ] Similar pra Organization (4 testes)

- [ ] **Task 4.3:** Criar `libs/identity/infra/__tests__/adapters/prisma-membership.adapter.test.ts`
  - [ ] Similar pra Membership (4 testes)
  - [ ] Test: findByOrganization com nenhum membership → retorna []
  - [ ] Test: findByOrganization com N memberships → retorna array ordenado

- [ ] **Task 4.4:** Criar integration tests
  - [ ] Test: salvar User, depois findByEmail funciona
  - [ ] Test: salvar Organization + Membership, depois findByOrganization lista memberships
  - [ ] Total: ~5 integration tests

- [ ] **Task 4.5:** Rodar todos os testes
  - [ ] Command: `npx nx test identity-infra`
  - [ ] Esperado: 20+ testes passando ✅

---

### Phase 5: Validação Arquitetural

- [ ] **Task 5.1:** ESLint check
  - [ ] Command: `npx nx lint identity-domain` → sem erros
  - [ ] Command: `npx nx lint identity-application` → sem erros
  - [ ] Command: `npx nx lint identity-infra` → sem erros
  - [ ] Validar: `scope:identity` imports apenas `scope:shared` + `scope:identity`

- [ ] **Task 5.2:** MCP Validator (S6+)
  - [ ] Comando: Claude Code: "Validate ADR-003 against architecture rules"
  - [ ] MCP checks: 7 seções + ports em application + domain puro
  - [ ] Resultado: ✅ OK

- [ ] **Task 5.3:** Code review (self ou mentor)
  - [ ] Review: interfaces estão bem definidas?
  - [ ] Review: error handling é completo?
  - [ ] Review: documentação é clara?
  - [ ] Review: segue ADR-003?

---

### Phase 6: Integração com IdentityInfraModule

- [ ] **Task 6.1:** Atualizar `libs/identity/infra/src/identity-infra.module.ts`
  - [ ] Provider: `PrismaUserAdapter` com token `'IUserRepository'`
  - [ ] Provider: `PrismaOrganizationAdapter` com token `'IOrganizationRepository'`
  - [ ] Provider: `PrismaMembershipAdapter` com token `'IMembershipRepository'`
  - [ ] Export providers pra outros contexts

- [ ] **Task 6.2:** Atualizar `libs/identity/application/src/identity-application.module.ts`
  - [ ] Import repositories barrel export
  - [ ] Re-export pra domain e use cases

---

### Phase 7: Commit + Entrega

- [ ] **Task 7.1:** Commit local
  - [ ] `git add libs/identity/`
  - [ ] `git commit -m "feat(identity): repositories + Prisma adapters"`

- [ ] **Task 7.2:** Rodar build final
  - [ ] `npx nx run-many -t lint test build`
  - [ ] Esperado: todos projetos passando (11 projetos, 130+ testes)

- [ ] **Task 7.3:** Push
  - [ ] `git push origin main`

- [ ] **Task 7.4:** Verificar PR/Commit no GitHub
  - [ ] Link: `https://github.com/DaihSeven/StudyForge/commit/...`

---

## 📊 Estimativa

| Phase | Tasks | Tempo |
|---|---|---|
| 1. Interfaces | 4 tasks | 30 min |
| 2. Adapters | 4 tasks | 1h |
| 3. Migrations | 3 tasks | 20 min |
| 4. Testes | 5 tasks | 2h |
| 5. Validação | 3 tasks | 30 min |
| 6. Integração | 2 tasks | 30 min |
| 7. Commit | 4 tasks | 20 min |
| **TOTAL** | **25 tasks** | **~5h** |

---

## Notas

- Todos os testes devem passar antes de commitar
- Se erro Prisma, checar migrations
- Se erro ESLint, checar imports (scope boundaries)
- Documentar cada método com JSDoc
- Usar tipos TypeScript (não `any`)

---

## Próximo

Após implementar todas as tasks:
- Commitar no GitHub
- Atualizar DELIVERABLES.md (Marco 3.1 = ✅ Entregue)
- Começar S7 (3 specs Quiz)