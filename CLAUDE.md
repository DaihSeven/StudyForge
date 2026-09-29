# CLAUDE.md

Instruções para qualquer instância do Claude (Claude Code, Claude Chat, ou agente
baseado em Claude) que trabalhe neste repositório. Leia isto antes de propor ou
gerar qualquer código.

Este arquivo assume conhecimento do `README.md`. Se houver conflito entre os dois,
o `README.md` é a fonte de verdade sobre visão de produto; este arquivo é a fonte
de verdade sobre como trabalhar no código.

## 1. O que este projeto é

StudyForge é uma plataforma de simulados, construída como monorepo Nx com backend
NestJS e frontend Next.js. A regra mais importante do projeto é arquitetural:
**o núcleo de domínio de quiz nunca conhece a origem do conteúdo** (PDF, texto
colado, IA etc.), e **a ingestão de material nunca depende do núcleo de quiz**.
Toda mudança de código deve preservar essa separação.

## 2. Regras não negociáveis

Estas regras têm prioridade sobre conveniência, velocidade de entrega, ou pedidos
ambíguos do usuário. Se um pedido do usuário parecer conflitar com uma destas
regras, Claude deve sinalizar o conflito antes de implementar, não decidir
silenciosamente qual delas quebrar.

1. **Sem lógica de negócio fora de `domain`/`application`.** Controllers em `apps/api`
   apenas recebem DTO validado, chamam um use case, e mapeiam a saída. Nenhuma
   decisão de negócio (ex.: "se só há 1 alternativa correta, é `SINGLE_CHOICE`")
   pode viver em um controller, resolver, ou service anêmico.
2. **`domain` não importa nada.** Nenhuma lib `*/domain` pode depender de NestJS,
   Prisma, HTTP, Zod, ou qualquer outra lib de infraestrutura. `domain` é
   TypeScript puro.

   > **Observação:** a garantia de que uma lib `type:domain` não usa APIs do
   > Node depende de duas configurações que precisam existir juntas: (a)
   > `types: []` no `tsconfig.lib.json` da lib, e (b) o bloco `...domainLayer`
   > importado no `eslint.config.mjs` da lib (definido em `eslint.config.mjs`
   > da raiz). Nenhuma tag do Nx aplica isso automaticamente. Toda nova lib
   > `type:domain` (incluindo o futuro `quiz/domain`) deve incluir
   > explicitamente `...domainLayer` no seu `eslint.config.mjs` — esquecer isso
   > faz a proteção contra módulos nativos do Node depender só do tsconfig, que
   > é mais frágil (ver commit `7619be5` para o histórico completo dessa descoberta).
3. **`application` depende do `domain` do próprio contexto e pode depender de
   `shared/domain` e `shared/contracts`** quando precisar atravessar fronteiras
   (ex.: `quiz/application` recebendo um `DraftQuestionDto` vindo de `import`, via
   `shared/contracts`, nunca importando `import/domain` diretamente). Nunca importa
   uma implementação concreta de `*/infra`. A direção da dependência para
   infraestrutura é sempre `infra → application`, nunca o inverso.
4. **`scope:quiz` e `scope:import` nunca se importam diretamente.** Toda
   comunicação entre esses dois domínios passa por DTOs de `shared/contracts`.
5. **`shared/contracts` não tem lógica de negócio.** Apenas tipos, enums e schemas
   de validação (Zod). Se uma invariante de domínio parecer precisar viver ali,
   isso é um sinal de que a modelagem está errada — pare e avise o usuário.
6. **Todo recurso pertencente a uma organização carrega `organizationId` como
   invariante do construtor/factory**, nunca como parâmetro opcional de query. Não
   é permitido criar um `Quiz`, `DraftQuestion`, `Attempt`, `Material` ou `Course`
   sem organização. **`User` é a exceção**: representa a identidade global do
   usuário e se relaciona a organizações via `Membership` — não carrega
   `organizationId` diretamente. Ver `README.md`, seção 6.1, para o modelo
   conceitual completo.
7. **Nenhum fluxo automatizado publica conteúdo.** Extração por IA, importação de
   material e geração de `DraftQuestion[]` nunca transicionam um recurso para
   `published`. Publicação é sempre um use case explícito (`PublishQuiz`),
   disparado por ação do mentor.
8. **`web` não importa nada de `identity`, `quiz` ou `import`** (domain,
   application ou infra). Só consome `shared/contracts`.

Essas fronteiras devem estar refletidas nas tags do Nx e no
`enforce-module-boundaries` do ESLint — se Claude perceber uma dependência que
viola essas regras, deve corrigi-la ou sinalizar, não ignorar.

## 3. Convenções de código

- **Use cases como classes `@Injectable`** (padrão *interactor*), um caso de uso
  por classe, método de entrada único (ex.: `execute()`).
- **Ports como interfaces** em `application`, com `InjectionToken` correspondente
  para DI do Nest.
- **Repositórios** implementam ports de `application`, ficam em `*/infra`, e não
  vazam detalhes do Prisma (tipos gerados pelo Prisma) para `application`/`domain`.
- **DTOs/contratos** são definidos com Zod em `shared/contracts` e reaproveitados
  tanto pela validação do NestJS quanto pelo `web`.
- **Testes**: `domain` e `application` devem ser testáveis sem banco de dados
  (usando fakes/mocks dos ports). `infra` recebe testes de integração.
- Nomes de tipos de questão são fixos: `QuestionType.SINGLE_CHOICE` (4
  alternativas A–D, exatamente 1 correta) e `QuestionType.MULTIPLE_CHOICE` (5
  alternativas A–E, exatamente 2 corretas) — ver `README.md`, seção 5. Não
  introduzir novos tipos sem aprovação explícita do usuário.

## 4. O que Claude NÃO deve fazer sem aprovação explícita

- Adicionar microserviços, filas de mensagens, ou múltiplos bancos de dados.
- Adicionar importers de PDF/DOCX antes da Etapa em que forem priorizados.
- Escolher um provedor de IA concreto para `AiQuestionExtractor` — isso é uma
  decisão de produto/infra ainda em aberto (comparação futura entre Claude,
  OpenAI, Gemini, Mistral).
- Introduzir novos tipos de questão (dissertativa, verdadeiro/falso) no MVP.
- Implementar lógica de convite/aprovação/código de entrada de organização —
  ainda não definida.
- Pular a etapa de revisão do mentor entre `DraftQuestion` e `Question` publicada.

## 5. Fluxo de trabalho esperado neste repositório

O projeto é dividido em etapas incrementais definidas pelo usuário. Claude deve:

1. Confirmar em qual etapa o trabalho está (ver `README.md`, seção "Roadmap por
   etapas") antes de gerar código ou estrutura de projeto.
2. Não antecipar trabalho de etapas futuras (ex.: não implementar IA de extração
   ou publicação de quiz enquanto a etapa corrente é só o fluxo de importação
   básica).
3. Ao propor mudanças estruturais (nova lib, nova dependência entre libs, nova
   fronteira), explicar o racional antes de implementar — mudanças de arquitetura
   não são silenciosas neste projeto.
4. Preferir o menor artefato funcional que valide a arquitetura de ponta a ponta,
   em vez de entregas grandes e acopladas.

## 6. Referências

- Visão de produto, princípios e arquitetura-alvo: `README.md`
- Instruções operacionais para agentes (comandos, setup, testes): `AGENT.md`