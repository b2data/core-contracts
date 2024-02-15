import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { JettonOp } from './utils-jetton';

export type JettonWalletConfig = {};

export function jettonWalletConfigToCell(config: JettonWalletConfig): Cell {
  return beginCell().endCell();
}

export class JettonWallet implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromAddress(address: Address) {
    return new JettonWallet(address);
  }

  static createFromConfig(config: JettonWalletConfig, code: Cell, workchain = 0) {
    const data = jettonWalletConfigToCell(config);
    const init = { code, data };
    return new JettonWallet(contractAddress(workchain, init), init);
  }

  static transferQuery(
    jettonAmount: bigint,
    to: Address,
    responseAddress: Address,
    forwardTonAmount: bigint,
    customPayload?: Cell | null,
    forwardPayload?: Cell | null,
  ) {
    return beginCell()
      .storeUint(JettonOp.Transfer, 32)
      .storeUint(0, 64)
      .storeCoins(jettonAmount)
      .storeAddress(to)
      .storeAddress(responseAddress)
      .storeMaybeRef(customPayload)
      .storeCoins(forwardTonAmount)
      .storeMaybeRef(forwardPayload)
      .endCell();
  }

  async sendTransfer(
    provider: ContractProvider,
    via: Sender,
    gas: bigint,
    opt: {
      jettonAmount: bigint;
      to: Address;
      responseAddress: Address;
      forwardTonAmount: bigint;
      customPayload?: Cell | null;
      forwardPayload?: Cell | null;
    },
  ) {
    await provider.internal(via, {
      value: gas,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: JettonWallet.transferQuery(
        opt.jettonAmount,
        opt.to,
        opt.responseAddress,
        opt.forwardTonAmount,
        opt.customPayload,
        opt.forwardPayload,
      ),
    });
  }

  static burnQuery(jettonAmount: bigint, responseAddress: Address, customPayload?: Cell | null) {
    return beginCell()
      .storeUint(JettonOp.Burn, 32)
      .storeUint(0, 64)
      .storeCoins(jettonAmount)
      .storeAddress(responseAddress)
      .storeMaybeRef(customPayload)
      .endCell();
  }

  async sendBurn(
    provider: ContractProvider,
    via: Sender,
    gas: bigint,
    opt: { jettonAmount: bigint; responseAddress: Address; customPayload?: Cell | null },
  ) {
    await provider.internal(via, {
      value: gas,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: JettonWallet.burnQuery(opt.jettonAmount, opt.responseAddress, opt.customPayload),
    });
  }

  async sendWithdrawTons(provider: ContractProvider, via: Sender, gas: bigint) {
    await provider.internal(via, {
      value: gas,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().storeUint(JettonOp.WithdrawTons, 32).storeUint(0, 64).endCell(),
    });
  }

  async getWalletData(provider: ContractProvider) {
    const state = await provider.getState();
    if (state.state.type !== 'active') {
      return null;
    }
    const result = await provider.get('get_wallet_data', []);
    const balance = result.stack.readBigNumber();
    const ownerAddress = result.stack.readAddress();
    const jettonMasterAddress = result.stack.readAddress();
    return { balance, ownerAddress, jettonMasterAddress };
  }

  async getJettonBalance(provider: ContractProvider) {
    const data = await this.getWalletData(provider);
    return !data ? 0n : data.balance;
  }

  async getOwnerAddress(provider: ContractProvider) {
    const data = await this.getWalletData(provider);
    return !data ? null : data.ownerAddress;
  }
}
