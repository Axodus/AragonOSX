---
name: Integrar endpoints e configurar ambiente (Backend)
about: Implementar endpoints para interação com contratos e configurar variáveis de ambiente
title: Implementar endpoints para interação com contratos e configurar ambiente
labels: type:feature, area:backend, priority:high
assignees: ''
---

## Objetivo

Expor APIs necessárias para frontend interagir com contratos e configurar variáveis de ambiente (ex.: RPC_URL, MNEMONIC placeholder).

## Tarefas

- Criar/atualizar rotas e services que leem/escrevem via RPC/ethers.
- Adicionar .env.template com variáveis necessárias.
- Criar testes de integração que rodem contra anvil/ganache.
- Documentar endpoints e exemplos de chamadas.

## Critérios de aceitação

- Endpoints documentados e cobertos por testes de integração.
- CI executa testes de integração com anvil.
- PR aberto em development com checklist.

## Comandos úteis

- npm ci; npm run dev; npm run test
