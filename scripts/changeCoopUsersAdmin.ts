import { Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { CoopUsers } from '../wrappers/CoopUsers';

export async function run(provider: NetworkProvider, args: string[]) {
  const ui = provider.ui();

  const contract = Address.parse(args.length > 0 ? args[0] : await ui.input('Contract address'));
  const newAdmin = Address.parse(args.length > 0 ? args[1] : await ui.input('New admin address'));

  if (!(await provider.isContractDeployed(contract))) {
    ui.write(`Error: Contract at address ${contract} is not deployed!`);
    return;
  }

  const coopUsers = provider.open(CoopUsers.createFromAddress(contract));

  await coopUsers.sendChangeAdmin(provider.sender(), newAdmin);

  ui.clearActionPrompt();
  ui.write('Done');
}
