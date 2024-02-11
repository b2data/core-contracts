import { Address, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { JettonWallet } from '../wrappers/JettonWallet';

export async function run(provider: NetworkProvider, args: string[]) {
  const ui = provider.ui();

  const contract = Address.parse(args.length > 0 ? args[0] : await ui.input('Owner contract address'));
  const receiver = Address.parse(args.length > 0 ? args[1] : await ui.input('Receiver address'));
  const jettons = args.length > 0 ? args[2] : await ui.input('Jettons amount');

  if (!(await provider.isContractDeployed(contract))) {
    ui.write(`Error: Contract at address ${contract} is not deployed!`);
    return;
  }

  const jettonWallet = provider.open(JettonWallet.createFromAddress(contract));

  await jettonWallet.sendTransfer(provider.sender(), toNano('0.03'), {
    jettonAmount: toNano(jettons),
    to: receiver,
    responseAddress: provider.sender().address as Address,
    forwardTonAmount: toNano(0.001),
  });

  ui.clearActionPrompt();
  ui.write('Done');
}
