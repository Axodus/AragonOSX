---
name: Adaptar frontend para novos endpoints/ABI
about: Garantir que o frontend consome corretamente as APIs e ABIs atualizadas
title: Adaptar frontend para novos endpoints e ABIs de contratos
labels: type:task, area:frontend, priority:medium
assignees: ''
---

## Objetivo

Garantir que o frontend consome corretamente as APIs e ABIs atualizadas e validar fluxos críticos.

## Tarefas

- Atualizar env do frontend (.env.local) com placeholders.
- Atualizar consumo de ABI / paths para artifacts.
- Validar fluxos críticos (connect wallet, chamadas de leitura/escrita).
- Atualizar/rodar testes unitários e E2E básicos.

## Critérios de aceitação

- Fluxos críticos funcionando localmente com backend dev.
- Testes unitários/E2E relevantes passam.
- PR aberto em main com instruções de teste manual.

## Comandos úteis

- npm ci; npm run start; npm run test
