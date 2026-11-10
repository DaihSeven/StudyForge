# ADR-008: Banco de questões e simulados por certificação

**Date:** 2026-11-10  
**Status:** Accepted  
**Decision Maker:** Responsável do projeto  
**Affected By:** README seções 8 e 9, futuro contexto `quiz`, Marcos 3.3 (importação), 3.4 (quiz), 3.5 (publicação) e 3.6 (execução), CLAUDE.md regras 6 e 7  

---

## Title

Banco de questões por certificação, mantido pelo admin da plataforma, e geração de simulados por sorteio estratificado por domínio (`ExamGenerator`).

---

## Status

**Accepted** — decisão de produto tomada em 2026-11-10. **Implementação prevista como primeiro item da Etapa 4**, depois de quiz, publicação e execução (Marcos 3.4 a 3.6). Não entra no MVP 1.

---

## Context

A origem do projeto é a mentoria para certificações AWS, mas o núcleo de domínio é genérico (README, princípios). Hoje o mentor monta cada simulado à mão. Falta uma forma de o aluno praticar com simulados de tamanho e distribuição parecidos com o da prova real (25 ou 65 questões, com peso por domínio), sem que o mentor precise montar cada um.

Isso exige um acervo de questões classificadas por certificação e domínio, e uma regra para sortear questões respeitando o peso de cada domínio.

---

## Decision

### 1. Conceitos

| Conceito | Definição |
|---|---|
| **Certification** | Uma certificação (ex.: uma prova AWS), com seus **domínios** e o **peso** de cada um |
| **ExamBlueprint** | Receita de um simulado: número de questões (**25 ou 65**) e **cota por domínio** |
| **Banco de questões** | Conjunto de questões, cada uma com **certificação** e **domínio**, **publicada**, cadastrada **só pelo admin** da plataforma, **sem limite** de quantidade |
| **ExamGenerator** | Serviço que gera um simulado por **sorteio estratificado por domínio** a partir do banco |

### 2. Propriedade

O banco pertence a uma **"organização da plataforma"**. Assim `organizationId` continua invariante, sem exceção (CLAUDE.md regra 6). O admin da plataforma (`platformRole`, ADR-007) é quem cadastra e publica as questões.

### 3. Cotas por domínio

O número de questões de cada domínio é calculado pelo **método do maior resto**, com **aritmética inteira** (sem ponto flutuante):

1. Para cada domínio, `produto = peso × N` (N = 25 ou 65, pesos em percentual somando 100).
2. `cota base = produto ÷ 100` (parte inteira); `resto = produto mod 100`.
3. Faltam `N − soma(cotas base)` questões; elas vão para os domínios de **maior resto**.
4. **Desempate determinístico:** em resto igual, ganha o domínio de **maior peso**; persistindo o empate, o de **menor código de domínio** (ordem alfabética). O resultado é sempre o mesmo para a mesma entrada.

**Os pesos de cada certificação vêm do guia oficial da prova e devem ser conferidos a cada versão da prova. Este ADR não define pesos reais: eles são dado a preencher por certificação.** Os domínios e pesos abaixo são **fictícios**, só para ilustrar o cálculo.

**Exemplo A, 65 questões** (domínios fictícios, pesos 30 / 26 / 24 / 20):

| Domínio | Peso | produto (peso × 65) | Cota base | Resto | Maior resto? | Cota final |
|---|---|---|---|---|---|---|
| A | 30 | 1950 | 19 | 50 | não | 19 |
| B | 26 | 1690 | 16 | 90 | sim (1º) | 17 |
| C | 24 | 1560 | 15 | 60 | sim (2º) | 16 |
| D | 20 | 1300 | 13 | 0 | não | 13 |

Soma das bases: 63, faltam 2. Total final: 19 + 17 + 16 + 13 = **65**.

**Exemplo B, 25 questões, com empate** (domínios fictícios, pesos 36 / 28 / 22 / 14):

| Domínio | Peso | produto (peso × 25) | Cota base | Resto | Maior resto? | Cota final |
|---|---|---|---|---|---|---|
| A | 36 | 900 | 9 | 0 | não | 9 |
| B | 28 | 700 | 7 | 0 | não | 7 |
| C | 22 | 550 | 5 | 50 | empate com D; **maior peso (22 > 14)** | 6 |
| D | 14 | 350 | 3 | 50 | empate com C; perde no desempate | 3 |

Soma das bases: 24, falta 1. Total final: 9 + 7 + 6 + 3 = **25**.

### 4. Banco insuficiente

Se algum domínio tiver **menos questões publicadas do que a cota**, o sistema **recusa gerar** o simulado e informa **qual domínio** está abaixo da cota (e quanto falta). Recomendação de operação: manter **no mínimo 2 a 3 vezes a cota** de cada domínio (no Exemplo A, o domínio B, cota 17, pediria de 34 a 51 questões publicadas), para haver variedade entre simulados.

### 5. Sorteio e tentativa

1. O sorteio **prefere questões que o aluno ainda não viu**.
2. A tentativa guarda um **snapshot das questões sorteadas** (enunciado, alternativas, gabarito), para que edições posteriores no banco **não alterem resultados antigos**.
3. **Embaralhar as alternativas** é opcional; a decisão fica para depois.

### 6. Cadastro

O admin cadastra questões **reaproveitando a importação JSON/Markdown do Marco 3.3** (ADR-004), e também pode cadastrar **questão a questão**.

### 7. Restrições

- Questões **originais**: sem copiar dumps nem questões de provas reais (risco jurídico e contratual).
- Aviso visível de que o **StudyForge não é afiliado à AWS** (nem à entidade certificadora de cada prova).
- **Revisão humana obrigatória:** uma questão só entra no banco depois de **publicada pelo admin**. Nenhum fluxo automatizado, importação inclusa, publica questão (CLAUDE.md regra 7).

---

## Consequences

### Positivos ✅

1. Simulados parecidos com a prova real, sem o mentor montar cada um.
2. Reuso da importação do Marco 3.3 e do modelo de questão já existente (`SINGLE_CHOICE` e `MULTIPLE_CHOICE`).
3. `organizationId` preservado como invariante, graças à organização da plataforma.
4. Cálculo de cotas determinístico e testável sem banco de dados.
5. O snapshot protege o histórico do aluno contra edições do banco.

### Negativos ❌ e riscos

1. **Trabalho editorial contínuo:** o banco só serve se o admin cadastrar muitas questões originais; a recomendação de 2 a 3 vezes a cota pede centenas de questões por certificação.
2. **Pesos desatualizados** se a certificação mudar de versão e ninguém conferir o guia oficial.
3. **Risco jurídico** se entrar conteúdo copiado de provas reais; a regra depende de disciplina do admin, sem detecção automática.
4. O **snapshot aumenta o volume de dados** por tentativa e muda o desenho de `Attempt` e `Answer` (Marcos 3.4 e 3.6).
5. Uma **"organização da plataforma"** é uma organização especial que precisa existir (seed) e ser protegida de convites e uso comum.

---

## Alternatives Considered

### ❌ Alternativa 1: Cada mentor monta seus simulados à mão (situação atual)

**Problemas:** trabalho repetido, sem distribuição por domínio, sem reaproveitamento entre turmas.  
**Por que rejected:** não atende ao objetivo de simulados no formato da prova.

### ❌ Alternativa 2: Sorteio simples, sem estratificação por domínio

**Problemas:** o simulado pode concentrar questões em poucos domínios e fugir do peso oficial.  
**Por que rejected:** perde justamente o que torna o simulado representativo.

### ❌ Alternativa 3: Banco aberto a qualquer mentor

**Problemas:** controle de qualidade, originalidade e risco jurídico ficam diluídos; cada mentor teria um banco diferente por certificação.  
**Por que rejected:** o admin da plataforma é o ponto único de revisão e responsabilidade.

### ✅ Alternativa 4: Banco central por certificação + sorteio estratificado (ESCOLHIDA)

**Por que aceita:** qualidade e originalidade controladas em um lugar, e distribuição por domínio garantida pela regra de cotas.

---

## Related ADRs

- **ADR-003:** Identity repositories (organização da plataforma usa os repositórios de `identity`)
- **ADR-004:** Importação por modelo estruturado (reaproveitada no cadastro do banco)
- **ADR-005:** Convite por link com token
- **ADR-006:** `course` fora do MVP 1 (também na Etapa 4)
- **ADR-007:** Organização pessoal, visibilidade e moderação (define o admin da plataforma)

---

## Perguntas em aberto

1. **Onde o banco e o `ExamGenerator` vivem?** Em `quiz` ou em um contexto novo (por exemplo, para `Certification`, `ExamBlueprint` e o banco)? CLAUDE.md pede explicar o racional antes de criar lib ou fronteira nova, e `quiz` não deve conhecer a origem do conteúdo. Decidir antes de implementar.
2. **Pesos:** fonte e formato (percentual inteiro somando 100? faixas do guia oficial, que às vezes são intervalos?), versionamento por versão da prova, e quem confere a cada atualização.
3. **`ExamBlueprint` por versão da prova:** uma certificação com duas versões simultâneas tem dois blueprints? Como migrar o banco quando os domínios mudam?
4. **Mínimo de 2 a 3 vezes a cota:** é só recomendação (aviso ao admin) ou o sistema deve bloquear a publicação do simulado abaixo desse mínimo? Hoje só a recusa quando o banco fica **abaixo da cota** é decidida.
5. **Mistura de tipos de questão** (`SINGLE_CHOICE` com 4 alternativas e `MULTIPLE_CHOICE` com 5): o blueprint define também cota por tipo, ou o sorteio ignora o tipo?
6. **"Ainda não viu":** vale para qualquer tentativa anterior do aluno naquela certificação, ou só para as últimas N? O que fazer quando o aluno já viu todo o domínio (repetir, ou recusar)?
7. **Snapshot:** o que exatamente é guardado (enunciado, alternativas, gabarito, domínio, versão da questão) e por quanto tempo (LGPD, ADR-007).
8. **Publicação da questão do banco × Marco 3.5:** hoje a publicação do Marco 3.5 transforma `DraftQuestion` aprovado em `Question` dentro de um quiz. A questão do banco é publicada **sem quiz**. É o mesmo use case ou um segundo caminho de publicação?
9. **`DraftQuestion` e o modelo de importação (ADR-004):** o modelo JSON/Markdown e a `DraftQuestion` hoje não têm certificação nem domínio. O modelo de importação do Marco 3.3 precisa desses campos para o cadastro do banco, ou eles são atribuídos pelo admin depois da importação?
10. **Originalidade:** haverá declaração de autoria no cadastro, campo de origem da questão, ou outra verificação? E o que acontece com uma questão denunciada como cópia?
11. **Embaralhar alternativas:** decisão adiada; precisa ser tomada antes do Marco 3.6 se o snapshot guardar a ordem.
12. **Outros tamanhos de simulado** além de 25 e 65, e simulados parciais por domínio (treino focado).

---

## Conflitos e pontos de atenção com os ADRs 003 a 006

| ADR | Ponto |
|---|---|
| ADR-003 | Sem conflito. O padrão de ports/adapters vale para os repositórios novos. |
| ADR-004 | **Ponto de atenção:** o ADR-004 define o modelo de importação sem certificação e domínio. Reaproveitá-lo para o banco exige estender o modelo (pergunta 9). Continua valendo "sem IA paga". |
| ADR-005 | Sem conflito. A "organização da plataforma" não deve aceitar convites de alunos; o admin entra por `platformRole` (ADR-007), não por `Membership`. |
| ADR-006 | **Ponto de atenção:** a Etapa 4 passa a reunir `course`, importers de PDF/DOCX, este banco (primeiro item) e o ADR-007. O escopo da etapa cresce; a ordem é: este ADR primeiro, como decidido. `Certification` não é `Course`. |
| Spec do Marco 3.1 | Sem conflito. Vale a regra "um papel por organização" e `User` continua sem `organizationId`. |
| README | O roadmap de Marcos 3.4 a 3.6 não prevê snapshot de questões na `Attempt`; isso precisará ser considerado quando o desenho do quiz for feito. Esta decisão não renumera nem altera nenhum Marco. |
| CLAUDE.md regra 7 | Preservada: questão só entra no banco publicada pelo admin, nunca por importação automática. |
| CLAUDE.md §4 | "Adicionar importers de PDF/DOCX antes da Etapa em que forem priorizados" e "Pular a revisão do mentor" continuam respeitados; nenhum tipo novo de questão é introduzido. |

---

## References

- README.md, seções 3, 8 e 9
- CLAUDE.md, seções 2 a 4
- [ADR-004](adr-004-importacao-por-modelo-estruturado.md), [ADR-007](adr-007-organizacao-pessoal-visibilidade-e-moderacao.md)
