# Bounded Context Scaffolder — Referência

## Regras de Tagging Nx (StudyForge)

Toda lib em um novo contexto recebe:
- `scope:<context>` (ex: `scope:identity`, `scope:quiz`)
- `type:domain` ou `type:application` ou `type:infra`

Exemplo para contexto `identity`:

```text
tags: "scope:identity,type:domain"
tags: "scope:identity,type:application"
tags: "scope:identity,type:infra"
```

As regras por camada (`type:domain`, `type:application`, `type:infra`, `type:contracts`) já existem
em `eslint.config.mjs` e valem automaticamente para as libs novas.

## Restrições de Dependência

Ao adicionar um novo contexto `<context>`, regra ESLint em `eslint.config.mjs`:

```javascript
{
  sourceTag: 'scope:<context>',
  onlyDependOnLibsWithTags: ['scope:shared', 'scope:<context>'],
},
```

Significado:
- Libs com `scope:<context>` podem depender APENAS de `scope:shared` e `scope:<context>`
- NÃO podem depender de `scope:import`, `scope:quiz`, etc. — comunicação entre contextos só por DTOs de `shared/contracts`
- EXCEÇÃO: `scope:api` lista todos os contextos que ela compõe

## Padrão de Estrutura de Pastas

```text
libs/<context>/
├── domain/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── <entity>.ts
│   │   │   └── <entity>.spec.ts
│   │   └── index.ts
│   ├── eslint.config.mjs      (← inclui ...domainLayer)
│   ├── jest.config.cts
│   ├── package.json
│   ├── project.json
│   ├── tsconfig.json
│   ├── tsconfig.lib.json      (← lib: ["es2022"], types: [])
│   └── tsconfig.spec.json
├── application/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── ports/         (interfaces + InjectionToken)
│   │   │   └── use-cases/     (@Injectable, um execute() por classe)
│   │   └── index.ts
│   ├── eslint.config.mjs
│   ├── jest.config.cts
│   ├── package.json
│   ├── project.json
│   ├── tsconfig.json
│   ├── tsconfig.lib.json
│   └── tsconfig.spec.json
└── infra/
    ├── src/
    │   ├── lib/
    │   │   ├── <recurso>/     (adapter + módulo do recurso, ex: prisma-<entity>.repository.ts)
    │   │   └── infra.module.ts  (← <Context>InfraModule: liga tokens a implementações)
    │   └── index.ts
    ├── eslint.config.mjs
    ├── jest.config.cts
    ├── package.json
    ├── project.json
    ├── tsconfig.json
    ├── tsconfig.lib.json
    └── tsconfig.spec.json
```

## Geradores Nx a Usar

Sempre com `--directory libs/<context>/<camada>`: sem o prefixo `libs/`, o Nx cria a lib na raiz.

### Domain (biblioteca TS pura)

```bash
npx nx generate @nx/js:library \
  --directory libs/<context>/domain \
  --name <context>-domain \
  --importPath @studyforge/<context>/domain \
  --bundler tsc \
  --unitTestRunner jest \
  --linter eslint \
  --tags "scope:<context>,type:domain" \
  --no-interactive
```

### Application (NestJS, com testes)

```bash
npx nx generate @nx/nest:library \
  --directory libs/<context>/application \
  --name <context>-application \
  --importPath @studyforge/<context>/application \
  --buildable \
  --unitTestRunner jest \
  --linter eslint \
  --tags "scope:<context>,type:application" \
  --no-interactive
```

### Infra (NestJS, módulo de wiring)

```bash
npx nx generate @nx/nest:library \
  --directory libs/<context>/infra \
  --name <context>-infra \
  --importPath @studyforge/<context>/infra \
  --buildable \
  --unitTestRunner jest \
  --linter eslint \
  --tags "scope:<context>,type:infra" \
  --no-interactive
```

Depois de gerar, apague os placeholders do gerador (`<context>-domain.ts`/`.spec.ts`,
`<context>-application.module.ts`, `<context>-infra.module.ts`).

## Pós-geração: Ajustes Obrigatórios

Depois de rodar os 3 geradores, execute em cada lib:

### 1. Permitir testes vazios em application (provisório)

`libs/<context>/application/jest.config.cts`:

```javascript
export default {
  displayName: '<context>-application',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  transform: { '^.+\\.[tj]sx?$': [...] },
  passWithNoTests: true, // ← Provisório: remover quando houver specs reais
};
```

### 2. Excluir testes do lint de dependências

`libs/<context>/domain/eslint.config.mjs` (e copiar para `/application` e `/infra`):

Adicione `ignoredFiles` no `@nx/dependency-checks`:

```javascript
export default [
    ...baseConfig,
    ...domainLayer,
    {
        files: ['eslint.config.mjs'],
        ignorePatterns: ['**/*'],
    },
    {
        plugins: { '@nx': nxPlugin },
        rules: {
            '@nx/dependency-checks': 'error',
        },
        settings: {
            '@nx/dependency-checks': {
                ignoredFiles: [
                    '{projectRoot}/jest.*.{cts,ts}',
                    '{projectRoot}/src/**/*.spec.ts',
                ],
            },
        },
    },
];
```

Isso evita que `@nestjs/testing` (usado só em `.spec.ts`) vire dependency.

## Proteção da Lib de Domínio (obrigatório)

Regra 2 do CLAUDE.md: as duas configurações precisam existir juntas. O gerador `@nx/js:library`
cria `types: ["node"]` — é preciso trocar.

`libs/<context>/domain/tsconfig.lib.json` (em `compilerOptions`):

```json
"lib": ["es2022"],
"types": []
```

`libs/<context>/domain/eslint.config.mjs` (substituir o conteúdo gerado):

```javascript
import baseConfig, { domainLayer } from "../../../eslint.config.mjs";

export default [
    ...baseConfig,
    ...domainLayer
];
```

## Arquivos Iniciais Gerados

### `libs/<context>/domain/src/lib/<entity>.ts`

Para recursos de organização. `User` é a exceção: não recebe `organizationId` (relaciona-se a
organizações via `Membership`).

```typescript
import {
  EntityId,
  InvalidEntityIdError,
  InvalidOrganizationIdError,
  OrganizationId,
} from '@studyforge/shared/domain';

export interface <Entity>Props {
  readonly id: EntityId;
  readonly organizationId: OrganizationId;
}

export class <Entity> {
  private constructor(
    readonly id: EntityId,
    readonly organizationId: OrganizationId,
  ) {}

  static create(props: <Entity>Props): <Entity> {
    if (!(props.id instanceof EntityId)) {
      throw new InvalidEntityIdError();
    }
    if (!(props.organizationId instanceof OrganizationId)) {
      throw new InvalidOrganizationIdError();
    }
    return Object.freeze(new <Entity>(props.id, props.organizationId));
  }
}
```

Erros específicos da entidade seguem o padrão `Invalid<Entity>Error extends DomainError<'<CODE>'>`
(ver `InvalidDraftQuestionError` em `libs/import/domain`), criados quando houver uma regra real.

### `libs/<context>/infra/src/lib/infra.module.ts`

`application` não tem módulo Nest. O módulo da infra importa os módulos dos adapters (que proveem
os tokens dos ports) e provê/exporta os use cases para a `api`:

```typescript
import { Module } from '@nestjs/common';
import { Create<Entity>UseCase } from '@studyforge/<context>/application';
import { <Entity>Module } from './<entity>/<entity>.module';

/**
 * Wiring do contexto <context>: liga os ports de application às implementações da infra
 * e expõe os use cases para a api.
 */
@Module({
  imports: [<Entity>Module],
  providers: [Create<Entity>UseCase],
  exports: [Create<Entity>UseCase],
})
export class <Context>InfraModule {}
```

Referência completa: `libs/import/infra/src/lib/infra.module.ts` (`ImportInfraModule`).

## Atualizar ESLint

Em `eslint.config.mjs`, adicione a regra de scope do contexto (a ordem das regras não importa):

```javascript
{
  sourceTag: 'scope:<context>',
  onlyDependOnLibsWithTags: ['scope:shared', 'scope:<context>'],
},
```

E inclua o novo contexto na regra `scope:api`:

```javascript
{
  sourceTag: 'scope:api',
  onlyDependOnLibsWithTags: ['scope:shared', 'scope:import', 'scope:<context>'],
},
```

`scope:web` continua sem acesso a libs de contexto (só `shared/contracts`).

## Checklist Pós-Scaffold

Depois de rodar esta skill:

- [ ] Conferir a proteção da lib de domínio (`types: []` + `...domainLayer`)
- [ ] Definir entidades principais em `domain/src/lib/`
- [ ] Criar ports em `application/src/lib/ports/`
- [ ] Implementar use cases em `application/src/lib/use-cases/`
- [ ] Criar adapters em `infra/src/lib/<recurso>/`
- [ ] Atualizar `prisma/schema.prisma` com models do novo contexto (se relevante; client único em `libs/shared/prisma`)
- [ ] Contratos entre contextos (se houver) em `libs/shared/contracts`
- [ ] Rodar `npx nx run-many -t lint test build --skip-nx-cache` para validar (o `build` valida o `types: []`)
- [ ] Atualizar `README.md` com descrição do novo contexto
- [ ] Atualizar `AGENT.md` com libs e comandos novos

## Exemplos

### Adicionar Contexto Identity

```text
Scaffold a new bounded context called "identity" with entities User, Organization and Membership
```

Resultado: `libs/identity/domain`, `libs/identity/application`, `libs/identity/infra`

Próximos passos: definir `User` (sem `organizationId`), `Organization`, `Membership` no domínio;
criar ports `UserRepository`, `OrganizationRepository`; implementar com Prisma na infra.
Fluxo de convite/código de entrada de organização continua fora de escopo (CLAUDE.md §4).

### Adicionar Contexto Quiz

```text
Scaffold a new bounded context called "quiz" with entity Quiz
```

Resultado: `libs/quiz/domain`, `libs/quiz/application`, `libs/quiz/infra`

Próximos passos: definir `Quiz`, `Question`, `Attempt` no domínio; criar ports `QuizRepository`.
Para receber questões vindas do `import`, usar um DTO de `shared/contracts` (ex: `DraftQuestionDto`)
em `quiz/application` — nunca importar `import/domain` nem `import/infra` (CLAUDE.md, regras 3 e 4).
