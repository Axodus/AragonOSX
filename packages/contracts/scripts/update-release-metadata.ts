node -e "const {ethers} = require('hardhat');(async () => {
  const REPO=process.env.PLUGIN_REPO;
  const rel=Number(process.env.RELEASE||1);
  const repo = new ethers.Contract(REPO, ['function updateReleaseMetadata(uint8,bytes)'], (await ethers.getSigners())[0]);
  const {toUtf8Bytes} = require('ethers');
  const tx = await repo.updateReleaseMetadata(rel, toUtf8Bytes(process.env.NEW_RELEASE_URI));
  console.log('tx', tx.hash);
  await tx.wait();
})().catch(console.error)"