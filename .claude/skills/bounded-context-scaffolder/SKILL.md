---
name: bounded-context-scaffolder
description: Use quando for criar um novo bounded context no StudyForge (ex: identity, quiz). Gera estrutura (domain, application, infra) respeitando regras Nx, tags ESLint, CLAUDE.md e inversão de dependência.
allowed-tools: Bash, Read, Write, Edit
---

# Bounded Context Scaffolder

## Quando disparar

Invoque esta skill quando:
- Adicionar um novo bounded context (ex: `identity`, `quiz`, `course`)
- Expandir o monorepo com um novo domínio de negócio
- Precisar criar libs com estrutura correta, tags ESLint e arquivos iniciais

## O que faz

1. Valida o nome do contexto (minúsculas, sem caracteres especiais)
2. Cria estrutura de pastas: `libs/<context>/domain`, `libs/<context>/application`, `libs/<context>/infra`
3. Gera cada lib com `@nx/js:library` (domain) ou `@nx/nest:library` (application/infra)
4. Aplica a proteção da lib de domínio (`lib: ["es2022"]`, `types: []` e `...domainLayer`) — regra 2 do CLAUDE.md
5. Cria arquivos iniciais: `index.ts`, entidade de exemplo, módulo de wiring na infra
6. Atualiza `eslint.config.mjs` com a regra `scope:<context>` e inclui o contexto em `scope:api`
7. Mostra checklist de passos manuais (definir modelos de domínio, adicionar models Prisma, etc.)

## Como usar

Invoque com o nome do contexto:

```text
Scaffold a new bounded context called "identity" with entities User and Organization
```

A skill vai:
- Fazer perguntas clarificadoras (o que é público, quais são as entidades-chave)
- Gerar todas as libs e configs
- Mostrar próximos passos

## Regras que a skill nunca quebra

- `domain` não importa nada de infraestrutura (NestJS, Prisma, Zod, Node)
- Contextos (`scope:quiz`, `scope:import`, …) nunca se importam diretamente; comunicação só via `shared/contracts`
- Todo recurso de organização recebe `organizationId` no `create` (exceção: `User`)
- `application` não tem módulo Nest; o wiring de ports → adapters fica em `infra`

## Referência

Veja [reference.md](./reference.md) para:
- Regras de tagging Nx (scope, type)
- Restrições de dependência para novos contextos
- Padrões de estrutura de pastas
- Templates de arquivos iniciais
- Checklist pós-scaffold
