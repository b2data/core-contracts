import { Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { CoopUsers } from '../wrappers/CoopUsers';

export async function run(provider: NetworkProvider, args: string[]) {
  const ui = provider.ui();

  const contract = Address.parse(args.length > 0 ? args[0] : await ui.input('Contract address'));
  const wallet = Address.parse(args.length > 0 ? args[1] : await ui.input('User wallet'));
  const timestampEnter = Number(args.length > 0 ? args[1] : await ui.input('User timestamp enter'));
  const timestampLeave = Number(
    args.length > 0 ? args[1] : await ui.input('User timestamp leave. If user is active, enter 0'),
  );
  const data = args.length > 0 ? args[1] : await ui.input('User data JSON string');

  if (!(await provider.isContractDeployed(contract))) {
    ui.write(`Error: Contract at address ${contract} is not deployed!`);
    return;
  }

  const coopUsers = provider.open(CoopUsers.createFromAddress(contract));

  await coopUsers.sendSetUser(provider.sender(), { wallet, timestampEnter, timestampLeave, data });

  ui.clearActionPrompt();
  ui.write('Done');

  const userInfo = await coopUsers.getUserInfo(wallet);
  ui.write('User info\n\n' + JSON.stringify(userInfo, null, 2));
}
