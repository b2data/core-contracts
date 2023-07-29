import { Address, toNano } from 'ton-core';
import { Organizations } from '../wrappers/Organizations';
import { NetworkProvider, sleep } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
  const ui = provider.ui();

  const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Contract address'));
  const account = Address.parse(args.length > 0 ? args[1] : await ui.input('Organization TON wallet'));
  const newOwnerAccount = Address.parse(args.length > 0 ? args[1] : await ui.input('New owner account TON wallet'));

  if (!(await provider.isContractDeployed(address))) {
    ui.write(`Error: Contract at address ${address} is not deployed!`);
    return;
  }

  const organizations = provider.open(Organizations.createFromAddress(address));

  const ownerBefore = await organizations.getOwnerByAdrress(account);
  ui.write(`Owner Before: ${ownerBefore?.toString()}`);

  await organizations.sendChangeOwner(provider.sender(), {
    gas: toNano('0.1'),
    account,
    newOwner: newOwnerAccount,
  });

  ui.write('Waiting for changing the orgnization owner...');

  let ownerAfter = await organizations.getOwnerByAdrress(account);
  let attempt = 1;
  while (ownerAfter?.toString() === ownerBefore?.toString()) {
    ui.setActionPrompt(`Attempt ${attempt}`);
    await sleep(2000);
    ownerAfter = await organizations.getOwnerByAdrress(account);
    attempt++;
  }

  ui.write(`Owner After: ${ownerAfter?.toString()}`);

  ui.clearActionPrompt();
  ui.write('The organization owner has been successfully changed!');
}
