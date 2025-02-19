import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Dictionary,
  Sender,
  SendMode,
  toNano,
} from '@ton/core';

const Opcodes = {
  change_admin: 0xd4deb03b,
  add_supervisor: 0x602a234b,
  remove_supervisor: 0xb1bb9885,
  set_user: 0x185434c0,
};

export type CoopUsersConfig = {
  owner: Address;
};

export function coopUsersConfigToCell(config: CoopUsersConfig): Cell {
  return beginCell()
    .storeAddress(config.owner)
    .storeInt(0, 32)
    .storeInt(0, 32)
    .storeDict(Dictionary.empty(Dictionary.Keys.Address(), Dictionary.Values.Cell()))
    .storeDict(Dictionary.empty(Dictionary.Keys.Address(), Dictionary.Values.Cell()))
    .endCell();
}

export class CoopUsers implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromAddress(address: Address) {
    return new CoopUsers(address);
  }

  static createFromConfig(config: CoopUsersConfig, code: Cell, workchain = 0) {
    const data = coopUsersConfigToCell(config);
    const init = { code, data };
    return new CoopUsers(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender) {
    await provider.internal(via, {
      value: toNano(0.02),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendChangeAdmin(provider: ContractProvider, via: Sender, newAdmin: Address) {
    await provider.internal(via, {
      value: toNano(0.03),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().storeUint(Opcodes.change_admin, 32).storeAddress(newAdmin).endCell(),
    });
  }

  async sendAddSupervisor(provider: ContractProvider, via: Sender, wallet: Address) {
    await provider.internal(via, {
      value: toNano(0.03),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().storeUint(Opcodes.add_supervisor, 32).storeAddress(wallet).endCell(),
    });
  }

  async sendRemoveSupervisor(provider: ContractProvider, via: Sender, wallet: Address) {
    await provider.internal(via, {
      value: toNano(0.03),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().storeUint(Opcodes.remove_supervisor, 32).storeAddress(wallet).endCell(),
    });
  }

  async sendSetUser(
    provider: ContractProvider,
    via: Sender,
    opts: {
      wallet: Address;
      timestampEnter: number;
      timestampLeave: number;
      data: string;
    },
  ) {
    await provider.internal(via, {
      value: toNano(0.03),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.set_user, 32)
        .storeAddress(opts.wallet)
        .storeInt(opts.timestampEnter, 32)
        .storeInt(opts.timestampLeave, 32)
        .storeRef(beginCell().storeBuffer(Buffer.from(opts.data)).endCell())
        .endCell(),
    });
  }

  async getFullData(provider: ContractProvider) {
    const result = await provider.get('get_full_data', []);
    const adminAddress = result.stack.readAddress();
    const activeWallets = result.stack.readNumber();
    const totalWallets = result.stack.readNumber();
    const supervisors = parseSupervisors(result.stack.readCellOpt());
    const users = parseUsers(result.stack.readCellOpt());

    return {
      adminAddress: adminAddress.toRawString(),
      activeWallets,
      totalWallets,
      supervisors,
      users,
    };
  }

  async getSupervisorAccess(provider: ContractProvider, wallet: Address) {
    const result = await provider.get('get_supervisor_access', [
      { type: 'slice', cell: beginCell().storeAddress(wallet).endCell() },
    ]);
    return result.stack.readBoolean();
  }

  async getUserAccess(provider: ContractProvider, wallet: Address) {
    const result = await provider.get('get_user_access', [
      { type: 'slice', cell: beginCell().storeAddress(wallet).endCell() },
    ]);
    return result.stack.readBoolean();
  }

  async getUserInfo(provider: ContractProvider, wallet: Address) {
    const result = await provider.get('get_user_info', [
      { type: 'slice', cell: beginCell().storeAddress(wallet).endCell() },
    ]);

    const timestampEnter = result.stack.readNumber();
    const timestampLeave = result.stack.readNumber();
    const data = result.stack.readCell().beginParse().loadStringTail();
    return {
      wallet: wallet.toRawString(),
      timestampEnter,
      timestampLeave,
      data,
    };
  }

  async getActiveWalletsCount(provider: ContractProvider) {
    const result = await provider.get('get_active_wallets_count', []);
    return Number(result.stack.readBigNumber());
  }

  async getTotalUsersCount(provider: ContractProvider) {
    const result = await provider.get('get_total_wallets_count', []);
    return Number(result.stack.readBigNumber());
  }
}

function parseSupervisors(cell: Cell | null): string[] {
  if (!cell) {
    return [];
  }

  try {
    const supervisorsDict = Dictionary.loadDirect(
      Dictionary.Keys.Address(),
      Dictionary.Values.Cell(),
      cell.beginParse(),
    );

    const supervisors: string[] = [];
    supervisorsDict.keys().forEach((key) => {
      if (key instanceof Address) {
        supervisors.push(key.toRawString());
      }
    });

    return supervisors;
  } catch (error) {
    console.error('Error parsing supervisors dictionary:', error);
    return []; // Return an empty array on error
  }
}

function parseUsers(
  cell: Cell | null,
): { wallet: string; timestampEnter: number; timestampLeave: number; data: string }[] {
  if (!cell) {
    return [];
  }

  try {
    const usersDict = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.Cell(), cell.beginParse());

    const users: { wallet: string; timestampEnter: number; timestampLeave: number; data: string }[] = [];
    usersDict.keys().forEach((key) => {
      if (key instanceof Address) {
        const userData = usersDict.get(key)?.beginParse();
        if (userData) {
          const timestampEnter = userData.loadInt(32);
          const timestampLeave = userData.loadInt(32);
          const data = userData.loadStringRefTail();
          users.push({
            wallet: key.toRawString(),
            timestampEnter,
            timestampLeave,
            data,
          });
        }
      }
    });

    return users;
  } catch (error) {
    console.error('Error parsing users dictionary:', error);
    return []; // Return an empty array on error
  }
}
