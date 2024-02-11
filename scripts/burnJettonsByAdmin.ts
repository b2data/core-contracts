import { Address, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { JettonMaster } from '../wrappers/JettonMaster';

export async function run(provider: NetworkProvider, args: string[]) {
  const ui = provider.ui();

  const contract = Address.parse(args.length > 0 ? args[0] : await ui.input('Contract address'));
  const receiver = Address.parse(args.length > 0 ? args[1] : await ui.input('Receiver address'));
  const jettons = args.length > 0 ? args[2] : await ui.input('Jettons amount');

  if (!(await provider.isContractDeployed(contract))) {
    ui.write(`Error: Contract at address ${contract} is not deployed!`);
    return;
  }

  const jettonMaster = provider.open(JettonMaster.createFromAddress(contract));

  const data = await jettonMaster.sendBurnJettons(provider.sender(), {
    to: receiver,
    jettonAmount: toNano(jettons),
    forwardTonAmount: toNano(0.001),
    totalTonAmount: toNano(0),
  });

  ui.clearActionPrompt();
  ui.write('Done');
}
