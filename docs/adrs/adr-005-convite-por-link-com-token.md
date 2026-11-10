# ADR-005: Convite por link com token

**Date:** 2026-11-10  
**Status:** Accepted  
**Decision Maker:** Responsável do projeto  
**Affected By:** README seção 6 (Multi-tenancy), Marcos 3.1 e 3.2, contexto `identity`  

---

## Title

Entrada em organização por convite com link: entidade `Invitation`, token e aceite após Google OAuth.

---

## Status

**Accepted** — decisão de produto tomada em 2026-11-10. Fecha a decisão em aberto sobre convite/aprovação/código de entrada.

---

## Context

O README dizia que os detalhes de convite, aprovação ou código de entrada estavam por definir, e o CLAUDE.md proíbe implementar essa lógica sem aprovação. O modelo já tem `User` (identidade global) e `Membership` (vínculo com a organização, ver README 6.1). Falta definir como a `Membership` nasce.

---

## Decision

1. O professor gera um convite: entidade **`Invitation`** no contexto `identity`, com `organizationId`, email, papel, token, validade e status.
2. O aluno abre o link, **autentica com Google OAuth** (Marco 3.2) e **aceita**; o sistema cria a `Membership` com o papel do convite.
3. No MVP o professor **copia e envia o link por conta própria**. Envio automático de email fica para depois.
4. O token é gerado pelo sistema, de uso único e com validade. Status possíveis: pendente, aceito, expirado e revogado.
5. O aceite é um use case explícito em `identity/application`; controllers apenas chamam o use case.

---

## Consequences

### Positivos ✅

1. Sem infraestrutura de email no MVP.
2. A `Membership` só nasce por ação explícita (aceite), com papel definido pelo professor.
3. `Invitation` carrega `organizationId` como invariante, como todo recurso da organização.

### Negativos ❌ e riscos

1. **Vazamento do link:** quem tiver o link pode tentar aceitar. Mitigação: token de uso único, validade curta e conferência do email do Google com o email do convite.
2. **Expiração:** convite vencido precisa ser reemitido pelo professor.
3. **Token em texto puro no banco** seria um risco; guardar apenas o hash do token.
4. O professor depende de um canal externo para enviar o link.

---

## Alternatives Considered

### ❌ Alternativa 1: Envio automático de email

**Problemas:** exige provedor e infraestrutura de email, filas e tratamento de falhas de entrega.  
**Por que rejected (por ora):** complexidade prematura; fica para depois do MVP.

### ❌ Alternativa 2: Código de entrada da organização

**Problemas:** código reutilizável e fácil de compartilhar, sem papel nem aluno definidos, difícil de revogar.  
**Por que rejected:** menos controle sobre quem entra e com qual papel.

### ✅ Alternativa 3: Convite por link com token (ESCOLHIDA)

**Por que aceita:** controle por convite, sem infraestrutura de email no MVP.

---

## Nota de detalhamento (2026-11-10, spec do Marco 3.1)

- **Validade padrão:** 7 dias.
- **Token:** 32 bytes aleatórios; no banco fica só o **SHA-256** do token (hash feito pelo use case via port `TokenHasher`).
- **Status `EXPIRED`:** calculado a partir de `expiresAt`, não persistido. No banco ficam `PENDING`, `ACCEPTED` e `REVOKED`.

Decisões completas em [`docs/specs/marco-3-1-identity-completo.md`](../specs/marco-3-1-identity-completo.md), seção 7.

---

## Related ADRs

- **ADR-003:** Identity repositories
- **ADR-004:** Importação por modelo estruturado
- **ADR-006:** `course` fora do MVP 1

---

## References

- README.md, seções 6, 6.1 e 8 (Marcos 3.1 e 3.2)
- CLAUDE.md, seção 4
