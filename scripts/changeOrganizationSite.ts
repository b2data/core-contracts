import { Address, toNano } from 'ton-core';
import { Organizations } from '../wrappers/Organizations';
import { NetworkProvider, sleep } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
  const ui = provider.ui();

  const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Contract address'));
  const account = Address.parse(args.length > 0 ? args[1] : await ui.input('Organization TON wallet'));
  const newSite = args.length > 0 ? args[1] : await ui.input('New organization site');

  if (!(await provider.isContractDeployed(address))) {
    ui.write(`Error: Contract at address ${address} is not deployed!`);
    return;
  }

  const organizations = provider.open(Organizations.createFromAddress(address));

  const siteBefore = await organizations.getSiteByAdrress(account);
  ui.write(`Site Before: ${siteBefore}`);

  if (siteBefore !== newSite) {
    ui.write(`Error: New site [${newSite}] is the same as the current site [${siteBefore}].`);
    return;
  }

  await organizations.sendChangeSite(provider.sender(), {
    gas: toNano('0.1'),
    account,
    site: newSite,
  });

  ui.write('Waiting for changing the orgnization site...');

  let siteAfter = await organizations.getSiteByAdrress(account);
  let attempt = 1;
  while (siteAfter === siteBefore) {
    ui.setActionPrompt(`Attempt ${attempt}`);
    await sleep(2000);
    siteAfter = await organizations.getSiteByAdrress(account);
    attempt++;
  }

  ui.write(`Site After: ${siteAfter}`);

  ui.clearActionPrompt();
  ui.write('The organization site has been successfully changed!');
}
