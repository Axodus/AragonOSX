# Checklist end-to-end — Integração 1.country + Aragon (Harmony mainnet)

Este documento é o guia único de execução para:

- `.country` como identificador/alias de DAO
- Vincular nome existente (A)
- Registrar nome on-chain via admin/proposal (B)
- Redeploy OSx em Harmony com permissões consistentes
- Arquivamento de DAOs “lixo” sem quebrar listagem

> Meta: `daoName.country` resolve on-chain para o DAO (addr record) e o app exibe/permite administrar isso com segurança.

Status atual (2026-01-15)

- OSx redeploy na Harmony concluído e endereços propagados para app + backend.
- Fluxo de governança/uninstall em Harmony validado end-to-end (sem revert e sem passo “Grant ROOT” fantasma).
- Nota de permissões (importante): alguns DAOs operam em modo **self-root** (o próprio DAO tem `ROOT_PERMISSION`). Nesses casos, alterações de permissão (`grant/revoke`) precisam ser executadas via `DAO.execute(...)` por um ator com `EXECUTE_PERMISSION`.

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

- [x] Seguir [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) no repo AragonOSX.
- [x] Configurar `.env` em `AragonOSX/packages/contracts`:

  - [x] `ETH_KEY`
  - [x] Explorer key (se aplicável)
  - [x] `HARMONY_MAINNET_RPC=https://api.harmony.one`
  - [x] `HARMONY_COUNTRY_REGISTRY=0x547942748Cc8840FEc23daFdD01E6457379B446D`
  - [x] `HARMONY_MANAGEMENT_DAO_MULTISIG=0xC3caEc518EdACd3fdbBB0a67DC98612EDbbcE738`
  - [x] (recomendado) `HARMONY_GAS_PRICE` (wei). Se der `transaction underpriced`, aumentar (Harmony é sensível a underpriced).
  - [x] (opcional) `HARMONY_LEGACY_GAS_LIMIT` (ex: `1500000`) se o RPC falhar em `eth_estimateGas`

    Observação: alguns RPCs da Harmony retornam `not implemented` para `eth_estimateGas`. Nesses casos, usar tx legacy (`type=0`) com `gasPrice` + `gasLimit` fixos no script/CLI.

    1.2 Deploy (Hardhat)

- [x] Em `AragonOSX/packages/contracts`, rodar dry-run local:
  - [x] `yarn deploy --network hardhat --reset`
- [x] Rodar deploy na Harmony:

  - [x] `yarn deploy --network harmony --reset`

    1.3 Pós-deploy

- [x] Validar output em `AragonOSX/packages/contracts/deployed_contracts.json` e `AragonOSX/packages/contracts/deploy/deployments/harmony/deployed_contracts.json`.
- [x] Rodar verificação de permissões do deploy (script `99_verify` em deploy/new/20_permissions/99_verify.ts).
- [x] Finalização do ManagementDAO (revogar permissões temporárias do deployer) concluída.

Endereços (Harmony / OSx framework)

- `DAOFactory`: `0xBbfff9D297762931ae7Dc37F0cc33a397bC50Ba0`
- `DAORegistryProxy`: `0xf0d596798761e2597e3Dc06b219eBbF1db0B9518`
- `PluginRepoRegistryProxy`: `0x24416Fcd035314C952A16549b47E8251aCdd844E`
- `PluginRepoFactory`: `0x753e32a799F319d25aCf138b343003ce0A5171eB`
- `PluginSetupProcessor`: `0x6300477942944d2501db08cD5b7e37DC6423E77C`
- `GlobalExecutor`: `0xC5066174C2ED21acbdcAd9Bb4d3BdeeDdd56CE37`
- `DAOBase` (DAOFactory.daoBase): `0x14B83cf98a6a311D8ff3c311D781ac392348316b`
- `ManagementDAOProxy`: `0x8f9a805603B6fd5df7e8d284CA66CcaF77C3BeF6`
- `Multisig` (rescue/final): `0xC3caEc518EdACd3fdbBB0a67DC98612EDbbcE738`

Notas

- Harmony não tem ENS oficial → scripts pulam ENS registrars/subdomains.
- Verificação no explorer pode emitir warnings (ex.: “Failed to link proxy … Reason: null”) e timeouts; não invalida o deploy on-chain.
- Nameservice (adapter/registrar) pode ser deployado múltiplas vezes durante iterações; trate `deploy/deployments/harmony/deployed_contracts.json` como fonte de verdade para o último estado gerado.

- [x] Atualizar endereços em:
  - [x] Frontend `aragon-app/src/shared/constants/networkDefinitions.ts`
  - [x] Backend `Aragon-app-backend/config/contracts/harmonyMainnet.json`

---

## 2) Backend — suporte a `.country`

2.1 Config

- [x] Setar envs (Harmony) do backend:

  - [x] `HARMONY_MAINNET_COUNTRY_REGISTRY=0x547942...446D` (DC)
  - [ ] (opcional) `HARMONY_MAINNET_PUBLIC_RESOLVER=0x46E370...415D`
  - [ ] (opcional) `HARMONY_MAINNET_REGISTRAR_CONTROLLER=0x76c6fE...94Fb`

- [x] Rodar testes unitários do backend (`yarn test:unit`) com sucesso.

- [x] Corrigir deploy local (Docker): criar redes externas `internal-net` e `public-net` quando ausentes.

  2.2 Resolver

- [x] Confirmar que `Aragon-app-backend/src/helpers/nameResolver.ts` usa:

  - [x] `registry.resolver(node)`
  - [x] `resolver.addr(node)`

    2.3 Persistência do "nome preferido"

- [x] Definir modelo: `primaryName` (string) para DAOs.
- [x] Expor nos endpoints de DAO list/detail.

  2.4 Opção A (vincular nome existente)

- [x] Admin fornece `daoName.country`.
- [x] Backend valida `resolve(daoName.country) == daoAddress`.
- [x] Backend salva `primaryName` e retorna.
- [x] Criar endpoint `POST /set-primary-name` no admin API
- [x] Adicionar validação Joi para `primaryName` (pattern `.country`)
- [x] Corrigir build do `aragon-admin-api` (tipagem/asserções no controller).
- [ ] Testar endpoint localmente

  2.5 Opção B (registrar via admin/proposal)

- [x] Fornecer endpoint ou util (app) para gerar actions:
  - [x] `commit(bytes32)` (se necessário)
  - [x] `register(...)` (controller)
  - [x] `setResolver(node, PublicResolver)` (registry or wrapper)
  - [x] `setAddr(node, daoAddress)` (PublicResolver)
- [x] Documentar o fluxo 2 etapas se existir commitment.

---

## 3) Frontend — aceitar `.country` e administrar

3.1 Config de rede

- [x] Adicionar endereços do `.country` (Registry/Controller/Resolver) em `aragon-app/src/shared/constants/networkDefinitions.ts`.

  3.2 Aceitar `.country` como identificador

- [x] Ajustar `daoUtils` para reconhecer `.country`.
- [x] Roteamento: permitir carregar DAO por nome `.country` via backend.

  3.3 UI Admin

- [x] A: Tela/ação para "Vincular nome .country" (input + validação).
  - [x] Criar serviço `daoAdminService` com método `setPrimaryName`
  - [x] Criar hook `useSetPrimaryName`
  - [x] Criar componente `DaoPrimaryNameCard`
  - [x] Adicionar traduções i18n
  - [x] Integrar componente na página de settings
- [x] B: Tela/ação para "Registrar nome .country" criando proposal(s):

  - [x] Criar módulo `countryRegistrar` com tipos, componentes e utils
  - [x] Refatorar para actions serem específicas do DAO (não duplicar por plugin)
  - [x] Simplificar formulário: nome + meses (1-12, default 1), secret automático
  - [x] Adicionar traduções (i18n) em `en.json`
  - [x] Remover duplicação: actions `.country` aparecem somente no grupo "DAO (daoAddress)"
  - [x] Registrar componentes como core (não dependem de pluginComponents)
  - [x] Validar Codacy CLI (sem issues nos 9 arquivos editados)
  - [ ] Validar que actions aparecem no Action Composer ao criar proposal (teste local/deploy)

    3.4 Harmony — correções de governança/uninstall (OSx)

- [x] Harmony (DAO novo): corrigir revert no "Execute Proposal" (Admin) ao agrupar actions via `DAO.execute(...)`.
- [x] UX (Harmony): remover clique extra de "Finalize" com auto-approve no TransactionDialog (vai direto para a assinatura).
- [x] Harmony (DAOs legacy): resolver `PluginSetupProcessor` por DAO (via DAOFactory do tx de criação → `pluginSetupProcessor()`) e propagar PSP no fluxo de uninstall (prepare/apply).
- [x] Backend: fallback no uninstall para marcar plugin como `uninstalled` mesmo quando existe mismatch de `pluginSetupRepoAddress` no registro.
- [ ] Indexer/backfill: reprocessar uninstalls já minerados para o UI refletir (ex.: tx `0xfcb34975290a3023a6e6e99f3bf87cf0e4f93ca9ad510616e624c0d2a85aa9a6`, PSP legacy `0xac1b0f953Ca517F4aB21Cc3E2cdb95b186DBF80D`).

- [x] Validação (Harmony): desinstalação do plugin travado operando normalmente após correção de helpers + correção de governança/execute.

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

## 5) Plugins Harmony e Native Token Voting

5.1 Reformular plugins Harmony

- [ ] **Harmony HIP (Harmony Improvement Proposal)**: avaliar arquitetura atual, integração com OSx, e propor melhorias ou redeploy se necessário.
- [ ] **Harmony Delegator**: revisar mecanismo de delegação, compatibilidade com OSx, e alinhar com padrões de governança atuais.
- [ ] Documentar dependências e diferenças em relação aos plugins padrão (token-voting/multisig).

  5.2 Native Token Voting (proposta)

- [ ] Permitir que token-voting use **Native token (0x00...00)** para voto.
- [ ] Opções de implementação:
  - [ ] Wrapper interno equivalente a `balanceOf(address)` para Native token (ex.: ler `address.balance`).
  - [ ] Plugin dedicado ou extensão do token-voting que aceita Native como token de governança.
- [ ] Definir se o wrapper é plugável/reutilizável ou específico do plugin.
- [ ] Validar compatibilidade com delegation/snapshot e garantir que saldo reflete em tempo de proposta.
- [ ] Testes e deploy em testnet antes de produção.

---

## 6) (Futuro) Import/Migrate de histórico

- [ ] Snapshot import: ingestar proposals/votes/members e exibir como “histórico importado” read-only.
- [ ] Legacy Harmony gov import: mapear fonte de dados e normalização.
- [ ] Migrate AragonOS (se aplicável): ferramenta de migração para novo DAO.

## 7) Test Coverage

------------------------------------------|---------|----------|---------|---------|--------------------------------------------------------------
All tests passed!
------------------------------------------|---------|----------|---------|---------|--------------------------------------------------------------
File | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
------------------------------------------|---------|----------|---------|---------|--------------------------------------------------------------
All files | 94.35 | 85.15 | 95.44 | 94.62 |
governance | 99.7 | 89.88 | 98.36 | 99.69 |
adminGovernance.ts | 100 | 100 | 100 | 100 |
baseGovernance.ts | 100 | 100 | 100 | 100 |
capitalDistributorGovernance.ts | 98.21 | 75.75 | 93.75 | 98.11 | 129,237
erc20Governance.ts | 100 | 95.55 | 100 | 100 | 72,314
gaugeGovernance.ts | 100 | 100 | 100 | 100 |
index.ts | 100 | 100 | 100 | 100 |
lockToVoteGovernance.ts | 100 | 84.21 | 100 | 100 | 70,210
multisigGovernance.ts | 100 | 100 | 100 | 100 |
pluginGovernance.ts | 100 | 88.88 | 100 | 100 | 146
veGovernance.ts | 100 | 88.57 | 100 | 100 | 276,385-395
handlers | 97.48 | 89.71 | 98.3 | 97.65 |
capitalDistributorHandler.ts | 100 | 100 | 100 | 100 |
daoRegistryHandler.ts | 100 | 88.88 | 100 | 100 | 31-40
daoTransferHanlder.ts | 100 | 100 | 100 | 100 |
executeHandler.ts | 100 | 90 | 100 | 100 | 39
gaugeHandler.ts | 100 | 90.9 | 100 | 100 | 176
governanceErc20Handler.ts | 100 | 89.28 | 100 | 100 | 30,124,245
governanceVeHandler.ts | 100 | 100 | 100 | 100 |
lockManagerHandler.ts | 100 | 85 | 100 | 100 | 53,130-132
metadataHandler.ts | 100 | 100 | 100 | 100 |
multisigHandler.ts | 100 | 100 | 100 | 100 |
permissionHandler.ts | 100 | 92.3 | 100 | 100 | 122
pluginHandler.ts | 94.19 | 79.81 | 100 | 95.19 | 49-61,730
pluginRepoRegistryHandler.ts | 100 | 100 | 100 | 100 |
pluginSettingHandler.ts | 86.57 | 80.48 | 90.9 | 85.99 | 243-249,321-326,611-660
pluginSetupProcessorHandler.ts | 98.86 | 94 | 93.75 | 99.4 | 419
proposalHandler.ts | 99.5 | 93.18 | 100 | 99.74 | 263
helpers | 93.94 | 88.53 | 94.79 | 94.18 |
2fa.ts | 100 | 100 | 100 | 100 |
4byte.ts | 100 | 100 | 100 | 100 |
alchemy.ts | 100 | 93.75 | 100 | 100 | 21
ankrHelper.ts | 100 | 100 | 100 | 100 |
bandOracle.ts | 23.68 | 0 | 0 | 24.32 | 41-108
blockScout.ts | 100 | 100 | 100 | 100 |
coinGecko.ts | 98.18 | 97.36 | 100 | 98.18 | 126
configIndexer.ts | 97.83 | 97.72 | 100 | 98.14 | 207,340,406
contractNetspec.ts | 97.07 | 93.82 | 100 | 97.52 | 30-40,251
daoEns.ts | 26.08 | 0 | 0 | 26.08 | 14-38
dayjs.ts | 100 | 100 | 100 | 100 |
decodeAction.ts | 99.63 | 82.5 | 100 | 99.63 | 773
device.ts | 100 | 85.71 | 100 | 100 | 18
ens.ts | 98.91 | 95 | 100 | 100 | 163
errors.ts | 100 | 100 | 100 | 100 |
etherscan.ts | 100 | 100 | 100 | 100 |
evmExplorerClient.ts | 90.62 | 74.24 | 95.23 | 90.52 | 210,280-295
fetchRetry.ts | 100 | 100 | 100 | 100 |
gauge.ts | 93.69 | 100 | 93.54 | 94.33 | 155-162
governanceErc20.ts | 100 | 89.47 | 100 | 100 | 79,136
governanceVe.ts | 100 | 100 | 100 | 100 |
harmonyRpc.ts | 14.89 | 0 | 0 | 15.21 | 32-43,49-131
harmonySnapshot.ts | 13.63 | 0 | 0 | 14.28 | 9-44,55-85
jwt.ts | 100 | 100 | 100 | 100 |
lockToVoteHelper.ts | 100 | 100 | 100 | 100 |
merkleTree.ts | 100 | 100 | 100 | 100 |
mongoRetry.ts | 100 | 88.88 | 100 | 100 | 70,85,125,152
monitoring.ts | 100 | 100 | 100 | 100 |
multisig.ts | 100 | 100 | 100 | 100 |
nameResolver.ts | 30.88 | 13.33 | 22.22 | 35.08 | 14-24,43-114
network.ts | 100 | 100 | 100 | 100 |
pinata.ts | 100 | 95 | 100 | 100 | 21
pluginDetector.ts | 98.3 | 93.54 | 100 | 100 | 75-77
pluginSlug.ts | 100 | 100 | 100 | 100 |
proposal.ts | 100 | 100 | 100 | 100 |
proxyContract.ts | 98.55 | 86.36 | 100 | 98.43 | 64
rabbitMQ.ts | 99.22 | 92.59 | 100 | 100 | 161-166
retryRequest.ts | 93.42 | 97.14 | 100 | 93.05 | 48-50,125-126
routeScanHelper.ts | 100 | 100 | 100 | 100 |
subscanApi.ts | 100 | 100 | 100 | 100 |
tokenDetector.ts | 100 | 100 | 100 | 100 |
tokenUtils.ts | 100 | 100 | 100 | 100 |
utils.ts | 94.84 | 87.03 | 93.82 | 94.24 | 96-97,124-125,136,472-484
validationSchema.ts | 97.45 | 97.01 | 100 | 97.36 | 59,129,140
votingEscrowDetector.ts | 100 | 90 | 100 | 100 | 52
web3.ts | 98.59 | 84.61 | 97.89 | 98.83 | 598-601
web3BatchHelper.ts | 99.49 | 97.82 | 100 | 99.45 | 384
web3Utils.ts | 99.38 | 95.58 | 100 | 99.37 | 326
logger | 100 | 96.42 | 92.85 | 100 |
external.ts | 100 | 100 | 100 | 100 |
format.ts | 100 | 100 | 100 | 100 |
index.ts | 100 | 50 | 75 | 100 | 19
middlewares | 91.51 | 76.08 | 96.15 | 91.77 |
auth.ts | 78.57 | 70.58 | 90 | 79.48 | 17-22,62,76-81
error.ts | 100 | 100 | 100 | 100 |
index.ts | 100 | 100 | 100 | 100 |
logger.ts | 100 | 100 | 100 | 100 |
security.ts | 83.87 | 33.33 | 100 | 83.33 | 19-20,45,57-58
upload.ts | 100 | 100 | 100 | 100 |
util.ts | 100 | 100 | 100 | 100 |
models | 100 | 100 | 100 | 100 |
index.ts | 100 | 100 | 100 | 100 |
models/schema | 99.21 | 87.22 | 99.47 | 99.19 |
asset.ts | 98.3 | 86.66 | 100 | 98.21 | 266
campaign.ts | 98.1 | 80.64 | 100 | 98 | 273,306,362
campaignMerkleRoot.ts | 100 | 100 | 100 | 100 |
campaignReward.ts | 100 | 94.44 | 100 | 100 | 204
configIndexer.ts | 100 | 100 | 100 | 100 |
dao.ts | 95.39 | 92 | 93.61 | 95.3 | 854,908-915,926-933,943-950
daoPermission.ts | 98.5 | 80 | 100 | 98.46 | 216
gauge.ts | 100 | 84.61 | 100 | 100 | 101-102
gaugeMetrics.ts | 100 | 100 | 100 | 100 |
jwt.ts | 100 | 100 | 100 | 100 |
lock.ts | 100 | 76 | 100 | 100 | 189-190,300,321,343
lockToVoteMember.ts | 100 | 82.35 | 100 | 100 | 131-132,245
logMetadata.ts | 98.83 | 82.35 | 97.14 | 98.8 | 108
logPluginSetupProcessor.ts | 100 | 84.61 | 100 | 100 | 102-103
member.ts | 100 | 84.61 | 100 | 100 | 88-120
metrics.ts | 100 | 100 | 100 | 100 |
migration.ts | 100 | 100 | 100 | 100 |
plugin.ts | 100 | 100 | 100 | 100 |
pluginMember.ts | 98.43 | 82.6 | 100 | 98.38 | 234
pluginMetrics.ts | 100 | 100 | 100 | 100 |
pluginRepo.ts | 97.95 | 100 | 94.11 | 97.87 | 82
pluginSlug.ts | 100 | 100 | 100 | 100 |
proposal.ts | 99.22 | 80.95 | 100 | 99.21 | 774,778
selectorPermission.ts | 100 | 93.75 | 100 | 100 | 222
setting.ts | 100 | 90.9 | 100 | 100 | 332-333
taskRun.ts | 100 | 70 | 100 | 100 | 88-92
taskService.ts | 100 | 100 | 100 | 100 |
token.ts | 100 | 75 | 100 | 100 | 158-159,221-222
tokenMember.ts | 100 | 83.33 | 100 | 100 | 129-130,243
transaction.ts | 98.57 | 85.5 | 100 | 98.55 | 218,245
vote.ts | 98.07 | 91.17 | 100 | 98.03 | 431,464
voteGauge.ts | 100 | 81.81 | 100 | 100 | 133
models/utils | 94.47 | 85.02 | 93.18 | 94.4 |
aggregation.ts | 90.15 | 75.36 | 85.71 | 90.15 | 458,522-558,757
crawler.ts | 97.12 | 93.15 | 93.33 | 97.1 | 273,277-279
dbOperations.ts | 100 | 100 | 100 | 100 |
models.ts | 100 | 86.36 | 100 | 100 | 25,40-41,92-94
setModels.ts | 100 | 100 | 100 | 100 |
modules | 93.79 | 85.43 | 92.67 | 94.56 |
bottleneck.ts | 100 | 100 | 100 | 100 |
connections.ts | 100 | 94.73 | 100 | 100 | 71
dbTx.ts | 95.65 | 92.85 | 100 | 95.58 | 66,98-101
ipfs.ts | 97.72 | 100 | 90 | 100 |
migration.ts | 89.15 | 73.33 | 93.33 | 89.87 | 107,127-139
mongo.ts | 96.33 | 95 | 92 | 96.22 | 52,63,68-69
pairData.ts | 88.78 | 79.62 | 100 | 90.09 | 26-31,67,99,144-147
poolingCrawler.ts | 94.68 | 84 | 88.23 | 96.51 | 58-59,69
provider.ts | 86.86 | 81.39 | 91.66 | 86.66 | 146-157,175-176,236,243,251,263-266
proxyToken.ts | 92.7 | 78.4 | 100 | 92.7 | 163,172,176,192,197,201-202
rabbitMQ.ts | 98.75 | 88.88 | 100 | 98.75 | 94
rates.ts | 100 | 80 | 100 | 100 | 36
taskScheduler.ts | 91.16 | 87.23 | 83.33 | 93.06 | 140,167-168,236,245-254,264-265,441
tenderly.ts | 100 | 100 | 100 | 100 |
modules/crawlers | 93.69 | 83.24 | 89.31 | 94 |
adaptiveBatchSizeManager.ts | 95.96 | 92.06 | 100 | 96.66 | 385,387,389,391
batchRequestManager.ts | 85.93 | 41.66 | 86.95 | 84.48 | 76,81,123-149,242
blockchainLogCrawler.ts | 90.06 | 77.5 | 80 | 90.69 | ...6,368-377,461,516-526,534-559,597-601,615,619,626-630,715
crawlerErrorHandler.ts | 100 | 97.22 | 100 | 100 | 77
index.ts | 100 | 100 | 66.66 | 100 |
logProcessingEngine.ts | 96.21 | 90.9 | 95.45 | 96.57 | 109,338-351,357
progressTracker.ts | 100 | 100 | 100 | 100 |
modules/prometheusStore | 98.11 | 88.88 | 100 | 98.07 |
index.ts | 98.11 | 88.88 | 100 | 98.07 | 43
modules/proxyProvider | 83.87 | 79.31 | 80.95 | 84.74 |
blockscoutProvider.ts | 100 | 71.42 | 100 | 100 | 23
index.ts | 100 | 100 | 100 | 100 |
katanaProvider.ts | 100 | 100 | 100 | 100 |
peaqProvider.ts | 100 | 77.77 | 100 | 100 | 31,37
routescanProvider.ts | 100 | 100 | 100 | 100 |
utils.ts | 100 | 100 | 100 | 100 |
web3Provider.ts | 61.03 | 68 | 50 | 62.5 | 42-118,149-152,179-182
modules/transfers | 100 | 100 | 96 | 100 |
erc20TransferProcessor.ts | 100 | 100 | 100 | 100 |
erc721TransferProcessor.ts | 100 | 100 | 100 | 100 |
index.ts | 100 | 100 | 80 | 100 |
nativeTransferProcessor.ts | 100 | 100 | 100 | 100 |
transferProcessor.ts | 100 | 100 | 100 | 100 |
transferProcessorFactory.ts | 100 | 100 | 100 | 100 |
services/aragon-admin-api | 100 | 100 | 100 | 100 |
app.ts | 100 | 100 | 100 | 100 |
index.ts | 100 | 100 | 100 | 100 |
services/aragon-admin-api/controllers | 64.64 | 38.88 | 50 | 65.36 |
capitalDistributor.ts | 100 | 100 | 100 | 100 |
dao.ts | 34.21 | 0 | 20 | 34.21 | 30-100
harmonyVoting.ts | 15.21 | 0 | 0 | 15.9 | 9-33,38-117
metrics.ts | 100 | 100 | 100 | 100 |
queue.ts | 100 | 100 | 100 | 100 |
status.ts | 100 | 100 | 100 | 100 |
services/aragon-admin-api/routers | 80.2 | 100 | 64.51 | 80.62 |
capitalDistributor.ts | 100 | 100 | 100 | 100 |
dao.ts | 61.76 | 100 | 33.33 | 61.76 | 11-34,53-73
harmonyVoting.ts | 40 | 100 | 14.28 | 40 | 9-75
index.ts | 96.15 | 100 | 50 | 100 |
metrics.ts | 100 | 100 | 100 | 100 |
queue.ts | 100 | 100 | 100 | 100 |
status.ts | 100 | 100 | 100 | 100 |
services/aragon-admin-api/routers/schema | 100 | 100 | 100 | 100 |
capitalDistributor.ts | 100 | 100 | 100 | 100 |
generic.ts | 100 | 100 | 100 | 100 |
harmonyVoting.ts | 100 | 100 | 100 | 100 |
services/aragon-api | 100 | 100 | 100 | 100 |
app.ts | 100 | 100 | 100 | 100 |
index.ts | 100 | 100 | 100 | 100 |
status.ts | 100 | 100 | 100 | 100 |
services/aragon-api/controllers | 93.46 | 79.16 | 96.42 | 93.66 |
asset.ts | 100 | 100 | 100 | 100 |
capitalDistributor.ts | 100 | 100 | 100 | 100 |
contract.ts | 100 | 100 | 100 | 100 |
dao.ts | 72.61 | 72.72 | 85.71 | 73.49 | 52-99
executeSelector.ts | 100 | 100 | 100 | 100 |
gauge.ts | 100 | 100 | 100 | 100 |
member.ts | 100 | 85.71 | 100 | 100 | 64-89
permission.ts | 100 | 100 | 100 | 100 |
plugins.ts | 100 | 100 | 100 | 100 |
proposal.ts | 97.22 | 45.45 | 100 | 97.22 | 84
setting.ts | 100 | 33.33 | 100 | 100 | 18-19
simulation.ts | 100 | 100 | 100 | 100 |
status.ts | 100 | 100 | 100 | 100 |
token.ts | 100 | 33.33 | 100 | 100 | 17-18
transaction.ts | 100 | 100 | 100 | 100 |
vote.ts | 100 | 50 | 100 | 100 | 14-15
services/aragon-api/routers | 100 | 100 | 100 | 100 |
index.ts | 100 | 100 | 100 | 100 |
services/aragon-api/routers/schema | 100 | 100 | 100 | 100 |
asset.ts | 100 | 100 | 100 | 100 |
capitalDistributor.ts | 100 | 100 | 100 | 100 |
contract.ts | 100 | 100 | 100 | 100 |
dao.ts | 100 | 100 | 100 | 100 |
executeSelector.ts | 100 | 100 | 100 | 100 |
gauge.ts | 100 | 100 | 100 | 100 |
member.ts | 100 | 100 | 100 | 100 |
pagination.ts | 100 | 100 | 100 | 100 |
permission.ts | 100 | 100 | 100 | 100 |
plugin.ts | 100 | 100 | 100 | 100 |
proposal.ts | 100 | 100 | 100 | 100 |
setting.ts | 100 | 100 | 100 | 100 |
simulation.ts | 100 | 100 | 100 | 100 |
token.ts | 100 | 100 | 100 | 100 |
transaction.ts | 100 | 100 | 100 | 100 |
vote.ts | 100 | 100 | 100 | 100 |
services/aragon-api/routers/v1 | 100 | 100 | 100 | 100 |
asset.ts | 100 | 100 | 100 | 100 |
contract.ts | 100 | 100 | 100 | 100 |
dao.ts | 100 | 100 | 100 | 100 |
index.ts | 100 | 100 | 100 | 100 |
member.ts | 100 | 100 | 100 | 100 |
plugins.ts | 100 | 100 | 100 | 100 |
proposal.ts | 100 | 100 | 100 | 100 |
setting.ts | 100 | 100 | 100 | 100 |
token.ts | 100 | 100 | 100 | 100 |
transaction.ts | 100 | 100 | 100 | 100 |
vote.ts | 100 | 100 | 100 | 100 |
services/aragon-api/routers/v2 | 98.68 | 100 | 98.21 | 98.68 |
asset.ts | 100 | 100 | 100 | 100 |
capitalDistributor.ts | 100 | 100 | 100 | 100 |
contract.ts | 100 | 100 | 100 | 100 |
dao.ts | 85.71 | 100 | 85.71 | 85.71 | 88-99
executeSelector.ts | 100 | 100 | 100 | 100 |
gauge.ts | 100 | 100 | 100 | 100 |
index.ts | 100 | 100 | 100 | 100 |
member.ts | 100 | 100 | 100 | 100 |
permission.ts | 100 | 100 | 100 | 100 |
plugins.ts | 100 | 100 | 100 | 100 |
proposal.ts | 100 | 100 | 100 | 100 |
setting.ts | 100 | 100 | 100 | 100 |
simulation.ts | 100 | 100 | 100 | 100 |
token.ts | 100 | 100 | 100 | 100 |
transaction.ts | 100 | 100 | 100 | 100 |
vote.ts | 100 | 100 | 100 | 100 |
services/aragon-dao | 100 | 92.3 | 100 | 100 |
allMetrics.ts | 100 | 100 | 100 | 100 |
daoAssets.ts | 100 | 82.6 | 100 | 100 | 58,101-102
daoMetrics.ts | 100 | 100 | 100 | 100 |
daoTransactions.ts | 100 | 100 | 100 | 100 |
gaugeMetrics.ts | 100 | 100 | 100 | 100 |
index.ts | 100 | 100 | 100 | 100 |
proposalMetrics.ts | 100 | 100 | 100 | 100 |
services/aragon-gateway | 99.57 | 96.8 | 100 | 99.54 |
actionDecoder.ts | 100 | 100 | 100 | 100 |
capitalDistributor.ts | 100 | 100 | 100 | 100 |
contractInfo.ts | 100 | 93.54 | 100 | 100 | 21,47
gauge.ts | 100 | 100 | 100 | 100 |
index.ts | 100 | 100 | 100 | 100 |
memberInfo.ts | 98.75 | 97.43 | 100 | 98.57 | 142
plugin.ts | 100 | 100 | 100 | 100 |
services/aragon-indexer | 34.67 | 10 | 45.45 | 36.2 |
configIndexer.ts | 100 | 100 | 100 | 100 |
harmonyVotingFinalizer.ts | 5.43 | 0 | 0 | 5.93 | 36-290,295-528
index.ts | 77.63 | 50 | 66.66 | 78.08 | 32-47,55,81,151-161
syncAll.ts | 100 | 100 | 100 | 100 |
services/aragon-plugins | 100 | 100 | 100 | 100 |
index.ts | 100 | 100 | 100 | 100 |
logAdmin.ts | 100 | 100 | 100 | 100 |
logCampaignStrategy.ts | 100 | 100 | 100 | 100 |
logCapitalDistributor.ts | 100 | 100 | 100 | 100 |
logDao.ts | 100 | 100 | 100 | 100 |
logGauge.ts | 100 | 100 | 100 | 100 |
logLockToVote.ts | 100 | 100 | 100 | 100 |
logMultisig.ts | 100 | 100 | 100 | 100 |
logSPP.ts | 100 | 100 | 100 | 100 |
logSelectorPermission.ts | 100 | 100 | 100 | 100 |
logTokenVoting.ts | 100 | 100 | 100 | 100 |
services/aragon-rates | 88.5 | 53.19 | 100 | 91.56 |
fetchRates.ts | 85.29 | 53.19 | 100 | 89.06 | 211-219
index.ts | 100 | 100 | 100 | 100 |
services/aragon-requeue | 100 | 100 | 100 | 100 |
index.ts | 100 | 100 | 100 | 100 |
services/aragon-transfers | 100 | 100 | 100 | 100 |
index.ts | 100 | 100 | 100 | 100 |
transferIndexer.ts | 100 | 100 | 100 | 100 |
state | 100 | 100 | 100 | 100 |
configState.ts | 100 | 100 | 100 | 100 |
taskSchedulerState.ts | 100 | 100 | 100 | 100 |
types | 100 | 100 | 100 | 100 |
admin.ts | 100 | 100 | 100 | 100 |
alchemyNetwork.ts | 100 | 100 | 100 | 100 |
ankr.ts | 100 | 100 | 100 | 100 |
blockScout.ts | 100 | 100 | 100 | 100 |
config.ts | 100 | 100 | 100 | 100 |
crawler.ts | 100 | 100 | 100 | 100 |
daos.ts | 100 | 100 | 100 | 100 |
db.ts | 100 | 100 | 100 | 100 |
drpcNetwork.ts | 100 | 100 | 100 | 100 |
error.ts | 100 | 100 | 100 | 100 |
index.ts | 100 | 100 | 100 | 100 |
indexer.ts | 100 | 100 | 100 | 100 |
logger.ts | 100 | 100 | 100 | 100 |
merkleTree.ts | 100 | 100 | 100 | 100 |
networks.ts | 100 | 100 | 100 | 100 |
node.ts | 100 | 100 | 100 | 100 |
pagination.ts | 100 | 100 | 100 | 100 |
permission.ts | 100 | 100 | 100 | 100 |
plugin.ts | 100 | 100 | 100 | 100 |
proposalAction.ts | 100 | 100 | 100 | 100 |
proxyWeb3.ts | 100 | 100 | 100 | 100 |
queue.ts | 100 | 100 | 100 | 100 |
services.ts | 100 | 100 | 100 | 100 |
tenderly.ts | 100 | 100 | 100 | 100 |
token.ts | 100 | 100 | 100 | 100 |
transfer.ts | 100 | 100 | 100 | 100 |
------------------------------------------|---------|----------|---------|---------|--------------------------------------------------------------

=============================== Coverage summary ===============================
Statements : 94.35% ( 14680/15559 )
Branches : 85.15% ( 3785/4445 )
Functions : 95.44% ( 2831/2966 )
Lines : 94.62% ( 14163/14967 )
================================================================================
Done in 1807.27s.
