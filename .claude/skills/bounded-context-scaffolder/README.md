# Bounded Context Scaffolder Skill

Uma skill Claude para scaffolding de novos bounded contexts em um monorepo Nx seguindo DDD e padrões de arquitetura do StudyForge.

## O que faz

Gera estrutura completa, configuração e boilerplate para um novo bounded context:
- Cria libs `domain/`, `application/`, `infra/`
- Gera config Nx (`project.json`, `tsconfig.json`, `jest.config.cts`)
- Adiciona tags ESLint e regras de dependência
- Cria entidades de domínio iniciais e o módulo de wiring da infra

## Como usar em seu projeto

1. Copie `.claude/skills/bounded-context-scaffolder/` para seu `.claude/skills/`
2. Reinicie Claude Code
3. Invoque: "Scaffold a new bounded context called `<name>`"

## Requisitos

- Monorepo Nx
- ESLint com dependency constraints
- Segue DDD (domain, application, infra layers)
- NestJS para módulos

## Exemplo

```text
Scaffold a new bounded context called "identity" with entities User and Organization
```

## Referência

Veja `reference.md` para padrões detalhados, regras de dependência e checklist pós-scaffold.
