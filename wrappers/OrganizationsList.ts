import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type OrganizationsListConfig = {};

export function organizationsListConfigToCell(config: OrganizationsListConfig): Cell {
    return beginCell().endCell();
}

export class OrganizationsList implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new OrganizationsList(address);
    }

    static createFromConfig(config: OrganizationsListConfig, code: Cell, workchain = 0) {
        const data = organizationsListConfigToCell(config);
        const init = { code, data };
        return new OrganizationsList(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
