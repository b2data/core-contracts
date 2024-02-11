import { Address } from '@ton/core';
import { JettonMaster, jettonMasterConfigToCell } from '../wrappers/JettonMaster';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
  const ui = provider.ui();

  const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Contract address'));
  const owner = Address.parse(args.length > 0 ? args[1] : await ui.input('Owner address'));

  const config = {
    owner: owner || Address.parse('0QDyZBOXXjILiUTvx-5apgovq97k7aMrilhxvasBOlYCSEIQ'),
    metadata: {
      name: '\x00Demo B2D',
      description: '\x00Demo B2D',
      image: '\x00https://github.com/b2data/mvp-dapp/blob/main/icon192.png?raw=true',
      decimals: '\x002',
      symbol: '\x00RUB',
    },
    walletCell: await compile('JettonWallet'),
  };

  const code = await compile('JettonMaster');

  if (address) {
    const jettonMaster = provider.open(
      JettonMaster.createFromAddress(address, { code, data: jettonMasterConfigToCell(config) }),
    );
    await jettonMaster.sendDeploy(provider.sender());
  } else {
    const jettonMaster = provider.open(JettonMaster.createFromConfig(config, code));
    await jettonMaster.sendDeploy(provider.sender());
  }

  ui.clearActionPrompt();
  ui.write('Deployed');
}
