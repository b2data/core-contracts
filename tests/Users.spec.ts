import { Blockchain, SandboxContract } from '@ton/sandbox';
import { Address, Cell, toNano } from '@ton/core';
import { compile } from '@ton/blueprint';

import { Users } from '../wrappers/Users';

const accounts = [
  Address.parse('EQDyZBOXXjILiUTvx-5apgovq97k7aMrilhxvasBOlYCSKRf'),
  Address.parse('EQA4liCwWOBQSq5CgmdFVkIl-73WB50eF672kdxadMdqimK9'),
  Address.parse('kQAT8Od-84ZmbSrdtcLh_Vi2fi1U6UBAsPKGzncHsvUvCcXh'),
];

describe('Users', () => {
  let code: Cell;

  beforeAll(async () => {
    code = await compile('Users');
  }, 10000);

  let blockchain: Blockchain;
  let users: SandboxContract<Users>;

  beforeEach(async () => {
    blockchain = await Blockchain.create();

    users = blockchain.openContract(Users.createFromConfig({}, code));

    const deployer = await blockchain.treasury('deployer');

    const deployResult = await users.sendDeploy(deployer.getSender(), toNano('0.05'));

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: users.address,
      deploy: true,
      success: true,
    });
  });

  it('Should deploy', async () => {
    // the check is done inside beforeEach
    // blockchain and users are ready to use
  });

  it('Should add the user to the organization', async () => {
    const wallet = Address.parse('EQBolyxu13CzgJ6NQYQmAGASHFy-LXr9gFVKLo8V2cZ1p28C');

    const client = await blockchain.treasury('client');

    const result = await users.sendAddToOrganization(client.getSender(), {
      gas: toNano('0.1'),
      account: accounts[0],
      wallet,
    });

    expect(result.transactions).toHaveTransaction({
      from: client.address,
      to: users.address,
      success: true,
    });

    const list = await users.getOrganizations(wallet);

    expect(accounts[0].toString()).toEqual(list[0].toString());
    expect(1).toEqual(list.length);
  });

  it(`Should add the user to ${accounts.length} organizations`, async () => {
    const wallet = Address.parse('EQBolyxu13CzgJ6NQYQmAGASHFy-LXr9gFVKLo8V2cZ1p28C');

    const client = await blockchain.treasury('client');

    await Promise.all(
      accounts.map((account) =>
        users.sendAddToOrganization(client.getSender(), { gas: toNano('0.1'), account, wallet })
      )
    );

    const list = await users.getOrganizations(wallet);

    expect(accounts.length).toEqual(list.length);

    accounts.forEach((account) => {
      expect(account.toString()).toEqual(list.find((l) => l.toString() === account.toString())?.toString());
    });
  });

  it('Should be failed on adding the user to the organization if he is the member of it', async () => {
    const wallet = Address.parse('EQBolyxu13CzgJ6NQYQmAGASHFy-LXr9gFVKLo8V2cZ1p28C');

    const client = await blockchain.treasury('client');

    await users.sendAddToOrganization(client.getSender(), {
      gas: toNano('0.1'),
      account: accounts[0],
      wallet,
    });

    const result = await users.sendAddToOrganization(client.getSender(), {
      gas: toNano('0.1'),
      account: accounts[0],
      wallet,
    });

    expect(result.transactions).toHaveTransaction({
      from: client.address,
      to: users.address,
      exitCode: 4001,
      success: false,
    });

    const list = await users.getOrganizations(wallet);

    expect(accounts[0].toString()).toEqual(list[0].toString());
    expect(1).toEqual(list.length);
  });

  it('Should remove a user from the organization', async () => {
    const wallet = Address.parse('EQBolyxu13CzgJ6NQYQmAGASHFy-LXr9gFVKLo8V2cZ1p28C');

    const client = await blockchain.treasury('client');
    const deletedAccount = accounts[1];

    await Promise.all(
      accounts.map((account) =>
        users.sendAddToOrganization(client.getSender(), { gas: toNano('0.1'), account, wallet })
      )
    );

    const beforeList = await users.getOrganizations(wallet);
    expect(accounts.length).toEqual(beforeList.length);

    const result = await users.sendRemoveFromOrganization(client.getSender(), {
      gas: toNano('0.1'),
      account: accounts[1],
      wallet,
    });

    expect(result.transactions).toHaveTransaction({
      from: client.address,
      to: users.address,
      success: true,
    });

    const afterList = await users.getOrganizations(wallet);
    expect(accounts.length - 1).toEqual(afterList.length);
    expect(undefined).toEqual(afterList.find((l) => l.toString() === deletedAccount.toString()));
  });

  it('Should be failed on removing the user from the organization if the user does not exist have any organizations', async () => {
    const wallet = Address.parse('EQBolyxu13CzgJ6NQYQmAGASHFy-LXr9gFVKLo8V2cZ1p28C');
    const wallet2 = Address.parse('EQA87T3L246t3ZuLTQriNEHd02gXLxuLu4TtOkU644JP4xqb');

    const client = await blockchain.treasury('client');

    await Promise.all(
      accounts.map((account) =>
        users.sendAddToOrganization(client.getSender(), { gas: toNano('0.1'), account, wallet })
      )
    );

    const beforeList = await users.getOrganizations(wallet);
    expect(accounts.length).toEqual(beforeList.length);

    const result = await users.sendRemoveFromOrganization(client.getSender(), {
      gas: toNano('0.1'),
      account: accounts[1],
      wallet: wallet2,
    });

    expect(result.transactions).toHaveTransaction({
      from: client.address,
      to: users.address,
      exitCode: 404,
      success: false,
    });

    const afterList = await users.getOrganizations(wallet);
    expect(accounts.length).toEqual(afterList.length);
  });

  it('Should be failed on removing the user from the organization if he is the member of it', async () => {
    const wallet = Address.parse('EQBolyxu13CzgJ6NQYQmAGASHFy-LXr9gFVKLo8V2cZ1p28C');
    const account2 = Address.parse('EQA87T3L246t3ZuLTQriNEHd02gXLxuLu4TtOkU644JP4xqb');

    const client = await blockchain.treasury('client');

    await Promise.all(
      accounts.map((account) =>
        users.sendAddToOrganization(client.getSender(), { gas: toNano('0.1'), account, wallet })
      )
    );

    const beforeList = await users.getOrganizations(wallet);
    expect(accounts.length).toEqual(beforeList.length);

    const result = await users.sendRemoveFromOrganization(client.getSender(), {
      gas: toNano('0.1'),
      account: account2,
      wallet,
    });

    expect(result.transactions).toHaveTransaction({
      from: client.address,
      to: users.address,
      exitCode: 4002,
      success: false,
    });

    const afterList = await users.getOrganizations(wallet);
    expect(accounts.length).toEqual(afterList.length);
  });

  it(`Should be failed on adding the user to the organization if the user's wallet is the same as the organization's wallet`, async () => {
    const wallet = accounts[0];

    const client = await blockchain.treasury('client');

    const result = await users.sendAddToOrganization(client.getSender(), {
      gas: toNano('0.1'),
      account: accounts[0],
      wallet,
    });

    expect(result.transactions).toHaveTransaction({
      from: client.address,
      to: users.address,
      exitCode: 4000,
      success: false,
    });
  });
});
