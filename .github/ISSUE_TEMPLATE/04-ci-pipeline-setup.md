---
name: CI / Pipeline para contracts + backend + frontend
about: Configurar CI para compilar e testar contracts, backend e frontend
title: Configurar CI para compilar e testar contracts, backend e frontend
labels: type:infra, area:ci, priority:high
assignees: ''
---

## Objetivo

Pipelines que executem lint, build e testes para contracts (forge/hardhat), backend e frontend, com anvil em runner.

## Tarefas

- Atualizar .github/workflows para rodar forge build/test e npm tests.
- Provisionar anvil/ganache nos jobs de CI (service container ou setup job).
- Adicionar caching (cargo/npm) e secrets necessários nos ambientes de CI.
- Documentar como rodar CI localmente (act/docker-compose).

## Critérios de aceitação

- PRs disparam pipelines que compilam e rodam testes para todos os componentes.
- CI retorna verde em PRs de exemplo.
