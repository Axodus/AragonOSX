import { ethers } from 'hardhat';

async function uninstallStuckPlugin() {
  console.log('🗑️  Uninstalling stuck plugin directly...\n');

  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();

  const daoAddress = '0x76B83B6148ccA891D768cE3129585F25d0104783';
  const pluginAddress = '0x48D6E7Dc4A289417D6878119092d2Bb040162995';
  const helperAddress = '0x6300477942944d2501db08cd5b7e37dc6423e77c'; // O helper que encontramos

  console.log(`Signer: ${signerAddress}`);
  console.log(`DAO: ${daoAddress}`);
  console.log(`Plugin: ${pluginAddress}`);
  console.log(`Helper: ${helperAddress}\n`);

  // Connect to DAO (use fully qualified name to avoid artifact conflicts)
  const dao = await ethers.getContractAt('src/core/dao/DAO.sol:DAO', daoAddress);

  // 1. Check if signer has permission to uninstall
  const ROOT_PERMISSION_ID = ethers.id('ROOT_PERMISSION');
  const hasRoot = await dao.hasPermission(daoAddress, signerAddress, ROOT_PERMISSION_ID, '0x');
  
  console.log(`Has ROOT permission: ${hasRoot}`);

  if (!hasRoot) {
    console.log('\n❌ You need ROOT permission on the DAO to uninstall plugins');
    console.log('   Try connecting with the DAO creator wallet');
    return;
  }

  // 2. Revoke permissions from plugin
  const EXECUTE_PERMISSION_ID = ethers.id('EXECUTE_PERMISSION');
  
  console.log('\n📋 Step 1: Revoke EXECUTE permission from plugin...');
  const tx1 = await dao.revoke(daoAddress, pluginAddress, EXECUTE_PERMISSION_ID);
  console.log(`   Tx: ${tx1.hash}`);
  await tx1.wait();
  console.log('   ✅ Permission revoked');

  // 3. Revoke permissions from helper (if any)
  console.log('\n📋 Step 2: Revoke permissions from helper...');
  const tx2 = await dao.revoke(daoAddress, helperAddress, EXECUTE_PERMISSION_ID);
  console.log(`   Tx: ${tx2.hash}`);
  await tx2.wait();
  console.log('   ✅ Helper permissions revoked');

  console.log('\n✅ Plugin uninstalled successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Plugin ${pluginAddress} permissions revoked`);
  console.log(`   - Helper ${helperAddress} permissions revoked`);
  console.log(`   - Plugin is now disconnected from DAO ${daoAddress}`);
  console.log('\n💡 You can now remove the plugin from the UI manually or it will disappear on next sync');
}

uninstallStuckPlugin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });