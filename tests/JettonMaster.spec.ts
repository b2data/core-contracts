import { Blockchain, SandboxContract, TreasuryContract, internal } from '@ton/sandbox';
import { Address, beginCell, Cell, toNano } from '@ton/core';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

import { JettonWallet } from '../wrappers/JettonWallet';
import { JettonMaster } from '../wrappers/JettonMaster';
import { buildTokenMetadataCell, JettonError, JettonOp, randomAddress } from '../wrappers/utils-jetton';

const metadata = { name: '\x00Demo Token', symbol: 'DEMO', decimals: '3' };

describe('JettonMaster', () => {
  let walletCode: Cell;
  let masterCode: Cell;
  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;
  let notDeployer: SandboxContract<TreasuryContract>;
  let jettonMaster: SandboxContract<JettonMaster>;
  let userWallet: any;

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

  it('should get total supply', async () => {
    const result = await jettonMaster.getTotalSupply();
    expect(result).toEqual(0n);
  });

  it('should get admin address', async () => {
    const result = await jettonMaster.getAdminAddress();
    expect(result).toEqualAddress(deployer.address);
  });

  it('should get metadata', async () => {
    const result = await jettonMaster.getMetadata();
    expect(result).toEqual(metadata);
  });

  it('master admin should be able to mint jettons', async () => {
    const initialTotalSupply = await jettonMaster.getTotalSupply();
    const deployerJettonWallet = await userWallet(deployer.address);
    const amount = toNano(1000);
    const mintResult = await jettonMaster.sendMint(deployer.getSender(), {
      to: deployer.address,
      jettonAmount: amount,
      forwardTonAmount: toNano(0.05),
      totalTonAmount: toNano(0.1),
    });

    expect(mintResult.transactions).toHaveTransaction({
      from: jettonMaster.address,
      to: deployerJettonWallet.address,
      deploy: true,
    });
    expect(mintResult.transactions).toHaveTransaction({
      // excesses
      from: deployerJettonWallet.address,
      to: jettonMaster.address,
    });

    expect(await deployerJettonWallet.getJettonBalance()).toEqual(amount);
    expect(await jettonMaster.getTotalSupply()).toEqual(initialTotalSupply + amount);
  });

  it('not a master admin should not be able to mint jettons', async () => {
    const initialTotalSupply = await jettonMaster.getTotalSupply();
    const deployerJettonWallet = await userWallet(deployer.address);
    let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
    const unAuthMintResult = await jettonMaster.sendMint(notDeployer.getSender(), {
      to: deployer.address,
      jettonAmount: toNano('777'),
      forwardTonAmount: toNano('0.05'),
      totalTonAmount: toNano('1'),
    });

    expect(unAuthMintResult.transactions).toHaveTransaction({
      from: notDeployer.address,
      to: jettonMaster.address,
      aborted: true,
      exitCode: JettonError.UnauthorizedMintRequest,
    });
    expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
    expect(await jettonMaster.getTotalSupply()).toEqual(initialTotalSupply);
  });

  it('master admin can change admin', async () => {
    expect((await jettonMaster.getAdminAddress()).equals(deployer.address)).toBe(true);
    let changeAdmin = await jettonMaster.sendChangeAdmin(deployer.getSender(), notDeployer.address);
    expect((await jettonMaster.getAdminAddress()).equals(notDeployer.address)).toBe(true);
    changeAdmin = await jettonMaster.sendChangeAdmin(notDeployer.getSender(), deployer.address);
    expect((await jettonMaster.getAdminAddress()).equals(deployer.address)).toBe(true);
  });

  it('not a master admin can not change admin', async () => {
    let changeAdmin = await jettonMaster.sendChangeAdmin(notDeployer.getSender(), notDeployer.address);
    expect((await jettonMaster.getAdminAddress()).equals(deployer.address)).toBe(true);
    expect(changeAdmin.transactions).toHaveTransaction({
      from: notDeployer.address,
      to: jettonMaster.address,
      aborted: true,
      exitCode: JettonError.UnauthorizedChangeAdminRequest,
    });
  });

  it('master admin can change content', async () => {
    const newContent = { ...metadata, name: 'New Name' };
    expect(await jettonMaster.getMetadata()).toEqual(metadata);
    let changeContent = await jettonMaster.sendChangeMetadata(deployer.getSender(), buildTokenMetadataCell(newContent));
    expect(await jettonMaster.getMetadata()).toEqual(newContent);
    changeContent = await jettonMaster.sendChangeMetadata(deployer.getSender(), buildTokenMetadataCell(metadata));
    expect(await jettonMaster.getMetadata()).toEqual(metadata);
  });

  it('not a master admin can not change content', async () => {
    const newContent = { ...metadata, name: 'New Name' };
    let changeContent = await jettonMaster.sendChangeMetadata(
      notDeployer.getSender(),
      buildTokenMetadataCell(newContent),
    );
    expect(await jettonMaster.getMetadata()).toEqual(metadata);
    expect(changeContent.transactions).toHaveTransaction({
      from: notDeployer.address,
      to: jettonMaster.address,
      aborted: true,
      exitCode: JettonError.UnauthorizedChangeContentRequest,
    });
  });

  it('master should only accept burn messages from jetton wallets', async () => {
    const deployerJettonWallet = await userWallet(deployer.address);
    const burnAmount = toNano(100);
    const burnNotification = (amount: bigint, addr: Address) => {
      return beginCell()
        .storeUint(JettonOp.BurnNotification, 32)
        .storeUint(0, 64)
        .storeCoins(amount)
        .storeAddress(addr)
        .storeAddress(deployer.address)
        .endCell();
    };

    let res = await blockchain.sendMessage(
      internal({
        from: deployerJettonWallet.address,
        to: jettonMaster.address,
        body: burnNotification(burnAmount, randomAddress(0)),
        value: toNano(0.1),
      }),
    );

    expect(res.transactions).toHaveTransaction({
      from: deployerJettonWallet.address,
      to: jettonMaster.address,
      aborted: true,
      exitCode: JettonError.UnauthorizedBurnRequest,
    });

    res = await blockchain.sendMessage(
      internal({
        from: deployerJettonWallet.address,
        to: jettonMaster.address,
        body: burnNotification(burnAmount, deployer.address),
        value: toNano('0.1'),
      }),
    );

    expect(res.transactions).toHaveTransaction({
      from: deployerJettonWallet.address,
      to: jettonMaster.address,
      success: true,
    });
  });

  it('master admin should be able to send burn jettons request', async () => {
    await jettonMaster.sendMint(deployer.getSender(), {
      to: notDeployer.address,
      jettonAmount: toNano(1000),
      forwardTonAmount: toNano(0.05),
      totalTonAmount: toNano(0.1),
    });

    const initialTotalSupply = await jettonMaster.getTotalSupply();
    const notDeployerJettonWallet = await userWallet(notDeployer.address);
    const initialJettonBalance2 = await notDeployerJettonWallet.getJettonBalance();

    expect(initialJettonBalance2).toEqual(toNano(1000));

    const burnAmount = toNano(200);

    const burnResult = await jettonMaster.sendBurnJettons(deployer.getSender(), {
      to: notDeployer.address,
      jettonAmount: burnAmount,
      forwardTonAmount: toNano(0.05),
      totalTonAmount: toNano(0.1),
    });

    expect(burnResult.transactions).toHaveTransaction({
      from: jettonMaster.address,
      to: notDeployerJettonWallet.address,
      success: true,
    });
    expect(burnResult.transactions).toHaveTransaction({
      // excesses
      from: notDeployerJettonWallet.address,
      to: jettonMaster.address,
      success: true,
    });

    expect(await notDeployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance2 - burnAmount);
    expect(await jettonMaster.getTotalSupply()).toEqual(initialTotalSupply - burnAmount);
  });
});
