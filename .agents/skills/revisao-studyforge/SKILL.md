---
name: revisao-studyforge
description: Use ao revisar um diff ou PR do StudyForge. Confere quatro regras do CLAUDE.md que o ESLint não pega (fronteiras semânticas entre camadas e contextos, organizationId como invariante, nada publica sozinho, teste que não prova o cenário da spec) e devolve achados classificados como BLOQUEIA, SUGESTÃO ou DÚVIDA, com arquivo:linha.
---

# Revisão do StudyForge

Revisão de diff focada no que o `npm run lint`, o `typecheck` e o CI **não** garantem. Não repita o que o lint já barra: imports entre `scope:quiz`, `scope:import` e `scope:identity`, `type:application` importando lib `type:infra`, e `type:domain` com import externo já falham no `enforce-module-boundaries` (`eslint.config.mjs`). Também não comente estilo, formatação ou nomes, a menos que contrariem o CLAUDE.md.

Fontes de verdade: `CLAUDE.md` (como trabalhar no código), `README.md` (produto) e as specs em `docs/specs/`. Antes de revisar, leia as partes do `CLAUDE.md` citadas abaixo e, se o diff tocar um contexto com spec, a spec dele (hoje: `docs/specs/s5-identity-repositories.md` e `docs/specs/marco-3-1-identity-completo.md`).

## O que olhar

### 1. Fronteiras que o lint não pega

Origem: CLAUDE.md §1, §2 regras 1, 3 e 5, §3 ("Repositórios").

- **Lógica de negócio fora de `domain`/`application` (regra 1).** Controller, resolver ou service da `apps/api` que decide algo de negócio, por exemplo escolher `SINGLE_CHOICE` pelo número de corretas, validar invariante, mudar status. Controller só recebe DTO validado, chama um use case e mapeia a saída.
- **`application` usando Prisma direto (regra 3, §3).** O lint barra libs `type:infra` (inclusive `@studyforge/shared/prisma`), mas só a camada `domain` tem `allowedExternalImports: []`. Um `import` do pacote `@prisma/client` (ou `@prisma/adapter-pg`, `pg`) em `*/application` passa no lint. Port ou use case com tipo do Prisma na assinatura também conta.
- **Repositório vazando Prisma (§3).** Adapter em `*/infra` que devolve linha do Prisma em vez da entidade de domínio, ou que deixa o erro do Prisma (`P2002`, `P2003`) sair sem traduzir para erro de `application`.
- **`quiz` conhecendo a origem do conteúdo (§1).** Campo, enum, `if` ou nome em `quiz/*` que dependa de PDF, texto colado, importação ou IA. O lint não vê isso se o dado chegar por `shared/contracts`.
- **Lógica em `shared/contracts` (regra 5).** Só tipos, enums e schemas Zod. Uma invariante de domínio escrita como `refine` ou função ali é sinal de modelagem errada: classificar como DÚVIDA e pedir para avisar o usuário, como manda a regra.

### 2. `organizationId` como invariante

Origem: CLAUDE.md §2 regra 6; README seção 6.1; spec do Marco 3.1, invariantes 6 e 12.

- `Quiz`, `DraftQuestion`, `Attempt`, `Material`, `Course`, `Membership` e `Invitation` recebem `organizationId` na factory/construtor, validado (`OrganizationId`), nunca opcional (`organizationId?`), com default ou preenchido depois.
- Port, repositório e query que listam ou buscam recurso de organização filtram por `organizationId`. Busca só por `id`, sem organização, em recurso de organização é achado (a não ser que a spec diga o contrário, como `findByTokenHash` do convite no M8).
- Use case que recebe `organizationId` do cliente sem conferir vínculo do usuário com a organização: DÚVIDA, se a spec do marco ainda não definir a autorização.
- **`User` é a exceção:** não carrega `organizationId`; o vínculo é a `Membership`. Não apontar a ausência em `User` como problema.

### 3. Nada publica sozinho

Origem: CLAUDE.md §2 regra 7 e §4 ("Pular a etapa de revisão do mentor").

- Importação de material, extração, geração de `DraftQuestion[]` ou qualquer fluxo automatizado (job, listener, seed, migration de dados) que leve um recurso a `published`, ou que crie `Question` publicada direto de `DraftQuestion` sem passar pela revisão do mentor.
- Publicação só por use case explícito (`PublishQuiz`), disparado por ação do mentor. Um use case de importação que chama o de publicação no fim também é achado.
- Default de status `published` em entidade, model Prisma ou DTO.

### 4. Teste que não prova o cenário da spec

Origem: CLAUDE.md §3 ("Testes"); specs em `docs/specs/` (os cenários BDD viram testes com o título do cenário); `TESTE-QUE-NAO-PROVA-NADA.md`; spec do Marco 3.1, seção 5.

- **Sem assert do comportamento.** Teste com título de cenário (`C01`…`C29`, cenários da S5) cujos `expect` só conferem que algo existe (`toBeDefined`, `typeof … === 'function'`) ou que um mock foi chamado, sem conferir o `Then` do cenário.
- **Mock que engole o erro.** Fake/delegate que não lança o erro real do Prisma (`P2002`, `P2003`) quando o cenário é de falha, `try/catch` no teste sem `expect` no `catch`, ou `rejects` sem conferir o tipo do erro.
- **Teste que testa o fake.** Ex.: C09 deve conferir o `where` recebido pelo delegate, não o que o próprio fake filtrou.
- **Garantia de banco declarada sem banco.** Cenário que a spec marca como "precisa de PG" (C09, C11, C12, C17, C29) dado como provado só com delegate falso. A parte com banco vai em `*.integration.spec.ts` (alvo `test-integration`).
- **`domain`/`application` dependendo de banco.** Teste dessas camadas que exige PostgreSQL ou `PrismaService`, em vez de fakes dos ports.

## Classificação

| Classe | Quando usar |
|---|---|
| **BLOQUEIA** | Viola uma regra acima, com evidência no diff. O PR não deve entrar assim. |
| **SUGESTÃO** | Não viola regra, mas há caminho mais seguro ou um teste mais forte. Pode entrar depois. |
| **DÚVIDA** | Pode violar uma regra, mas falta contexto (spec ambígua, comportamento fora do diff, decisão em aberto num ADR). Pergunta, não afirma. |

Na dúvida entre BLOQUEIA e DÚVIDA, use DÚVIDA e diga o que falta para decidir.

## Formato de saída

Um bloco por achado, do mais grave para o menos grave:

```
### [CLASSIFICAÇÃO] arquivo:linha
- **Problema:** o que o código faz, em uma ou duas frases.
- **Por que importa:** qual regra (CLAUDE.md §/regra, ou cenário da spec) e o que quebra se entrar assim.
- **Regra:** 1, 2, 3 ou 4 desta skill.
```

Use o caminho relativo à raiz do repositório e a linha do arquivo novo no diff. Sem achados numa regra, não invente: diga "Nenhum achado" para ela no resumo.

Feche a revisão com:

```
## Resumo
- BLOQUEIA: n | SUGESTÃO: n | DÚVIDA: n
- Regras sem achado: …

## O que não consegui verificar
- Itens que dependem de código fora do diff, de banco (só CI), de execução, ou de decisão em aberto, cada um com o motivo.
```
