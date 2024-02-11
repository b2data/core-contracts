import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
  toNano,
} from '@ton/core';
import { buildTokenMetadataCell, JettonMetaDataKeys, JettonOp, transformContentCell } from './utils-jetton';

export type JettonMasterConfig = {
  owner: Address;
  walletCell: Cell;
  metadata: { [s in JettonMetaDataKeys]?: string };
};

export function jettonMasterConfigToCell(config: JettonMasterConfig): Cell {
  return beginCell()
    .storeCoins(0)
    .storeAddress(config.owner)
    .storeRef(buildTokenMetadataCell(config.metadata))
    .storeRef(config.walletCell)
    .endCell();
}

export class JettonMaster implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromAddress(address: Address, init?: { code: Cell; data: Cell }) {
    return new JettonMaster(address, init);
  }

  static createFromConfig(config: JettonMasterConfig, code: Cell, workchain = 0) {
    const data = jettonMasterConfigToCell(config);
    const init = { code, data };
    return new JettonMaster(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender) {
    await provider.internal(via, {
      value: toNano(0.02),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendMint(
    provider: ContractProvider,
    via: Sender,
    opt: { to: Address; jettonAmount: bigint; forwardTonAmount: bigint; totalTonAmount: bigint },
  ) {
    await provider.internal(via, {
      value: opt.totalTonAmount + toNano(0.02),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(JettonOp.Mint, 32)
        .storeUint(0, 64)
        .storeAddress(opt.to)
        .storeCoins(opt.jettonAmount)
        .storeCoins(opt.forwardTonAmount)
        .storeCoins(opt.totalTonAmount)
        .endCell(),
    });
  }

  async sendBurnJettons(
    provider: ContractProvider,
    via: Sender,
    opt: { to: Address; jettonAmount: bigint; forwardTonAmount: bigint; totalTonAmount: bigint },
  ) {
    await provider.internal(via, {
      value: toNano(0.02),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(JettonOp.BurnJettons, 32)
        .storeUint(0, 64)
        .storeAddress(opt.to)
        .storeCoins(opt.jettonAmount)
        .storeCoins(opt.forwardTonAmount)
        .storeCoins(opt.totalTonAmount)
        .endCell(),
    });
  }

  async sendChangeAdmin(provider: ContractProvider, via: Sender, newOwner: Address) {
    await provider.internal(via, {
      value: toNano(0.02),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().storeUint(JettonOp.ChangeAdmin, 32).storeUint(0, 64).storeAddress(newOwner).endCell(),
    });
  }

  async sendChangeMetadata(provider: ContractProvider, via: Sender, metadata: Cell) {
    await provider.internal(via, {
      value: toNano(0.02),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().storeUint(JettonOp.ChangeMetadata, 32).storeUint(0, 64).storeRef(metadata).endCell(),
    });
  }

  async getJettonData(provider: ContractProvider) {
    const result = await provider.get('get_jetton_data', []);
    const totalSupply = result.stack.readBigNumber();
    const canMint = result.stack.readBigNumber();
    const adminAddress = result.stack.readAddress();
    const content = result.stack.readCell();
    const walletCode = result.stack.readCell();

    return {
      totalSupply,
      mintable: canMint.toString() === '-1',
      adminAddress,
      metadata: transformContentCell(content),
      walletCode,
    };
  }

  async getTotalSupply(provider: ContractProvider) {
    const result = await this.getJettonData(provider);
    return result.totalSupply;
  }

  async getAdminAddress(provider: ContractProvider) {
    const result = await this.getJettonData(provider);
    return result.adminAddress;
  }

  async getMetadata(provider: ContractProvider) {
    const result = await this.getJettonData(provider);
    return result.metadata;
  }

  async getWalletAddress(provider: ContractProvider, address: Address) {
    const result = await provider.get('get_wallet_address', [
      { type: 'slice', cell: beginCell().storeAddress(address).endCell() },
    ]);
    return result.stack.readAddress();
  }
}
