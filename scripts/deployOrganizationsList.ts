import { toNano } from 'ton-core';
import { OrganizationsList } from '../wrappers/OrganizationsList';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const organizationsList = provider.open(OrganizationsList.createFromConfig({}, await compile('OrganizationsList')));

    await organizationsList.sendDeploy(provider.sender(), toNano('0.01'));

    await provider.waitForDeploy(organizationsList.address);

    // run methods on `organizationsList`
}
