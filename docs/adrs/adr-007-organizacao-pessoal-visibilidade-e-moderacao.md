# ADR-007: Organização pessoal, visibilidade e moderação

**Date:** 2026-11-10  
**Status:** Accepted  
**Decision Maker:** Responsável do projeto  
**Affected By:** README seções 6, 8 e 9, contexto `identity`, futuro contexto `quiz` (visibilidade do simulado), CLAUDE.md regra 6  

---

## Title

Todo usuário tem uma organização pessoal automática; simulados têm visibilidade `PRIVATE`, `UNLISTED` ou `PUBLIC`; um admin da plataforma (`platformRole` no `User`) modera conteúdo.

---

## Status

**Accepted** — decisão de produto tomada em 2026-11-10. **Implementação prevista depois do Marco 3.5 (publicação)**, pois depende de autenticação (3.2), quiz (3.4) e publicação (3.5). Não entra nos Marcos 3.1 nem 3.2.

---

## Context

O modelo atual pressupõe que todo recurso pertence a uma organização (CLAUDE.md regra 6: `organizationId` é invariante do construtor/factory, sem exceção para `Quiz`, `Attempt`, `Material`, `Course`). A entrada em uma organização é por convite (ADR-005).

Surgiu a necessidade de **simulados individuais** (uma pessoa que cria simulados para si, sem escola ou turma), de **simulados compartilháveis fora da organização** e de **controle de conteúdo público**. Isso levanta três perguntas: a quem pertence um simulado individual, quem pode vê-lo, e quem remove conteúdo abusivo.

---

## Decision

### 1. Organização pessoal

1. Todo usuário ganha uma **organização pessoal criada automaticamente no cadastro**, e o usuário vira `MENTOR` dela por uma `Membership` comum.
2. Simulados individuais pertencem à organização pessoal. `organizationId` continua invariante, sem exceção.
3. `Membership` e `Invitation` ficam **inalterados** (continuam valendo as decisões do ADR-005 e da spec do Marco 3.1).

### 2. Visibilidade do simulado

| Valor | Quem acessa |
|---|---|
| `PRIVATE` | Só o dono ou os membros da organização dona do simulado |
| `UNLISTED` | Qualquer pessoa com o link. O link carrega um **token longo e imprevisível**, gerado pelo sistema, como no ADR-005 (aleatório, só o hash guardado no banco) |
| `PUBLIC` | Qualquer pessoa, e o simulado **aparece na busca** da plataforma |

### 3. Admin da plataforma

O admin da plataforma é um papel **distinto de `MENTOR`**, modelado como atributo do `User` (`platformRole`), **não** como `Membership`. `MENTOR` e `STUDENT` continuam sendo papéis por organização.

### 4. Moderação

1. O admin pode **despublicar ou suspender** um simulado, registrando **motivo, data e quem decidiu**.
2. O **dono pode contestar** a decisão.
3. **Exclusão definitiva** só para casos graves.
4. Conteúdo `PUBLIC` exige um **botão de denúncia**.

### 5. Riscos assumidos e a registrar

- **Termos de uso curtos** para conteúdo de terceiros, aceitos antes de publicar algo `UNLISTED` ou `PUBLIC`.
- **LGPD:** tentativas e resultados dos alunos são dados pessoais; é preciso definir finalidade, retenção e o que o dono do simulado e o admin podem ver.
- **Abuso de conteúdo público** (spam, material protegido por direito autoral, conteúdo ofensivo).

---

## Consequences

### Positivos ✅

1. A regra 6 do CLAUDE.md fica sem exceção: todo `Quiz`, `Attempt` etc. tem `organizationId`.
2. `Membership` e `Invitation` não mudam; o convite continua sendo o único caminho para entrar na organização de outra pessoa.
3. O admin da plataforma não vira "membro de todas as organizações", o que evitaria vínculos artificiais.
4. A visibilidade é um atributo do simulado, sem criar um segundo modelo de propriedade.

### Negativos ❌ e riscos

1. Toda conta tem uma organização a mais; listagens de "minhas organizações" precisam tratar a pessoal (por exemplo, marcá-la como pessoal).
2. `User` ganha o atributo `platformRole`. Ele continua sem `organizationId`, mas deixa de ser só identidade mais vínculos. Exige alterar a entidade `User` e o model Prisma.
3. Contas já criadas antes da implementação (cadastro do Marco 3.2) **não terão organização pessoal**: será preciso uma migração/backfill.
4. `UNLISTED` e `PUBLIC` ampliam o risco jurídico e de abuso; sem moderação e denúncia, `PUBLIC` não deve ser liberado.
5. Moderação com contestação exige um processo humano, que o MVP ainda não tem.

---

## Alternatives Considered

### ❌ Alternativa 1: Dono sem organização (simulado individual com `ownerUserId`)

**Problemas:** abriria uma exceção na regra 6 (`organizationId` deixaria de ser invariante), duplicaria a lógica de propriedade (organização ou usuário) em todo recurso e em todo filtro de acesso.  
**Por que rejected:** quebra a regra mais importante do modelo de multi-tenancy.

### ❌ Alternativa 2: Admin da plataforma como `Membership` com papel `ADMIN`

**Problemas:** `Membership` é sempre por organização; o admin precisaria de uma organização especial ou de vínculo com todas.  
**Por que rejected:** mistura papel de plataforma com papel de organização.

### ✅ Alternativa 3: Organização pessoal automática + `platformRole` (ESCOLHIDA)

**Por que aceita:** preserva a invariante e o modelo `User` ↔ `Membership` ↔ `Organization`, e separa o papel global do papel por organização.

---

## Related ADRs

- **ADR-003:** Identity repositories (a organização pessoal usa `OrganizationRepository` e `MembershipRepository`)
- **ADR-005:** Convite por link com token (o token do `UNLISTED` segue o mesmo padrão)
- **ADR-006:** `course` fora do MVP 1
- **ADR-008:** Banco de questões por certificação (o admin da plataforma é quem cadastra o banco)

---

## Perguntas em aberto

1. **Tentativas e resultados quando um simulado é suspenso.** Sem decisão. Opções: (a) o aluno continua vendo o próprio histórico, somente leitura; (b) o histórico fica oculto do aluno mas preservado; (c) removido junto, com exclusão definitiva. Também falta definir se o dono ainda enxerga os resultados dos alunos de um simulado suspenso (LGPD).
2. **Convite para a organização pessoal.** O dono pode convidar outras pessoas para a própria organização pessoal (o que a transformaria numa organização compartilhada)? Ou convites ficam bloqueados nela?
3. **Backfill.** Como e quando criar a organização pessoal das contas criadas no Marco 3.2, antes desta decisão ser implementada?
4. **Quem é o primeiro admin da plataforma** e como `platformRole` é concedido ou retirado (seed, variável de ambiente, tela futura).
5. **Contestação:** canal, prazo de resposta e quem decide (o mesmo admin que suspendeu?).
6. **Denúncia:** quem pode denunciar (só usuários autenticados?), quantas denúncias disparam suspensão automática (hoje, nenhum fluxo automatizado despublica ou publica nada, ver CLAUDE.md regra 7), e como evitar denúncia abusiva.
7. **Quem pode escolher a visibilidade** de um simulado de uma organização que não é pessoal: o mentor que o criou, qualquer mentor da organização? Um simulado de organização pode ser `PUBLIC`?
8. **Token `UNLISTED`:** o link pode ser regenerado e revogado? Diferente do convite do ADR-005 (uso único), o link `UNLISTED` é reutilizável por natureza, então a revogação precisa existir.
9. **Termos de uso e retenção de dados:** texto, momento do aceite e prazo de guarda de tentativas e resultados.
10. **Valores de `platformRole`:** só `ADMIN` (e ausência de valor para usuário comum), ou há outros papéis previstos?

---

## Conflitos e pontos de atenção com os ADRs 003 a 006

| ADR | Ponto |
|---|---|
| ADR-003 | Sem conflito. A organização pessoal usa os ports `OrganizationRepository` e `MembershipRepository`. A entidade `User` precisará do atributo `platformRole`, o que o ADR-003 e a S5 não previam. |
| ADR-005 / spec do Marco 3.1 | Sem conflito de regras. A unicidade da `Membership` por (User, Org) e o "um papel por organização" valem também na organização pessoal. Ponto de atenção: o ADR-005 e a decisão 10 da spec tratam a criação de organização "de propósito" como use case do Marco 3.2 (criador vira `MENTOR`); a organização pessoal é um segundo caminho de criação, automático no cadastro, que ainda não existe (pergunta 3). |
| README seção 6 | O texto "Mentor cria uma organização" passa a ter uma exceção: a organização pessoal é criada automaticamente, para qualquer usuário, inclusive quem entrar como aluno. |
| ADR-006 | Sem conflito. A Etapa 4 passa a reunir `course`, importers de PDF/DOCX, o banco por certificação (ADR-008) e este ADR. |
| ADR-004 | Sem conflito. |
| CLAUDE.md regra 6 | Preservada: a organização pessoal existe justamente para não abrir exceção. |
| CLAUDE.md regra 7 | Relevante para a moderação: despublicar ou suspender é ação **explícita do admin**, nunca automática. |

---

## References

- README.md, seções 6, 6.1, 8 e 9
- CLAUDE.md, seção 2 (regras 6 e 7)
- [ADR-005](adr-005-convite-por-link-com-token.md), [ADR-008](adr-008-banco-de-questoes-por-certificacao.md)
- `docs/specs/marco-3-1-identity-completo.md`
