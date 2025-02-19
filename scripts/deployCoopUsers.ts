import { Address } from '@ton/core';
import { CoopUsers } from '../wrappers/CoopUsers';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
  const adminWallet = provider.sender().address;
  const coopUsers = provider.open(
    CoopUsers.createFromConfig(
      {
        owner: adminWallet as Address,
      },
      await compile('CoopUsers'),
    ),
  );

  await coopUsers.sendDeploy(provider.sender());

  await provider.waitForDeploy(coopUsers.address);

  console.log('CoopUsers deployed at: ', coopUsers.address.toString());
}
