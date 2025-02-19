import { Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { CoopUsers } from '../wrappers/CoopUsers';

export async function run(provider: NetworkProvider, args: string[]) {
  const ui = provider.ui();

  const contract = Address.parse(args.length > 0 ? args[0] : await ui.input('Contract address'));
  const wallet = Address.parse(args.length > 0 ? args[1] : await ui.input('Supervisor wallet'));

  if (!(await provider.isContractDeployed(contract))) {
    ui.write(`Error: Contract at address ${contract} is not deployed!`);
    return;
  }

  const coopUsers = provider.open(CoopUsers.createFromAddress(contract));

  await coopUsers.sendRemoveSupervisor(provider.sender(), wallet);

  ui.clearActionPrompt();
  ui.write('Done');

  const fullData = await coopUsers.getFullData();
  ui.write('Supervisors\n\n' + JSON.stringify(fullData.supervisors, null, 2));
}
