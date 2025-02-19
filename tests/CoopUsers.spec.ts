import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell } from '@ton/core';
import { CoopUsers } from '../wrappers/CoopUsers';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { sha256 } from '@ton/crypto';

describe('CoopUsers', () => {
  let code: Cell;

  beforeAll(async () => {
    code = await compile('CoopUsers');
  }, 10000);

  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;
  let coopUsers: SandboxContract<CoopUsers>;

  beforeEach(async () => {
    blockchain = await Blockchain.create();

    deployer = await blockchain.treasury('deployer');

    coopUsers = blockchain.openContract(
      CoopUsers.createFromConfig(
        {
          owner: deployer.address,
        },
        code,
      ),
    );

    const deployResult = await coopUsers.sendDeploy(deployer.getSender());

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: coopUsers.address,
      deploy: true,
      success: true,
    });
  });

  it('should deploy', async () => {
    // the check is done inside beforeEach
  });

  it('should get full data', async () => {
    const data = await coopUsers.getFullData();

    expect(data).toEqual({
      adminAddress: deployer.address.toRawString(),
      activeWallets: 0,
      totalWallets: 0,
      supervisors: [],
      users: [],
    });
  });

  it('should change admin', async () => {
    const wallet = (await blockchain.treasury('newAdmin')).address;

    const changeAdminResult = await coopUsers.sendChangeAdmin(deployer.getSender(), wallet);

    expect(changeAdminResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: coopUsers.address,
      deploy: false,
      success: true,
    });

    const data = await coopUsers.getFullData();

    expect(data).toEqual({
      adminAddress: wallet.toRawString(),
      activeWallets: 0,
      totalWallets: 0,
      supervisors: [],
      users: [],
    });
  });

  it('should reject not admin requests', async () => {
    const notAdmin = await blockchain.treasury('notAdmin');

    const changeAdminResult = await coopUsers.sendChangeAdmin(notAdmin.getSender(), notAdmin.address);

    expect(changeAdminResult.transactions).toHaveTransaction({
      from: notAdmin.address,
      to: coopUsers.address,
      deploy: false,
      success: false,
      exitCode: 403,
    });

    const data = await coopUsers.getFullData();

    expect(data).toEqual({
      adminAddress: deployer.address.toRawString(),
      activeWallets: 0,
      totalWallets: 0,
      supervisors: [],
      users: [],
    });
  });

  it('should add supervisors', async () => {
    const wallet = (await blockchain.treasury('supervisor')).address;
    const wallet2 = (await blockchain.treasury('supervisor2')).address;

    const addSupervisorResult = await coopUsers.sendAddSupervisor(deployer.getSender(), wallet);
    await coopUsers.sendAddSupervisor(deployer.getSender(), wallet2);

    expect(addSupervisorResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: coopUsers.address,
      deploy: false,
      success: true,
    });

    const data = await coopUsers.getFullData();

    expect(data).toEqual({
      adminAddress: deployer.address.toRawString(),
      activeWallets: 0,
      totalWallets: 0,
      supervisors: [wallet.toRawString(), wallet2.toRawString()],
      users: [],
    });
  });

  it('should not duplicate supervisor entry if added twice', async () => {
    const wallet = (await blockchain.treasury('supervisor')).address;

    // First attempt by admin
    const firstAddResult = await coopUsers.sendAddSupervisor(deployer.getSender(), wallet);

    expect(firstAddResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: coopUsers.address,
      deploy: false,
      success: true,
    });

    // Second attempt with the same supervisor
    const secondAddResult = await coopUsers.sendAddSupervisor(deployer.getSender(), wallet);

    expect(secondAddResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: coopUsers.address,
      deploy: false,
      success: true,
    });

    const data = await coopUsers.getFullData();
    // The dictionary should have unique keys; hence, the supervisor appears only once.
    const occurrences = data.supervisors.filter((s: string) => s === wallet.toRawString()).length;
    expect(occurrences).toBe(1);
  });

  it('should remove supervisors', async () => {
    const wallet = (await blockchain.treasury('supervisor')).address;
    const wallet2 = (await blockchain.treasury('supervisor2')).address;

    await coopUsers.sendAddSupervisor(deployer.getSender(), wallet);
    await coopUsers.sendAddSupervisor(deployer.getSender(), wallet2);

    const removeSupervisorResult = await coopUsers.sendRemoveSupervisor(deployer.getSender(), wallet);

    expect(removeSupervisorResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: coopUsers.address,
      deploy: false,
      success: true,
    });

    const data = await coopUsers.getFullData();

    expect(data).toEqual({
      adminAddress: deployer.address.toRawString(),
      activeWallets: 0,
      totalWallets: 0,
      supervisors: [wallet2.toRawString()],
      users: [],
    });
  });

  it('should not remove non-existing supervisor', async () => {
    const wallet = (await blockchain.treasury('supervisor')).address;

    const removeSupervisorResult = await coopUsers.sendRemoveSupervisor(deployer.getSender(), wallet);

    expect(removeSupervisorResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: coopUsers.address,
      deploy: false,
      success: false,
      exitCode: 4041,
    });

    const data = await coopUsers.getFullData();

    expect(data).toEqual({
      adminAddress: deployer.address.toRawString(),
      activeWallets: 0,
      totalWallets: 0,
      supervisors: [],
      users: [],
    });
  });

  it('should return false for a supervisor that has not been added', async () => {
    const notSupervisor = (await blockchain.treasury('notSupervisor')).address;

    const access = await coopUsers.getSupervisorAccess(notSupervisor);
    expect(access).toBe(false);
  });

  it('should return true for a supervisor after being added', async () => {
    const wallet = (await blockchain.treasury('supervisor')).address;

    await coopUsers.sendAddSupervisor(deployer.getSender(), wallet);

    const access = await coopUsers.getSupervisorAccess(wallet);
    expect(access).toBe(true);
  });

  it('should set user data and check it has access', async () => {
    const wallet = (await blockchain.treasury('user')).address;
    const timestampEnter = Math.floor(Date.now() / 1000);
    const timestampLeave = 0;
    const data = await sha256(
      '{"name":"John Doe","email":"demo@ya.ru","phone":"1234567890","address":"123 Main St","city":"New York","state":"NY","zip":"10001","country":"US","dob":"01/01/1970","ssn":"123-45-6789","passport":"123456789","driverLicense":"123456789","bankAccount":"1234567890","creditCard":"1234567890"}',
    );

    const userData = {
      wallet: wallet.toRawString(),
      timestampEnter,
      timestampLeave,
      data: data.toString('hex'),
    };

    const setUserResult = await coopUsers.sendSetUser(deployer.getSender(), {
      ...userData,
      wallet,
    });

    expect(setUserResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: coopUsers.address,
      deploy: false,
      success: true,
    });

    const fullData = await coopUsers.getFullData();

    expect(fullData).toEqual({
      adminAddress: deployer.address.toRawString(),
      activeWallets: 1,
      totalWallets: 1,
      supervisors: [],
      users: [userData],
    });

    const userInfo = await coopUsers.getUserInfo(wallet);
    expect(userInfo).toEqual(userData);

    const access = await coopUsers.getUserAccess(wallet);
    expect(access).toBe(true);
  });

  it('should mark user as leave and check it has no access', async () => {
    const wallet = (await blockchain.treasury('user')).address;
    const timestampEnter = Math.floor(Date.now() / 1000);
    const timestampLeave = 0;
    const data = await sha256(
      '{"name":"John Doe","email":"demo@ya.ru","phone":"1234567890","address":"123 Main St","city":"New York","state":"NY","zip":"10001","country":"US","dob":"01/01/1970","ssn":"123-45-6789","passport":"123456789","driverLicense":"123456789","bankAccount":"1234567890","creditCard":"1234567890"}',
    );

    const userData = {
      wallet: wallet.toRawString(),
      timestampEnter,
      timestampLeave,
      data: data.toString('hex'),
    };

    const setUserResult = await coopUsers.sendSetUser(deployer.getSender(), {
      ...userData,
      wallet,
    });

    expect(setUserResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: coopUsers.address,
      deploy: false,
      success: true,
    });

    const fullData = await coopUsers.getFullData();

    expect(fullData).toEqual({
      adminAddress: deployer.address.toRawString(),
      activeWallets: 1,
      totalWallets: 1,
      supervisors: [],
      users: [userData],
    });

    userData.timestampLeave = Math.floor(Date.now() / 1000) + 1000;

    const result = await coopUsers.sendSetUser(deployer.getSender(), {
      ...userData,
      wallet,
    });

    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: coopUsers.address,
      deploy: false,
      success: true,
    });

    const fullData2 = await coopUsers.getFullData();

    expect(fullData2).toEqual({
      adminAddress: deployer.address.toRawString(),
      activeWallets: 0,
      totalWallets: 1,
      supervisors: [],
      users: [userData],
    });

    const userInfo = await coopUsers.getUserInfo(wallet);
    expect(userInfo).toEqual(userData);

    const access = await coopUsers.getUserAccess(wallet);
    expect(access).toBe(false);
  });

  it('should reject negative timestampEnter', async () => {
    const wallet = (await blockchain.treasury('user')).address;
    const timestampEnter = -100;
    const timestampLeave = 0;
    const data = 'user data';

    const result = await coopUsers.sendSetUser(deployer.getSender(), {
      wallet,
      timestampEnter,
      timestampLeave,
      data,
    });

    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: coopUsers.address,
      deploy: false,
      success: false,
      exitCode: 4001, // error::invalid_timestamp_enter
    });
  });

  it('should reject negative timestampLeave when set', async () => {
    const wallet = (await blockchain.treasury('userNegativeLeave')).address;
    const timestampEnter = Math.floor(Date.now() / 1000);
    const timestampLeave = -50;
    const data = 'user data';

    const result = await coopUsers.sendSetUser(deployer.getSender(), {
      wallet,
      timestampEnter,
      timestampLeave,
      data,
    });

    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: coopUsers.address,
      deploy: false,
      success: false,
      exitCode: 4002, // error::invalid_timestamp_leave
    });
  });

  it('should reject when timestampLeave is set and earlier than timestampEnter', async () => {
    const wallet = (await blockchain.treasury('userWrongOrder')).address;
    const timestampEnter = Math.floor(Date.now() / 1000) + 3600;
    const timestampLeave = Math.floor(Date.now() / 1000); // earlier than timestampEnter
    const data = 'user data';

    const result = await coopUsers.sendSetUser(deployer.getSender(), {
      wallet,
      timestampEnter,
      timestampLeave,
      data,
    });

    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: coopUsers.address,
      deploy: false,
      success: false,
      exitCode: 4003, // error::invalid_timestamp_order
    });
  });

  it('should get active wallets count', async () => {
    const wallet = (await blockchain.treasury('user')).address;
    const wallet2 = (await blockchain.treasury('user2')).address;
    const timestampEnter = Math.floor(Date.now() / 1000);
    const timestampLeave = 0;
    const data = await sha256('user data');

    const userData = {
      wallet: wallet.toRawString(),
      timestampEnter,
      timestampLeave,
      data: data.toString('hex'),
    };

    await coopUsers.sendSetUser(deployer.getSender(), {
      ...userData,
      wallet,
    });

    const count1 = await coopUsers.getActiveWalletsCount();
    expect(count1).toBe(1);

    await coopUsers.sendSetUser(deployer.getSender(), {
      ...userData,
      wallet: wallet2,
    });

    const count2 = await coopUsers.getActiveWalletsCount();
    expect(count2).toBe(2);

    await coopUsers.sendSetUser(deployer.getSender(), {
      ...userData,
      wallet: wallet2,
      timestampLeave: Math.floor(Date.now() / 1000) + 1000,
    });

    const count3 = await coopUsers.getActiveWalletsCount();
    expect(count3).toBe(1);
  });

  it('should get total users count', async () => {
    const wallet = (await blockchain.treasury('user')).address;
    const wallet2 = (await blockchain.treasury('user2')).address;
    const timestampEnter = Math.floor(Date.now() / 1000);
    const timestampLeave = 0;
    const data = await sha256('user data');

    const userData = {
      wallet: wallet.toRawString(),
      timestampEnter,
      timestampLeave,
      data: data.toString('hex'),
    };

    await coopUsers.sendSetUser(deployer.getSender(), {
      ...userData,
      wallet,
    });

    const count1 = await coopUsers.getTotalUsersCount();
    expect(count1).toBe(1);

    await coopUsers.sendSetUser(deployer.getSender(), {
      ...userData,
      wallet: wallet2,
    });

    const count2 = await coopUsers.getTotalUsersCount();
    expect(count2).toBe(2);

    await coopUsers.sendSetUser(deployer.getSender(), {
      ...userData,
      wallet: wallet2,
      timestampLeave: Math.floor(Date.now() / 1000) + 1000,
    });

    const count3 = await coopUsers.getTotalUsersCount();
    expect(count3).toBe(2);
  });
});
