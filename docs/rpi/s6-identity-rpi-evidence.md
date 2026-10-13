# S6: RPI Evidence — Identity Repositories Refinement

**Date:** 2026-10-13  
**Participants:** You + AI (Claude)  
**Duration:** ~2 hours (distributed in chat sessions)  
**Output:** ADR-003 + Tasks checklist + validation plan  

---

## 🎯 O que é RPI?

RPI = **Refinement do Product Increment**

É o processo de:
1. ✅ Entender o problema (S5 spec → entidades, ubíqua language)
2. ✅ Decidir a solução (S6 ADR → repository pattern, ports & adapters)
3. ✅ Detalhar a implementação (S6 tasks → 25 tasks em 7 phases)
4. ✅ Validar a arquitetura (ESLint + MCP validator)

---

## 📝 Decisões Refinadas

### D1: Repository Pattern em Application Layer (não domain, não inline)

**Problema identificado:**
- S5 spec define 3 métodos (FindByEmail, FindById, Save)
- Mas onde colocar o código de persistência?

**Opções consideradas:**
- ❌ Opção A: Prisma direto em use cases (acoplamento)
- ❌ Opção B: Repository em domain (anti-pattern DDD)
- ✅ Opção C: Porta em application, adapter em infra (ESCOLHIDA)

**Decisão:**

Criar interface IUserRepository em application/
Implementar com Prisma em infra/adapters/
Domain fica puro (sem persistência)


**Evidência:** ADR-003, seção "Alternatives Considered"

---

### D2: Métodos Obrigatórios vs Opcionais

**Problema identificado:**
- S5 spec tinha 5 EARS criteria
- Mas repository precisa de quais métodos EXATOS?

**Refinamento:**
- FindByEmail → necessário (login use case)
- FindById → necessário (verificar ownership)
- Save → necessário (criar/atualizar)
- Delete → opcional (não mencionado em S5)
- Update → não, Save faz update também

**Evidência:** ADR-003, seção "Decision" (interfaces `IUserRepository`)

---

### D3: Error Handling — DuplicateEmailError

**Problema identificado:**
- S5 scenario 3 dizia: "SaveUser com email duplicado → throws erro"
- Mas qual erro? Como capturar?

**Refinamento:**
- Prisma lança `P2002` (unique constraint violation)
- Adapter converte em `DuplicateEmailError` (domínio entende)
- Use cases pegam `DuplicateEmailError` e tratam

**Evidência:** Task 2.1, Task 4.1 (error handling, Prisma `P2002`)

---

### D4: Testes — Adapter vs Domain vs Integration

**Problema identificado:**
- Quantos testes? Onde?
- Unit tests só de adapter ou também de domain?

**Refinamento:**
- Unit tests de adapter: 8 testes cada (Prisma behavior)
- Unit tests de domain: entities (já existem, 21 testes da S3)
- Integration tests: adapter + domain junto (5 testes)
- Total: 24 adapter + 5 integration = 29 testes novos

**Evidência:** Task 4.1–4.4 (testes detalhados, total ~20+ testes)

---

### D5: Migrations Prisma — Quando fazer?

**Problema identificado:**
- Criar tabelas antes ou depois de adapters?
- Schema Prisma já existe?

**Refinamento:**
- Primeiro: criar schema User, Organization, Membership em `schema.prisma`
- Depois: rodar `npx prisma migrate dev --name create-user`
- Depois: implementar adapters
- Depois: testes

**Evidência:** Phase 3 (Task 3.1–3.3), implementação sequencial

---

### D6: NestJS @Injectable() decorator

**Problema identificado:**
- Adapters precisam de @Injectable() pra dependency injection?
- Ou é opcional?

**Refinamento:**
- ✅ @Injectable() obrigatório pra NestJS DI
- Sem isso, não consegue injetar em use cases
- Module resolve os providers via tokens ('IUserRepository')

**Evidência:** Task 2.1 (Class `@Injectable()`), ADR-003 (seção "Decision", NestJS module)

---

## 💡 Conversas-chave que levaram às decisões

### Conversa 1: Repository Pattern vs Direct Prisma

User: “Preciso persistir User. Uso Prisma direto ou repository?”

AI: “Repository pattern (porta em application, adapter em infra).
Vantagens:

Testável (mock repository)
Flexível (trocar Prisma depois)
DDD puro (domain sem Prisma)
Segue CLAUDE.md regra 4"

Decision: Repository Pattern (ADR-003 aceita)


### Conversa 2: Quais métodos?

User: “S5 tinha 5 EARS criteria. Mas são 5 métodos diferentes ou 3 métodos?”

AI: “3 métodos (FindByEmail, FindById, Save).
5 EARS é sobre critérios/regras, não métodos.
Cada método tem seus próprios EARS criteria.”

Decision: 3 métodos por repository (Task 1.1–1.3)


### Conversa 3: Error handling

User: “S5 dizia ‘DuplicateEmailError’ mas como capturar do Prisma?”

AI: “Prisma lança P2002 (unique constraint).
Adapter converte em DuplicateEmailError.
Domain conhece DuplicateEmailError, não P2002.”

Decision: Error mapping em adapter (Task 2.1)


### Conversa 4: Testes

User: “Quantos testes precisa? Só adapter ou também domain?”

AI: “3 níveis:

Domain tests (já existem, S3)
Adapter tests (novo, 8 tests cada adapter)
Integration tests (novo, 5 tests)
Total: +30 testes”

Decision: 3 níveis de teste (Task 4.1–4.4)


### Conversa 5: Implementação order

User: “Começo com interfaces ou com Prisma?”

AI: “Ordem:

Criar interfaces (application/)
Criar schema Prisma
Criar adapters
Criar testes
Commit”

Decision: Fase sequencial (7 phases, Task 1–7)


---

## 📊 Evidência Numérica

| Artefato | Versão | Status |
|---|---|---|
| **S5 Spec** | 1.0 | ✅ Completa (3 BDD scenarios) |
| **ADR-003** | 1.0 | ✅ Completa (7 seções) |
| **Tasks Checklist** | 1.0 | ✅ 25 tasks em 7 phases |
| **RPI Evidence** | 1.0 | ✅ Este documento |
| **Testes Planejados** | — | 29 testes (+adapter +integration) |
| **Commits Planejados** | — | 1 commit (feat: repositories) |

---

## ✅ Aprovações

- **Spec S5:** ✅ Aceita
- **ADR-003:** ✅ Aceita
- **Tasks:** ✅ Ready to implement
- **RPI:** ✅ Completa

---

## 📌 Próximo

1. Implementar 25 tasks (Marco 3.1)
2. Validar com ESLint + MCP
3. Commitar
4. Começar S7 (3 specs Quiz)

---

## Notas

- RPI evidence = documentação do pensamento/refinamento
- Pode ser continuado em sessões separadas se necessário
- Todas as decisões estão justificadas (ADR + Tasks)