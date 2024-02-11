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

  async sendTransfer(
    provider: ContractProvider,
    via: Sender,
    gas: bigint,
    opt: {
      to: Address;
      jettonAmount: bigint;
      responseAddress: Address;
      forwardTonAmount: bigint;
      customPayload?: Cell | null;
      forwardPayload?: Cell | null;
    },
  ) {
    await provider.internal(via, {
      value: gas,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(JettonOp.Transfer, 32)
        .storeUint(0, 64)
        .storeCoins(opt.jettonAmount)
        .storeAddress(opt.to)
        .storeAddress(opt.responseAddress)
        .storeMaybeRef(opt.customPayload)
        .storeCoins(opt.forwardTonAmount)
        .storeMaybeRef(opt.forwardPayload)
        .endCell(),
    });
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
      body: beginCell()
        .storeUint(JettonOp.Burn, 32)
        .storeUint(0, 64)
        .storeCoins(opt.jettonAmount)
        .storeAddress(opt.responseAddress)
        .storeMaybeRef(opt.customPayload)
        .endCell(),
    });
  }

  async sendWithdrawTons(provider: ContractProvider, via: Sender, gas: bigint) {
    await provider.internal(via, {
      value: gas,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().storeUint(JettonOp.WithdrawTons, 32).storeUint(0, 64).endCell(),
    });
  }

  async getJettonBalance(provider: ContractProvider) {
    const state = await provider.getState();
    if (state.state.type !== 'active') {
      return 0n;
    }
    const result = await provider.get('get_wallet_data', []);
    return result.stack.readBigNumber();
  }
}
