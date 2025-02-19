import { Blockchain, SandboxContract, TreasuryContract, internal } from '@ton/sandbox';
import { Address, beginCell, Cell, toNano } from '@ton/core';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

import { JettonWallet } from '../wrappers/JettonWallet';
import { JettonMaster } from '../wrappers/JettonMaster';
import { JettonError, JettonOp } from '../wrappers/utils/jetton';

const metadata = { name: 'Demo Token', symbol: 'DEMO', decimals: '3' };

describe('JettonWallet', () => {
  let walletCode: Cell;
  let masterCode: Cell;
  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;
  let notDeployer: SandboxContract<TreasuryContract>;
  let jettonMaster: SandboxContract<JettonMaster>;
  let userWallet: (address: Address) => Promise<SandboxContract<JettonWallet>>;

  beforeAll(async () => {
    walletCode = await compile('JettonWallet');
    masterCode = await compile('JettonMaster');
    blockchain = await Blockchain.create();
    deployer = await blockchain.treasury('deployer');
    notDeployer = await blockchain.treasury('notDeployer');

    jettonMaster = blockchain.openContract(
      await JettonMaster.createFromConfig(
        {
          owner: deployer.address,
          metadata,
          walletCell: walletCode,
        },
        masterCode,
      ),
    );

    userWallet = async (address: Address) =>
      blockchain.openContract(JettonWallet.createFromAddress(await jettonMaster.getWalletAddress(address)));
  }, 10000);

  it('should deploy', async () => {
    const deployResult = await jettonMaster.sendDeploy(deployer.getSender());

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: jettonMaster.address,
      deploy: true,
    });
  });

  it('wallet owner should be able to send jettons', async () => {
    await jettonMaster.sendMint(deployer.getSender(), {
      to: deployer.address,
      jettonAmount: toNano(1000),
      forwardTonAmount: toNano(0.05),
      totalTonAmount: toNano(0.1),
    });

    const initialTotalSupply = await jettonMaster.getTotalSupply();

    const deployerJettonWallet = await userWallet(deployer.address);
    const initialJettonBalance = await deployerJettonWallet.getJettonBalance();

    expect(initialJettonBalance).toEqual(toNano(1000));

    const notDeployerJettonWallet = await userWallet(notDeployer.address);
    const initialJettonBalance2 = await notDeployerJettonWallet.getJettonBalance();

    expect(initialJettonBalance2).toEqual(toNano(0));

    const sentAmount = toNano(100);
    const forwardAmount = toNano(0.001);

    const sendResult = await deployerJettonWallet.sendTransfer(deployer.getSender(), toNano('0.1'), {
      jettonAmount: sentAmount,
      to: notDeployer.address,
      responseAddress: deployer.address,
      forwardTonAmount: forwardAmount,
    });

    expect(sendResult.transactions).toHaveTransaction({
      // excesses
      from: notDeployerJettonWallet.address,
      to: deployer.address,
    });
    expect(sendResult.transactions).toHaveTransaction({
      // notification
      from: notDeployerJettonWallet.address,
      to: notDeployer.address,
      value: forwardAmount,
    });
    expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance - sentAmount);
    expect(await notDeployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance2 + sentAmount);
    expect(await jettonMaster.getTotalSupply()).toEqual(initialTotalSupply);
  });

  it('not wallet owner should not be able to send jettons', async () => {
    const initialTotalSupply = await jettonMaster.getTotalSupply();

    const deployerJettonWallet = await userWallet(deployer.address);
    const initialJettonBalance = await deployerJettonWallet.getJettonBalance();

    expect(initialJettonBalance).toEqual(toNano(900));

    const notDeployerJettonWallet = await userWallet(notDeployer.address);
    const initialJettonBalance2 = await notDeployerJettonWallet.getJettonBalance();

    expect(initialJettonBalance2).toEqual(toNano(100));

    const sentAmount = toNano(100);
    const sendResult = await deployerJettonWallet.sendTransfer(
      notDeployer.getSender(),
      toNano('0.1'), //tons
      {
        jettonAmount: sentAmount,
        to: notDeployer.address,
        responseAddress: deployer.address,
        forwardTonAmount: toNano(0.001),
      },
    );
    expect(sendResult.transactions).toHaveTransaction({
      from: notDeployer.address,
      to: deployerJettonWallet.address,
      aborted: true,
      exitCode: JettonError.UnauthorizedTransfer,
    });
    expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
    expect(await notDeployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance2);
    expect(await jettonMaster.getTotalSupply()).toEqual(initialTotalSupply);
  });

  it('impossible to send too much jettons', async () => {
    const deployerJettonWallet = await userWallet(deployer.address);
    const initialJettonBalance = await deployerJettonWallet.getJettonBalance();
    const notDeployerJettonWallet = await userWallet(notDeployer.address);
    const initialJettonBalance2 = await notDeployerJettonWallet.getJettonBalance();
    const sentAmount = initialJettonBalance + 1n;
    const sendResult = await deployerJettonWallet.sendTransfer(
      deployer.getSender(),
      toNano('0.1'), //tons
      {
        jettonAmount: sentAmount,
        to: notDeployer.address,
        responseAddress: deployer.address,
        forwardTonAmount: toNano(0.001),
      },
    );
    expect(sendResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: deployerJettonWallet.address,
      aborted: true,
      exitCode: JettonError.NotEnoughJettons,
    });
    expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
    expect(await notDeployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance2);
  });

  it('malformed forward payload', async () => {
    const deployerJettonWallet = await userWallet(deployer.address);
    const sentAmount = toNano('0.5');
    const msgPayload = beginCell()
      .storeUint(0xf8a7ea5, 32)
      .storeUint(0, 64) // op, queryId
      .storeCoins(sentAmount)
      .storeAddress(notDeployer.address)
      .storeAddress(deployer.address)
      .storeMaybeRef(null)
      .storeCoins(toNano('0.05')) // No forward payload indication
      .endCell();

    const res = await blockchain.sendMessage(
      internal({
        from: deployer.address,
        to: deployerJettonWallet.address,
        body: msgPayload,
        value: toNano('0.2'),
      }),
    );

    expect(res.transactions).toHaveTransaction({
      from: deployer.address,
      to: deployerJettonWallet.address,
      aborted: true,
      exitCode: JettonError.MalformedForwardPayload,
    });
  });

  it('correctly sends forward_payload', async () => {
    const deployerJettonWallet = await userWallet(deployer.address);
    const initialJettonBalance = await deployerJettonWallet.getJettonBalance();
    const notDeployerJettonWallet = await userWallet(notDeployer.address);
    const initialJettonBalance2 = await notDeployerJettonWallet.getJettonBalance();
    const sentAmount = toNano(100);
    const forwardAmount = toNano(0.001);
    const forwardPayload = beginCell().storeUint(0x1234567890abcdefn, 128).endCell();
    const sendResult = await deployerJettonWallet.sendTransfer(
      deployer.getSender(),
      toNano('0.1'), //tons
      {
        jettonAmount: sentAmount,
        to: notDeployer.address,
        responseAddress: deployer.address,
        forwardTonAmount: forwardAmount,
        forwardPayload,
      },
    );
    expect(sendResult.transactions).toHaveTransaction({
      //excesses
      from: notDeployerJettonWallet.address,
      to: deployer.address,
    });
    /*
      transfer_notification#7362d09c query_id:uint64 amount:(VarUInteger 16)
                                    sender:MsgAddress forward_payload:(Either Cell ^Cell)
                                    = InternalMsgBody;
      */
    expect(sendResult.transactions).toHaveTransaction({
      //notification
      from: notDeployerJettonWallet.address,
      to: notDeployer.address,
      value: forwardAmount,
      body: beginCell()
        .storeUint(0x7362d09c, 32)
        .storeUint(0, 64) //default queryId
        .storeCoins(sentAmount)
        .storeAddress(deployer.address)
        .storeUint(1, 1)
        .storeRef(forwardPayload)
        .endCell(),
    });
    expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance - sentAmount);
    expect(await notDeployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance2 + sentAmount);
  });

  it('no forward_ton_amount - no forward', async () => {
    const deployerJettonWallet = await userWallet(deployer.address);
    const initialJettonBalance = await deployerJettonWallet.getJettonBalance();
    const notDeployerJettonWallet = await userWallet(notDeployer.address);
    const initialJettonBalance2 = await notDeployerJettonWallet.getJettonBalance();
    const sentAmount = toNano(100);
    const forwardAmount = 0n;
    const forwardPayload = beginCell().storeUint(0x1234567890abcdefn, 128).endCell();
    const sendResult = await deployerJettonWallet.sendTransfer(
      deployer.getSender(),
      toNano(0.1), //tons
      {
        jettonAmount: sentAmount,
        to: notDeployer.address,
        responseAddress: deployer.address,
        forwardTonAmount: forwardAmount,
        forwardPayload,
      },
    );
    expect(sendResult.transactions).toHaveTransaction({
      //excesses
      from: notDeployerJettonWallet.address,
      to: deployer.address,
    });

    expect(sendResult.transactions).not.toHaveTransaction({
      //no notification
      from: notDeployerJettonWallet.address,
      to: notDeployer.address,
    });
    expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance - sentAmount);
    expect(await notDeployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance2 + sentAmount);
  });

  it('check revert on not enough tons for forward', async () => {
    const deployerJettonWallet = await userWallet(deployer.address);
    const initialJettonBalance = await deployerJettonWallet.getJettonBalance();
    await deployer.send({ value: toNano(1), bounce: false, to: deployerJettonWallet.address });
    const sentAmount = toNano(100);
    const forwardAmount = toNano(0.3);
    const forwardPayload = beginCell().storeUint(0x1234567890abcdefn, 128).endCell();
    const sendResult = await deployerJettonWallet.sendTransfer(
      deployer.getSender(),
      forwardAmount, // not enough tons, no tons for gas
      {
        jettonAmount: sentAmount,
        to: notDeployer.address,
        responseAddress: deployer.address,
        forwardTonAmount: forwardAmount,
        forwardPayload,
      },
    );
    expect(sendResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: deployerJettonWallet.address,
      aborted: true,
      exitCode: JettonError.NotEnoughTons,
    });

    expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
  });

  it('wallet does not accept internal_transfer not from wallet', async () => {
    const deployerJettonWallet = await userWallet(deployer.address);
    const initialJettonBalance = await deployerJettonWallet.getJettonBalance();

    const internalTransfer = beginCell()
      .storeUint(JettonOp.InternalTransfer, 32)
      .storeUint(0, 64)
      .storeCoins(toNano(100))
      .storeAddress(deployer.address)
      .storeAddress(deployer.address)
      .storeCoins(toNano(0.05))
      .storeUint(0, 1)
      .endCell();

    const sendResult = await blockchain.sendMessage(
      internal({
        from: notDeployer.address,
        to: deployerJettonWallet.address,
        body: internalTransfer,
        value: toNano('0.3'),
      }),
    );

    expect(sendResult.transactions).toHaveTransaction({
      from: notDeployer.address,
      to: deployerJettonWallet.address,
      aborted: true,
      exitCode: JettonError.UnauthorizedIncomingTransfer,
    });
    expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
  });

  it('wallet owner should be able to burn jettons', async () => {
    const deployerJettonWallet = await userWallet(deployer.address);
    const initialJettonBalance = await deployerJettonWallet.getJettonBalance();
    const initialTotalSupply = await jettonMaster.getTotalSupply();
    const burnAmount = toNano(100);
    const sendResult = await deployerJettonWallet.sendBurn(deployer.getSender(), toNano(0.1), {
      jettonAmount: burnAmount,
      responseAddress: deployer.address,
    });
    expect(sendResult.transactions).toHaveTransaction({
      // burn notification
      from: deployerJettonWallet.address,
      to: jettonMaster.address,
    });
    expect(sendResult.transactions).toHaveTransaction({
      // excesses
      from: jettonMaster.address,
      to: deployer.address,
    });
    expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance - burnAmount);
    expect(await jettonMaster.getTotalSupply()).toEqual(initialTotalSupply - burnAmount);
  });

  it('not wallet owner should not be able to burn jettons', async () => {
    const deployerJettonWallet = await userWallet(deployer.address);
    const initialJettonBalance = await deployerJettonWallet.getJettonBalance();
    const initialTotalSupply = await jettonMaster.getTotalSupply();
    const burnAmount = toNano(100);
    const sendResult = await deployerJettonWallet.sendBurn(notDeployer.getSender(), toNano(0.1), {
      jettonAmount: burnAmount,
      responseAddress: deployer.address,
    });
    expect(sendResult.transactions).toHaveTransaction({
      from: notDeployer.address,
      to: deployerJettonWallet.address,
      aborted: true,
      exitCode: JettonError.UnauthorizedTransfer,
    });
    expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
    expect(await jettonMaster.getTotalSupply()).toEqual(initialTotalSupply);
  });

  it('wallet owner can not burn more jettons than it has', async () => {
    const deployerJettonWallet = await userWallet(deployer.address);
    const initialJettonBalance = await deployerJettonWallet.getJettonBalance();
    const initialTotalSupply = await jettonMaster.getTotalSupply();
    const burnAmount = initialJettonBalance + 1n;
    const sendResult = await deployerJettonWallet.sendBurn(deployer.getSender(), toNano(0.1), {
      jettonAmount: burnAmount,
      responseAddress: deployer.address,
    });
    expect(sendResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: deployerJettonWallet.address,
      aborted: true,
      exitCode: JettonError.NotEnoughJettons,
    });
    expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
    expect(await jettonMaster.getTotalSupply()).toEqual(initialTotalSupply);
  });

  it('can not send to master chain', async () => {
    const deployerJettonWallet = await userWallet(deployer.address);
    const sendResult = await deployerJettonWallet.sendTransfer(deployer.getSender(), toNano(0.1), {
      jettonAmount: toNano(100),
      to: Address.parse('Ef8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAU'),
      responseAddress: deployer.address,
      forwardTonAmount: toNano(0.05),
    });
    expect(sendResult.transactions).toHaveTransaction({
      //excesses
      from: deployer.address,
      to: deployerJettonWallet.address,
      aborted: true,
      exitCode: JettonError.WrongWorkchain,
    });
  });

  it('owner can withdraw excesses', async () => {
    const deployerJettonWallet = await userWallet(deployer.address);
    await deployer.send({ value: toNano(1), bounce: false, to: deployerJettonWallet.address });
    const initialBalance = (await blockchain.getContract(deployer.address)).balance;
    const withdrawResult = await deployerJettonWallet.sendWithdrawTons(deployer.getSender(), toNano(0.1));
    expect(withdrawResult.transactions).toHaveTransaction({
      // excesses
      from: deployerJettonWallet.address,
      to: deployer.address,
    });
    const finalBalance = (await blockchain.getContract(deployer.address)).balance;
    const finalWalletBalance = (await blockchain.getContract(deployerJettonWallet.address)).balance;
    expect(finalWalletBalance).toEqual(10000000n);
    expect(finalBalance - initialBalance).toBeGreaterThan(toNano(0.99));
  });

  it('not owner can not withdraw excesses', async () => {
    const deployerJettonWallet = await userWallet(deployer.address);
    await deployer.send({ value: toNano('1'), bounce: false, to: deployerJettonWallet.address });
    const initialBalance = (await blockchain.getContract(deployer.address)).balance;
    const withdrawResult = await deployerJettonWallet.sendWithdrawTons(notDeployer.getSender(), toNano(0.1));
    expect(withdrawResult.transactions).not.toHaveTransaction({
      // excesses
      from: deployerJettonWallet.address,
      to: deployer.address,
    });
    const finalBalance = (await blockchain.getContract(deployer.address)).balance;
    const finalWalletBalance = (await blockchain.getContract(deployerJettonWallet.address)).balance;
    expect(finalWalletBalance).toBeGreaterThan(toNano(1));
    expect(finalBalance - initialBalance).toBeLessThan(toNano(0.1));
  });
});
