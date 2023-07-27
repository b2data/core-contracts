import { Address, beginCell, BitBuilder, BitString, Cell, Contract, contractAddress, ContractProvider, parseTuple, Sender, SendMode, Slice, TupleBuilder } from 'ton-core';

export type OrganizationsConfig = {};

// https://emn178.github.io/online-tools/crc32.html
export const Opcodes = {
  create: 0x15cf00af,
  remove: 0xf299fd64,
  change: 0xda4e1e74,
  rename: 0x4384b41a,
  invite: 0x5dfbf083,
  exclude: 0x0e1e6b74,
};

export function organizationsConfigToCell(config: OrganizationsConfig): Cell {
  return beginCell().storeDict().endCell();
}

export class Organizations implements Contract {
  constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

  static createFromAddress(address: Address) {
    return new Organizations(address);
  }

  static createFromConfig(config: OrganizationsConfig, code: Cell, workchain = 0) {
    const data = organizationsConfigToCell(config);
    const init = { code, data };
    return new Organizations(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, gas: bigint) {
    await provider.internal(via, {
      value: gas,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendCreate(
    provider: ContractProvider,
    via: Sender,
    opts: { gas: bigint; account: Address; site: string }
  ) {
    await provider.internal(via, {
      value: opts.gas,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.create, 32)
        .storeRef(
          beginCell().storeAddress(opts.account).endCell()
        )
        .storeStringRefTail(opts.site)
        .endCell(),
    });
  }

  async sendRemove(
    provider: ContractProvider,
    via: Sender,
    opts: { gas: bigint; account: Address }
  ) {
    await provider.internal(via, {
      value: opts.gas,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.remove, 32)
        .storeRef(
          beginCell().storeAddress(opts.account).endCell()
        )
        .endCell(),
    });
  }

  async sendChangeOwner(
    provider: ContractProvider,
    via: Sender,
    opts: { gas: bigint; account: Address; newOwner: Address }
  ) {
    await provider.internal(via, {
      value: opts.gas,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.change, 32)
        .storeRef(
          beginCell().storeAddress(opts.account).endCell()
        )
        .storeRef(
          beginCell().storeAddress(opts.newOwner).endCell()
        )
        .endCell(),
    });
  }

  async sendChangeSite(
    provider: ContractProvider,
    via: Sender,
    opts: { gas: bigint; account: Address; site: string }
  ) {
    await provider.internal(via, {
      value: opts.gas,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.rename, 32)
        .storeRef(
          beginCell().storeAddress(opts.account).endCell()
        )
        .storeStringRefTail(opts.site)
        .endCell(),
    });
  }

  async getTotal(provider: ContractProvider) {
    const result = await provider.get('get_total', []);
    return result.stack.readNumber();
  }

  async getAddress(provider: ContractProvider, accountId: bigint) {
    const result = await provider.get('get_contract_address', [{ type: 'int', value: accountId }]);
    return result.stack.readAddressOpt();
  }

  async getOwner(provider: ContractProvider, accountId: bigint) {
    const result = await provider.get('get_owner', [{ type: 'int', value: accountId }]);
    return result.stack.readAddressOpt();
  }

  async getOwnerByAdrress(provider: ContractProvider, address: Address) {
    const result = await provider.get('get_contract_owner', [{ type: 'cell', cell: beginCell().storeAddress(address).endCell() }]);
    return result.stack.readAddressOpt();
  }

  async getSite(provider: ContractProvider, accountId: bigint) {
    const result = await provider.get('get_site', [{ type: 'int', value: accountId }]);
    return result.stack.readBufferOpt()?.toString() || null;
  }

  async getSiteByAdrress(provider: ContractProvider, address: Address) {
    const result = await provider.get('get_contract_site', [{ type: 'cell', cell: beginCell().storeAddress(address).endCell() }]);
    return result.stack.readBufferOpt()?.toString() || null;
  }

  // async getContracts(provider: ContractProvider) {
  //   const result = await provider.get('get_contacts', []);
  //   const tuple = await result.stack.readTuple();
  //   const list = [];

  //   while (true) {
  //     try {
  //       const address = await tuple.readAddress();
  //       list.push(address);
  //     } catch (err) {
  //       break;
  //     }
  //   }
  //   return list;
  // }
}
