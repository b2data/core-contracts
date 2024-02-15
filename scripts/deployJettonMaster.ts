import { Address } from '@ton/core';
import { JettonMaster, jettonMasterConfigToCell } from '../wrappers/JettonMaster';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
  const ui = provider.ui();

  const address = args.length > 0 ? args[0] : await ui.input('Contract address (optional)');

  const config = {
    owner: provider.sender().address || Address.parse('0QDyZBOXXjILiUTvx-5apgovq97k7aMrilhxvasBOlYCSEIQ'),
    metadata: {
      name: 'Demo B2D',
      description: 'Demo B2D',
      image: 'https://github.com/b2data/mvp-dapp/blob/main/icon192.png?raw=true',
      decimals: '2',
      symbol: 'RUB',
    },
    walletCell: await compile('JettonWallet'),
  };

  const code = await compile('JettonMaster');

  if (address) {
    const jettonMaster = provider.open(
      JettonMaster.createFromAddress(Address.parse(address), { code, data: jettonMasterConfigToCell(config) }),
    );
    await jettonMaster.sendDeploy(provider.sender());
  } else {
    const jettonMaster = provider.open(JettonMaster.createFromConfig(config, code));
    await jettonMaster.sendDeploy(provider.sender());
  }

  ui.clearActionPrompt();
  ui.write('Deployed');
}
