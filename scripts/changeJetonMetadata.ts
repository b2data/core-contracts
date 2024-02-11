import { Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { JettonMaster } from '../wrappers/JettonMaster';
import { buildTokenMetadataCell } from '../wrappers/utils-jetton';

export async function run(provider: NetworkProvider, args: string[]) {
  const ui = provider.ui();

  const contract = Address.parse(args.length > 0 ? args[0] : await ui.input('Contract address'));
  const name = args.length > 0 ? args[1] : await ui.input('New name');
  const description = args.length > 0 ? args[2] : await ui.input('New description');
  const image = args.length > 0 ? args[3] : await ui.input('New image');
  const decimals = args.length > 0 ? args[4] : await ui.input('New decimals');
  const symbol = args.length > 0 ? args[5] : await ui.input('New symbol');

  if (!(await provider.isContractDeployed(contract))) {
    ui.write(`Error: Contract at address ${contract} is not deployed!`);
    return;
  }

  const jettonMaster = provider.open(JettonMaster.createFromAddress(contract));

  await jettonMaster.sendChangeMetadata(
    provider.sender(),
    buildTokenMetadataCell({ name, description, image, decimals, symbol }),
  );

  ui.clearActionPrompt();
  ui.write('Done');
}
