import { Address, toNano } from '@ton/core';
import { Users } from '../wrappers/Users';
import { NetworkProvider, sleep } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
  const ui = provider.ui();

  const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Contract address'));
  const account = Address.parse(args.length > 0 ? args[1] : await ui.input('Organization TON wallet'));
  const wallet = Address.parse(args.length > 0 ? args[2] : await ui.input('User TON wallet'));

  if (!(await provider.isContractDeployed(address))) {
    ui.write(`Error: Contract at address ${address} is not deployed!`);
    return;
  }

  const users = provider.open(Users.createFromAddress(address));

  const organizationsBefore = await users.getOrganizations(wallet);
  ui.write(`Organizations Before: ${organizationsBefore.length}`);

  await users.sendRemoveFromOrganization(provider.sender(), {
    gas: toNano('0.1'),
    account,
    wallet,
  });

  ui.write('Waiting for removing the user from the orgnization...');

  let organizationsAfter = await users.getOrganizations(wallet);
  let attempt = 1;
  while (organizationsAfter.length === organizationsBefore.length) {
    ui.setActionPrompt(`Attempt ${attempt}`);
    await sleep(2000);
    organizationsAfter = await users.getOrganizations(wallet);
    attempt++;
  }

  ui.write(`Organizations After: ${organizationsAfter.length}`);

  ui.clearActionPrompt();
  ui.write('The user has been successfully removed from the organization!');
}
