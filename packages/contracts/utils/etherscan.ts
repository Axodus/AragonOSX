import {networkExtensions} from '../networks';
import fs from 'fs';
import HRE from 'hardhat';
import {file} from 'tmp-promise';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const verifyContract = async (
  address: string,
  constructorArguments: any[],
  contract?: string
) => {
  const currentNetwork = HRE.network.name;

  if (!Object.keys(networkExtensions).includes(currentNetwork)) {
    throw Error(
      `Current network ${currentNetwork} not supported. Please change to one of the next networks: ${Object.keys(
        networkExtensions
      ).join(',')}`
    );
  }

  try {
    const msDelay = 500; // minimum dely between tasks
    const times = 2; // number of retries

    // Write a temporal file to host complex parameters for hardhat-etherscan https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-etherscan#complex-arguments
    const {fd, path, cleanup} = await file({
      prefix: 'verify-params-',
      postfix: '.js',
    });
    fs.writeSync(
      fd,
      `module.exports = ${JSON.stringify([...constructorArguments])};`
    );

    const params = {
      contract,
      address,
      constructorArgs: path,
    };
    await runTaskWithRetry('verify', params, times, msDelay, cleanup);
  } catch (error) {
    console.warn(`Verify task error: ${error}`);
  }
};

export const runTaskWithRetry = async (
  task: string,
  params: any,
  times: number,
  msDelay: number,
  cleanup: () => void
) => {
  const timeoutMs = Number(process.env.VERIFY_TASK_TIMEOUT_MS || 300_000);
  const runWithTimeout = async () => {
    if (!timeoutMs || timeoutMs <= 0) {
      return HRE.run(task, params);
    }

    let timeoutHandle: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        HRE.run(task, params),
        new Promise((_, reject) => {
          timeoutHandle = setTimeout(() => {
            const err = new Error(
              `verify task timeout after ${timeoutMs}ms (task=${task})`
            ) as any;
            err.code = 'VERIFY_TIMEOUT';
            reject(err);
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  };

  let attemptsLeft = Number(times || 0);

  while (attemptsLeft > 0) {
    await delay(msDelay);

    try {
      await runWithTimeout();
      cleanup();
      return;
    } catch (error: any) {
      const message = error?.message ? String(error.message) : String(error);

      // Se já está verificado, consideramos sucesso.
      if (/already verified/i.test(message) || /has already been verified/i.test(message)) {
        cleanup();
        return;
      }

      // Timeout de verificação: não bloqueia deploy (explorer pode estar lento).
      if (error?.code === 'VERIFY_TIMEOUT') {
        console.warn(`Verify task timed out (${timeoutMs}ms). Skipping.`);
        cleanup();
        return;
      }

      attemptsLeft -= 1;
      if (attemptsLeft <= 0) {
        cleanup();
        console.error(
          'Errors after all the retries, check the logs for more information.'
        );
        return;
      }

      console.log(`Retrying attemps: ${attemptsLeft}.`);
      console.error(message);
    }
  }

  cleanup();
};
