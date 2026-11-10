# ADR-004: Importação por modelo estruturado, sem IA paga

**Date:** 2026-11-10  
**Status:** Accepted  
**Decision Maker:** Responsável do projeto  
**Affected By:** README seção 7 (Stack), Marco 3.3, port `QuestionImporter` (antes descrita como `AiQuestionExtractor`)  

---

## Title

Importar questões por um modelo estruturado (JSON e Markdown) validado com Zod, sem provedor de IA paga.

---

## Status

**Accepted** — decisão de produto tomada em 2026-11-10. Substitui a decisão em aberto sobre o provedor de IA do README e do CLAUDE.md.

---

## Context

O README previa extração de questões por IA, com a escolha de um provedor (Claude, OpenAI, Gemini ou Mistral) em aberto. O projeto não terá IA paga. Ainda assim, o mentor precisa transformar material em `DraftQuestion[]` sem digitar questão por questão.

Restrições que continuam valendo:

- O núcleo de quiz nunca conhece a origem do conteúdo, e `import` nunca depende de `quiz` (CLAUDE.md, regras 4 e 7).
- O importador produz `DraftQuestion[]`; a publicação é sempre uma ação explícita do mentor.
- Tipos de questão fixos: `SINGLE_CHOICE` (A–D, 1 correta) e `MULTIPLE_CHOICE` (A–E, 2 corretas).

---

## Decision

1. O formato de entrada é um **modelo estruturado** em **JSON** e **Markdown**, validado com Zod em `shared/contracts`.
2. O sistema **oferece o modelo para download**. Quem quiser pode pedir a uma IA externa que o preencha; o resultado é aceito **se for válido**, e o sistema não sabe nem se importa como foi preenchido.
3. A validação devolve **erros claros por questão** (qual questão, qual campo, qual regra).
4. A porta de aplicação se chama `QuestionImporter`, com os adaptadores `JsonImporter` e `MarkdownImporter` (Marco 3.3). Ela produz `DraftQuestion[]`, que passam pela revisão do mentor antes de qualquer publicação.
5. Importers de **PDF e DOCX ficam para depois do MVP 1** (Etapa 4), só para materiais que sigam o modelo. Candidatas gratuitas: `pdfjs-dist` ou `pdf-parse` (PDF) e `mammoth` (DOCX).

---

## Consequences

### Positivos ✅

1. Sem custo por token e sem dependência de provedor externo.
2. Resultado determinístico e testável sem rede (domain/application com fakes).
3. Erros por questão deixam o mentor corrigir o arquivo em vez de adivinhar.
4. A porta aceita novos adaptadores (PDF/DOCX) sem mexer em `quiz`.

### Negativos ❌

1. Formato rígido: material fora do modelo não é importado.
2. O mentor (ou uma IA externa que ele use) precisa preencher o modelo.
3. A qualidade do conteúdo gerado por IA externa não é garantida; só a validade estrutural.

### Mitigation

- Modelo de exemplo para download, com instruções claras.
- Revisão obrigatória do mentor sobre cada `DraftQuestion` antes da publicação.

---

## Alternatives Considered

### ❌ Alternativa 1: Provedor de IA paga (Claude, OpenAI, Gemini, Mistral)

**Problemas:** custo recorrente por token, dependência externa, resultado não determinístico e decisão de provedor que o projeto não quer assumir.  
**Por que rejected:** o projeto não terá IA paga.

### ❌ Alternativa 2: Extração livre de PDF/DOCX já no MVP 1

**Problemas:** texto de PDF/DOCX não tem estrutura confiável; sem IA, a extração de questões e alternativas seria frágil e geraria muitos `DraftQuestion` inválidos.  
**Por que rejected:** complexidade prematura; fica para a Etapa 4, restrita a materiais que sigam o modelo.

### ✅ Alternativa 3: Modelo estruturado (JSON/Markdown) com validação Zod (ESCOLHIDA)

**Por que aceita:** gratuita, testável e compatível com a revisão do mentor.

---

## Related ADRs

- **ADR-001:** Monorepo Nx com scope boundaries
- **ADR-002:** DDD bounded contexts
- **ADR-005:** Convite por link com token
- **ADR-006:** `course` fora do MVP 1

---

## References

- README.md, seções 7, 8 e 9
- CLAUDE.md, seções 2 e 4
