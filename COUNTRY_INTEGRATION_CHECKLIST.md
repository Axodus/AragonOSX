# Checklist end-to-end — Integração 1.country + Aragon (Harmony mainnet)

Este documento é o guia único de execução para:

- `.country` como identificador/alias de DAO
- Vincular nome existente (A)
- Registrar nome on-chain via admin/proposal (B)
- Redeploy OSx em Harmony com permissões consistentes
- Arquivamento de DAOs “lixo” sem quebrar listagem

> Meta: `daoName.country` resolve on-chain para o DAO (addr record) e o app exibe/permite administrar isso com segurança.

---

## 0) Entradas (pre-reqs)

- Rede alvo: **Harmony mainnet**
- `Parent domain` humano: `country` (TLD) / opcional: `governance.country` (apenas se usado como namespace alternativo)
- Contratos 1.country (Harmony):
  - `RegistrarController`: `0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb`
  - `DC` (Registry ENS-like): `0x547942748Cc8840FEc23daFdD01E6457379B446D`
  - `EWS`: `0xf90dab949d3853c418bE361930028644B4EBcDE4`
  - `BaseRegistrar`: `0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD`
  - `TLDNameWrapper`: `0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5`
  - `PublicResolver`: `0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D`
- ABIs:
  - https://github.com/polymorpher/dot-country/tree/main/contracts/abi
  - https://github.com/polymorpher/ens-deployer/tree/main/contract/abi

Decisões de produto:

- (A) Vincular nome existente exige: `addr(namehash(daoName.country)) == daoAddress`.
- (B) Registrar via proposal: pode exigir **2 etapas** (commit e register) se houver commit-reveal.
- Política de “proof”:
  - MVP: valida resolve -> daoAddress.
  - Reforçado: validar também ownership (via wrapper/registrar) ou assinatura (EIP-712) do owner.

---

## 1) Redeploy OSx em Harmony (contratos/permissões)

Objetivo: deploy limpo do framework para parar de criar DAOs com permissões erradas.

1.1 Preparação

- [ ] Seguir [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) no repo AragonOSX.
- [ ] Configurar `.env` em `AragonOSX/packages/contracts`:

  - [ ] `ETH_KEY`
  - [ ] Explorer key (se aplicável)
  - [ ] `HARMONY_*` necessários (multisig, gas overrides etc.)

    1.2 Deploy (Hardhat)

- [ ] Em `AragonOSX/packages/contracts`, rodar dry-run local:
  - [ ] `yarn deploy --deploy-scripts deploy/new --network hardhat --reset`
- [ ] Rodar deploy na Harmony:

  - [ ] `yarn deploy --network harmony --reset --tags new`

    1.3 Pós-deploy

- [ ] Validar output em `AragonOSX/packages/contracts/deployed_contracts.json`.
- [ ] Rodar verificação de permissões do deploy (script `99_verify` em deploy/new/20_permissions).
- [ ] Atualizar endereços em:
  - [ ] Frontend `aragon-app/src/shared/constants/networkDefinitions.ts`
  - [ ] Backend `Aragon-app-backend/config/contracts/harmonyMainnet.json`

---

## 2) Backend — suporte a `.country`

2.1 Config

- [ ] Setar envs (Harmony) do backend:

  - [ ] `HARMONY_MAINNET_COUNTRY_REGISTRY=0x547942...446D` (DC)
  - [ ] (opcional) `HARMONY_MAINNET_PUBLIC_RESOLVER=0x46E370...415D`
  - [ ] (opcional) `HARMONY_MAINNET_REGISTRAR_CONTROLLER=0x76c6fE...94Fb`

    2.2 Resolver

- [x] Confirmar que `Aragon-app-backend/src/helpers/nameResolver.ts` usa:

  - [x] `registry.resolver(node)`
  - [x] `resolver.addr(node)`

    2.3 Persistência do "nome preferido"

- [x] Definir modelo: `primaryName` (string) para DAOs.
- [ ] Expor nos endpoints de DAO list/detail.

  2.4 Opção A (vincular nome existente)

- [x] Admin fornece `daoName.country`.
- [x] Backend valida `resolve(daoName.country) == daoAddress`.
- [x] Backend salva `primaryName` e retorna.
- [x] Criar endpoint `POST /set-primary-name` no admin API
- [x] Adicionar validação Joi para `primaryName` (pattern `.country`)
- [ ] Testar endpoint localmente

  2.5 Opção B (registrar via admin/proposal)

- [ ] Fornecer endpoint ou util (app) para gerar actions:
  - [ ] `commit(bytes32)` (se necessário)
  - [ ] `register(...)` (controller)
  - [ ] `setResolver(node, PublicResolver)` (registry or wrapper)
  - [ ] `setAddr(node, daoAddress)` (PublicResolver)
- [ ] Documentar o fluxo 2 etapas se existir commitment.

---

## 3) Frontend — aceitar `.country` e administrar

3.1 Config de rede

- [x] Adicionar endereços do `.country` (Registry/Controller/Resolver) em `aragon-app/src/shared/constants/networkDefinitions.ts`.

  3.2 Aceitar `.country` como identificador

- [ ] Ajustar `daoUtils` para reconhecer `.country`.
- [ ] Roteamento: permitir carregar DAO por nome `.country` via backend.

  3.3 UI Admin

- [ ] A: Tela/ação para "Vincular nome .country" (input + validação).
- [x] B: Tela/ação para "Registrar nome .country" criando proposal(s):
  - [x] Criar módulo de actions (`src/plugins/shared/countryRegistrar/`)
  - [x] Componentes `CountryCommitAction` e `CountryRegisterAction`
  - [x] Integrar actions nos plugins de governança (token/multisig/lockToVote/spp/admin)
  - [x] Adicionar traduções (i18n) em `en.json`
  - [ ] Validar que actions aparecem no Action Composer ao criar proposal

---

## 4) Validação e rollout

- [ ] Testar fluxo A:
  - [ ] Criar DAO
  - [ ] Registrar `daoName.country` manualmente fora (se necessário)
  - [ ] Vincular e ver no Explore
- [ ] Testar fluxo B:
  - [ ] Commit proposal
  - [ ] Após janela, Register + setAddr proposal
  - [ ] Verificar `addr(namehash) == daoAddress`
- [ ] Arquivar DAOs antigos via admin (já pronto)

---

## 5) (Futuro) Import/Migrate de histórico

- [ ] Snapshot import: ingestar proposals/votes/members e exibir como “histórico importado” read-only.
- [ ] Legacy Harmony gov import: mapear fonte de dados e normalização.
- [ ] Migrate AragonOS (se aplicável): ferramenta de migração para novo DAO.
