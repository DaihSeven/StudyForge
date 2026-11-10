# ADR-006: Contexto `course` fora do MVP 1

**Date:** 2026-11-10  
**Status:** Accepted  
**Decision Maker:** Responsável do projeto  
**Affected By:** README seção 8 (Roadmap), DELIVERABLES.md (Marcos 3.x)  

---

## Title

Mover o contexto `course` do MVP 1 (Etapa 3) para a Etapa 4.

---

## Status

**Accepted** — decisão de produto tomada em 2026-11-10.

---

## Context

O roadmap previa o contexto `course` (scaffold + domain) como Marco 3.3 do MVP 1. Os fluxos do MVP são: identity e convite, importação, criação, publicação e execução de quiz. Nenhum deles depende de `Course`. O princípio "nada de complexidade prematura" (README, seção 3) pede não criar contexto sem fluxo que o use.

---

## Decision

1. O contexto `course` **sai do MVP 1** e vai para a **Etapa 4**, junto com os importers de PDF e DOCX.
2. A Etapa 3 passa a ter os marcos 3.1 a 3.6 (identity, autenticação e convite, importação, quiz, publicação, execução).
3. `Course` continua listado como recurso que carrega `organizationId` (README 4.2); a regra vale quando for criado.

---

## Consequences

### Positivos ✅

1. Menos código e menos migrations no MVP.
2. Foco no caminho mais curto até um simulado publicado e respondido.

### Negativos ❌

1. Agrupar quizzes por curso só será possível na Etapa 4.
2. Se um fluxo do MVP passar a precisar de `course`, este ADR deve ser revisto.

---

## Alternatives Considered

### ❌ Alternativa 1: Manter `course` como Marco 3.3 do MVP 1

**Por que rejected:** nenhum fluxo do MVP depende dele; seria complexidade prematura.

### ✅ Alternativa 2: Mover para a Etapa 4 (ESCOLHIDA)

**Por que aceita:** entrega o MVP mais cedo e mantém o escopo enxuto.

---

## Related ADRs

- **ADR-002:** DDD bounded contexts
- **ADR-004:** Importação por modelo estruturado (importers de PDF/DOCX também na Etapa 4)
- **ADR-005:** Convite por link com token

---

## References

- README.md, seções 3, 4.2 e 8
