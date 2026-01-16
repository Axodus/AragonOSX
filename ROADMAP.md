# Aragon OSx - Roadmap 2026

Roadmap de desenvolvimento e integração do ecossistema Aragon OSx (Contratos, Backend e Frontend).

## 🎯 Objetivos Gerais

- Garantir reprodutibilidade completa do ambiente de desenvolvimento
- Estabelecer pipeline de CI/CD robusto para todos os componentes
- Validar integração end-to-end entre contratos, backend e frontend
- Documentar fluxos e facilitar onboarding de novos desenvolvedores

## 📋 Fases do Projeto

### Phase 1: Infrastructure & Setup (Prioridade: Alta) 🔴

**Objetivo**: Estabelecer base sólida para desenvolvimento reproduzível

#### [#7 - Atualizar .env.install e validar compilação/testes de contratos](https://github.com/mzfshark/AragonOSX/issues/7)

- **Status**: 📝 Open
- **Área**: Contracts
- **Assignee**: @mzfshark
- **Entregáveis**:
  - ✅ .env.install atualizado com placeholders
  - ✅ README de contracts com comandos funcionais
  - ✅ Todos os testes unitários passando
  - ✅ PR em develop com checklist

#### [#10 - CI / Pipeline para contracts + backend + frontend](https://github.com/mzfshark/AragonOSX/issues/10)

- **Status**: 📝 Open
- **Área**: CI/CD
- **Assignee**: @mzfshark
- **Entregáveis**:
  - ✅ Workflows para forge/hardhat e npm tests
  - ✅ Anvil/ganache provisionado em CI
  - ✅ Caching (cargo/npm) configurado
  - ✅ Documentação de CI local

### Phase 2: Backend Integration (Prioridade: Alta) 🔴

**Objetivo**: APIs funcionais consumindo contratos

#### [#8 - Integrar endpoints e configurar ambiente (Backend)](https://github.com/mzfshark/AragonOSX/issues/8)

- **Status**: 📝 Open
- **Área**: Backend
- **Assignee**: @mzfshark
- **Entregáveis**:
  - ✅ Rotas e services via RPC/ethers
  - ✅ .env.template com variáveis
  - ✅ Testes de integração com anvil
  - ✅ Documentação de endpoints

**Dependências**: #7 (contratos validados)

### Phase 3: Frontend Integration (Prioridade: Média) 🟡

**Objetivo**: Frontend consumindo APIs e contratos

#### [#9 - Adaptar frontend para novos endpoints e ABIs de contratos](https://github.com/mzfshark/AragonOSX/issues/9)

- **Status**: 📝 Open
- **Área**: Frontend
- **Assignee**: @mzfshark
- **Entregáveis**:
  - ✅ .env.local atualizado
  - ✅ Consumo de ABI/artifacts
  - ✅ Fluxos críticos validados (wallet, read/write)
  - ✅ Testes unitários/E2E passando

**Dependências**: #7, #8 (contratos e backend prontos)

### Phase 4: Quality Assurance (Prioridade: Alta) 🔴

**Objetivo**: Validação end-to-end e garantia de qualidade

#### [#11 - QA / Testes de integração e casos críticos](https://github.com/mzfshark/AragonOSX/issues/11)

- **Status**: 📝 Open
- **Área**: Testing/QA
- **Assignee**: @mzfshark
- **Entregáveis**:
  - ✅ Checklist de casos críticos
  - ✅ Testes automatizados + manuais
  - ✅ Bugs reportados e corrigidos
  - ✅ Relatório de QA

**Dependências**: #7, #8, #9 (todos os componentes integrados)

### Phase 5: Documentation (Prioridade: Média) 🟡

**Objetivo**: Facilitar onboarding e manutenção

#### [#12 - Documentação / CHANGELOG](https://github.com/mzfshark/AragonOSX/issues/12)

- **Status**: 📝 Open
- **Área**: Documentation
- **Assignee**: @mzfshark
- **Entregáveis**:
  - ✅ README principal atualizado
  - ✅ .env.install com exemplos
  - ✅ CHANGELOG com mudanças
  - ✅ Guias de CI e PR

**Dependências**: #7, #8, #9, #10, #11 (todos os componentes prontos)

## 🗓️ Timeline Estimado

```
Phase 1 (Infrastructure)     ████████░░░░░░░░  [Semanas 1-2]
├─ #7  Contracts Setup      ████████░░
└─ #10 CI Pipeline          ████████░░

Phase 2 (Backend)           ░░░░░░░░████████  [Semanas 2-3]
└─ #8  Backend Integration  ░░░░░░░░████████

Phase 3 (Frontend)          ░░░░░░░░░░░░████  [Semanas 3-4]
└─ #9  Frontend Adaptation  ░░░░░░░░░░░░████

Phase 4 (QA)                ░░░░░░░░░░░░░░██  [Semana 4]
└─ #11 Integration Tests    ░░░░░░░░░░░░░░██

Phase 5 (Documentation)     ░░░░░░░░░░░░░░░█  [Semana 4-5]
└─ #12 Docs & CHANGELOG     ░░░░░░░░░░░░░░░█
```

## 📊 Progresso Geral

- **Total de Issues**: 6
- **Concluídas**: 0 (0%)
- **Em Progresso**: 0 (0%)
- **Pendentes**: 6 (100%)

## 🔗 Links Importantes

- **Projeto no GitHub**: https://github.com/users/mzfshark/projects/10
- **Repositório**: https://github.com/mzfshark/AragonOSX
- **Issues**: https://github.com/mzfshark/AragonOSX/issues

## 📝 Convenções

### Labels

- `type:task` - Tarefas gerais de implementação
- `type:feature` - Novas funcionalidades
- `type:infra` - Infraestrutura e CI/CD
- `type:qa` - Qualidade e testes
- `type:docs` - Documentação

### Áreas

- `area:contracts` - Smart contracts (Solidity/Hardhat/Foundry)
- `area:backend` - Backend (Node.js/TypeScript)
- `area:frontend` - Frontend (Next.js/React)
- `area:ci` - CI/CD (GitHub Actions)
- `area:testing` - Testes e QA
- `area:product` - Produto e documentação

### Prioridades

- `priority:high` 🔴 - Bloqueante ou crítico
- `priority:medium` 🟡 - Importante mas não bloqueante
- `priority:low` 🟢 - Nice to have

## 🎯 Milestones

### Milestone 1: Development Environment Ready

- ✅ Contratos compilam (#7)
- ✅ CI pipeline funcional (#10)
- **ETA**: Semana 2

### Milestone 2: Backend Integration Complete

- ✅ APIs documentadas e testadas (#8)
- **ETA**: Semana 3

### Milestone 3: Full Stack Integration

- ✅ Frontend consumindo backend (#9)
- ✅ Fluxos críticos validados (#11)
- **ETA**: Semana 4

### Milestone 4: Production Ready

- ✅ Documentação completa (#12)
- ✅ QA aprovado (#11)
- **ETA**: Semana 5

## 🚀 Próximos Passos

1. **Imediato**: Iniciar #7 (Contracts Setup) e #10 (CI Pipeline) em paralelo
2. **Semana 2**: Completar setup de contratos e iniciar #8 (Backend)
3. **Semana 3**: Integrar frontend (#9) com backend validado
4. **Semana 4**: Executar QA completo (#11) e atualizar documentação (#12)
5. **Semana 5**: Review final e release

## 📚 Recursos Adicionais

- [Copilot Instructions](.github/copilot-instructions.md) - Guia para AI agents
- [Contribution Guide](CONTRIBUTION_GUIDE.md) - Como contribuir
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) - Checklist de deploy
- [Country Integration Checklist](COUNTRY_INTEGRATION_CHECKLIST.md) - Integração de países

---

**Última atualização**: 16 de janeiro de 2026  
**Mantido por**: @mzfshark  
**Projeto**: [Axodus #10](https://github.com/users/mzfshark/projects/10)
