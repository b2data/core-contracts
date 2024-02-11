import { Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { JettonMaster } from '../wrappers/JettonMaster';

export async function run(provider: NetworkProvider, args: string[]) {
  const ui = provider.ui();

  const contract = Address.parse(args.length > 0 ? args[0] : await ui.input('Contract address'));
  const newAdmin = Address.parse(args.length > 0 ? args[1] : await ui.input('New admin address'));

  if (!(await provider.isContractDeployed(contract))) {
    ui.write(`Error: Contract at address ${contract} is not deployed!`);
    return;
  }

  const jettonMaster = provider.open(JettonMaster.createFromAddress(contract));

  await jettonMaster.sendChangeAdmin(provider.sender(), newAdmin);

  ui.clearActionPrompt();
  ui.write('Done');
}
