import {ethers} from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
  const network = (await ethers.provider.getNetwork()).name || 'harmony';
  const deploymentsDir = path.resolve(__dirname, `../deployments/${network}`);

  const readDeployment = (file: string): {address: string; abi?: any[]} => {
    const p = path.join(deploymentsDir, file);
    const raw = fs.readFileSync(p, 'utf-8');
    return JSON.parse(raw);
  };

  const registryDep = readDeployment('DAORegistryProxy.json');
  const daoFactoryDep = readDeployment('DAOFactory.json');
  const managementDaoDep = readDeployment('ManagementDAOProxy.json');

  const registryAddr = registryDep.address as string;
  const daoFactoryAddr = daoFactoryDep.address as string;
  const managementDaoAddr = managementDaoDep.address as string;

  const registry = await ethers.getContractAt(registryDep.abi!, registryAddr);
  const REGISTER_ID: string = await registry.REGISTER_DAO_PERMISSION_ID();

  const DAO_ABI = ['function grant(address where, address who, bytes32 permissionId)'];
  const iface = new (ethers as any).Interface(DAO_ABI);
  const calldata: string = iface.encodeFunctionData('grant', [registryAddr, daoFactoryAddr, REGISTER_ID]);

  console.log('Resumo da ação de permissão (DAO.grant)');
  console.log('- DAO (to):', managementDaoAddr);
  console.log('- where (Registry proxy):', registryAddr);
  console.log('- who (DAOFactory):', daoFactoryAddr);
  console.log('- permissionId (REGISTER_DAO_PERMISSION_ID):', REGISTER_ID);
  console.log('- calldata:', calldata);

  console.log('\nEnvio sugerido (forge cast):');
  console.log(
    `cast send ${managementDaoAddr} "grant(address,address,bytes32)" ${registryAddr} ${daoFactoryAddr} ${REGISTER_ID} --rpc-url ${process.env.HARMONY_MAINNET_RPC || '<RPC_HARMONY>'} --private-key <CHAVE_COM_ROOT> --legacy --gas-price ${process.env.HARMONY_GAS_PRICE || '200gwei'}`
  );
  console.log('\nOu via Safe/Multisig: use to=DAO, data acima, value=0');
  console.log(`Rede: ${network}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
