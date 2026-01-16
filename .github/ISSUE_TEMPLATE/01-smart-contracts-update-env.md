---
name: Atualizar .env.install e validar contratos
about: Tornar o setup de contracts reproduzível e garantir que contratos compilam e testes passam
title: Atualizar .env.install e validar compilação/testes de contratos
labels: type:task, area:contracts, priority:high
assignees: ''
---

## Objetivo
Atualizar packages/contracts/.env.install com placeholders e exemplos claros; garantir que todos os contratos compilam e que testes unitários passam.

## Tarefas
- Atualizar packages/contracts/.env.install com placeholders e instruções (não comitar segredos).
- Atualizar README de contracts com passo-a-passo (build, test, anvil).
- Rodar build/tests (forge ou hardhat) e corrigir falhas.
- Travar versões críticas (OpenZeppelin, forge/hardhat) se necessário.
- Abrir PR com mudanças e instruções de verificação.

## Critérios de aceitação
- .env.install atualizado com exemplos (sem segredos).
- README de contracts atualizado com comandos funcionais.
- Todos os testes unitários passam localmente e em CI.
- PR aberto em develop com checklist completo.

## Comandos úteis
- forge build
- forge test -v
- anvil (para node local)
