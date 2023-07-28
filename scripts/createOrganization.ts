import { Address, toNano } from 'ton-core';
import { Organizations } from '../wrappers/Organizations';
import { NetworkProvider, sleep } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
  const ui = provider.ui();

  const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Contract address'));
  const account = Address.parse(args.length > 0 ? args[1] : await ui.input('Organization TON wallet'));
  const site = args.length > 0 ? args[2] : await ui.input('Organization ADNL site');

  if (!(await provider.isContractDeployed(address))) {
    ui.write(`Error: Contract at address ${address} is not deployed!`);
    return;
  }

  const organizations = provider.open(Organizations.createFromAddress(address));

  const organizationsBefore = await organizations.getTotal();
  ui.write(`Organizations Before: ${organizationsBefore.toString()}`);

  await organizations.sendCreate(provider.sender(), {
    gas: toNano('0.1'),
    account,
    site
  });

  ui.write('Waiting for orgnization creation...');

  let organizationsAfter = await organizations.getTotal();
  let attempt = 1;
  while (organizationsAfter === organizationsBefore) {
    ui.setActionPrompt(`Attempt ${attempt}`);
    await sleep(2000);
    organizationsAfter = await organizations.getTotal();
    attempt++;
  }

  ui.write(`Organizations After: ${organizationsAfter.toString()}`);

  ui.clearActionPrompt();
  ui.write('Organization has been created successfully!');
}
