import { toNano } from 'ton-core';
import { Organizations } from '../wrappers/Organizations';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
  const organizations = provider.open(Organizations.createFromConfig({}, await compile('Organizations')));

  await organizations.sendDeploy(provider.sender(), toNano('0.05'));

  await provider.waitForDeploy(organizations.address);

  console.log('Total', await organizations.getTotal());
}
