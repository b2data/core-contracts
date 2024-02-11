import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type UsersConfig = {};

const Opcodes = {
  invite: 0x5dfbf083,
  exclude: 0x0e1e6b74,
};

export function usersConfigToCell(config: UsersConfig): Cell {
  return beginCell().endCell();
}

export class Users implements Contract {
  constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

  static createFromAddress(address: Address) {
    return new Users(address);
  }

  static createFromConfig(config: UsersConfig, code: Cell, workchain = 0) {
    const data = usersConfigToCell(config);
    const init = { code, data };
    return new Users(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendAddToOrganization(
    provider: ContractProvider,
    via: Sender,
    opts: { gas: bigint; wallet: Address; account: Address }
  ) {
    await provider.internal(via, {
      value: opts.gas,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.invite, 32)
        .storeRef(beginCell().storeAddress(opts.account).endCell())
        .storeRef(beginCell().storeAddress(opts.wallet).endCell())
        .endCell(),
    });
  }

  async sendRemoveFromOrganization(
    provider: ContractProvider,
    via: Sender,
    opts: { gas: bigint; wallet: Address; account: Address }
  ) {
    await provider.internal(via, {
      value: opts.gas,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.exclude, 32)
        .storeRef(beginCell().storeAddress(opts.account).endCell())
        .storeRef(beginCell().storeAddress(opts.wallet).endCell())
        .endCell(),
    });
  }

  async getOrganizations(provider: ContractProvider, wallet: Address) {
    const result = await provider.get('get_organizations', [
      { type: 'slice', cell: beginCell().storeAddress(wallet).endCell() },
    ]);
    const tuple = await result.stack.readTuple();
    const list = [];
    while (true) {
      try {
        const address = await tuple.readAddress();
        list.push(address);
      } catch (err) {
        break;
      }
    }
    return list;
  }
}
