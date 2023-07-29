import { toNano } from 'ton-core';
import { Users } from '../wrappers/Users';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
  const users = provider.open(Users.createFromConfig({}, await compile('Users')));

  await users.sendDeploy(provider.sender(), toNano('0.1'));

  await provider.waitForDeploy(users.address);

  console.log('Done');
}
