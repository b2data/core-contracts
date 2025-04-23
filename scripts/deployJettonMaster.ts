import { Address } from '@ton/core';
import { JettonMaster, jettonMasterConfigToCell } from '../wrappers/JettonMaster';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
  const ui = provider.ui();

  const address = args.length > 0 ? args[0] : await ui.input('Contract address (optional)');

  const config = {
    owner: provider.sender().address || Address.parse('0QDEJFMf62Sv60Zgfgr_VgliggchMwi2LBI4kdgXOJ_DW8_y'),
    metadata: {
      name: 'Digital Cooperation',
      description: 'Account in CCMP "Digital Cooperation"',
      image: 'https://github.com/b2data/dapp/blob/main/icon192.png?raw=true',
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
    ui.write(jettonMaster.address.toString());
  }

  ui.clearActionPrompt();
  ui.write('Deployed');
}
