import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';
import { OrganizationsList } from '../wrappers/OrganizationsList';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';

describe('OrganizationsList', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('OrganizationsList');
    });

    let blockchain: Blockchain;
    let organizationsList: SandboxContract<OrganizationsList>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        organizationsList = blockchain.openContract(OrganizationsList.createFromConfig({}, code));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await organizationsList.sendDeploy(deployer.getSender(), toNano('0.01'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: organizationsList.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and organizationsList are ready to use
    });
});
