import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Address, Cell, toNano } from 'ton-core';
import { Organizations } from '../wrappers/Organizations';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';

const accounts = [
  Address.parse('EQDyZBOXXjILiUTvx-5apgovq97k7aMrilhxvasBOlYCSKRf'),
  Address.parse('EQA4liCwWOBQSq5CgmdFVkIl-73WB50eF672kdxadMdqimK9'),
  Address.parse('kQAT8Od-84ZmbSrdtcLh_Vi2fi1U6UBAsPKGzncHsvUvCcXh'),
];

const accountIds = [
  BigInt('109636529277680782941543983596877853615118469709895069082009045139755361501768'),
  BigInt('25594772190573145060762376394539759772100767252266704215048933668905760025226'),
  BigInt('9019585144634438170473994947683968944655042023898000370742031150329221164809'),
];

describe('Organizations', () => {
  let code: Cell;

  beforeAll(async () => {
    code = await compile('Organizations');
  });

  let blockchain: Blockchain;
  let organizations: SandboxContract<Organizations>;

  beforeEach(async () => {
    blockchain = await Blockchain.create();

    organizations = blockchain.openContract(Organizations.createFromConfig({}, code));

    const deployer = await blockchain.treasury('deployer');

    const deployResult = await organizations.sendDeploy(deployer.getSender(), toNano('0.1'));

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: organizations.address,
      deploy: true,
      success: true,
    });
  });

  it('Should deploy', async () => {
    // the check is done inside beforeEach
    // blockchain and organizations are ready to use
  });

  it('Should add new organization', async () => {
    const account = accounts[0];
    const accountId = accountIds[0];
    const site = 'http://adnl-address.ton';

    const client = await blockchain.treasury('client');

    const result = await organizations.sendCreate(client.getSender(), {
      gas: toNano('0.1'),
      account,
      site,
    });

    expect(result.transactions).toHaveTransaction({
      from: client.address,
      to: organizations.address,
      success: true,
    });

    const total = await organizations.getTotal();
    expect(1).toEqual(total);

    const address = await organizations.getAddress(accountId);
    expect(account.toString()).toEqual(address?.toString());

    const owner = await organizations.getOwner(accountId);
    expect(client.getSender().address.toString()).toEqual(owner?.toString());

    const siteResult = await organizations.getSite(accountId);
    expect(site).toEqual(siteResult);
  });

  it('Should be failed to create the organization that already exists', async () => {
    const client = await blockchain.treasury('client');

    await organizations.sendCreate(client.getSender(), {
      gas: toNano('0.1'),
      account: accounts[0],
      site: 'http://adnl-address.ton',
    });

    const total = await organizations.getTotal();
    expect(1).toEqual(total);

    const result = await organizations.sendCreate(client.getSender(), {
      gas: toNano('0.1'),
      account: accounts[0],
      site: 'http://adnl-address.ton',
    });

    expect(result.transactions).toHaveTransaction({
      from: client.address,
      to: organizations.address,
      exitCode: 400,
      success: false,
    });
  });

  it('Should remove existing organization', async () => {
    const account = accounts[0];
    const accountId = accountIds[0];
    const site = 'http://adnl-address.ton';

    const client = await blockchain.treasury('client');

    await organizations.sendCreate(client.getSender(), {
      gas: toNano('0.1'),
      account,
      site,
    });

    const totalAfterCreation = await organizations.getTotal();
    expect(1).toBe(totalAfterCreation);

    const result = await organizations.sendRemove(client.getSender(), {
      gas: toNano('0.01'),
      account,
    });

    expect(result.transactions).toHaveTransaction({
      from: client.address,
      to: organizations.address,
      success: true,
    });

    const total = await organizations.getTotal();
    expect(0).toEqual(total);

    const address = await organizations.getAddress(accountId);
    expect(null).toEqual(address);

    const owner = await organizations.getOwner(accountId);
    expect(null).toEqual(owner);

    const siteResult = await organizations.getSite(accountId);
    expect(null).toEqual(siteResult);
  });

  it('Should be failed on removing the organization. The organization does not exist', async () => {
    const client = await blockchain.treasury('client');

    await organizations.sendCreate(client.getSender(), {
      gas: toNano('0.1'),
      account: accounts[0],
      site: 'http://adnl-address.ton',
    });

    const totalAfterCreation = await organizations.getTotal();
    expect(1).toBe(totalAfterCreation);

    const result = await organizations.sendRemove(client.getSender(), {
      gas: toNano('0.1'),
      account: accounts[1],
    });

    expect(result.transactions).toHaveTransaction({
      from: client.address,
      to: organizations.address,
      exitCode: 404,
      success: false,
    });

    const total = await organizations.getTotal();
    expect(1).toBe(total);
  });

  it('Should be failed on removing the organization that does not belong to the current owner', async () => {
    const client = await blockchain.treasury('client');
    const client2 = await blockchain.treasury('client2');

    await organizations.sendCreate(client.getSender(), {
      gas: toNano('0.1'),
      account: accounts[0],
      site: 'http://adnl-address.ton',
    });

    const totalAfterCreation = await organizations.getTotal();
    expect(1).toBe(totalAfterCreation);

    const result = await organizations.sendRemove(client2.getSender(), {
      gas: toNano('0.1'),
      account: accounts[0],
    });

    expect(result.transactions).toHaveTransaction({
      from: client2.address,
      to: organizations.address,
      exitCode: 403,
      success: false,
    });

    const total = await organizations.getTotal();
    expect(1).toBe(total);
  });

  it('Should change the organization owner', async () => {
    const account = accounts[0];
    const accountId = accountIds[0];

    const client = await blockchain.treasury('client');
    const client2 = await blockchain.treasury('client2');

    await organizations.sendCreate(client.getSender(), {
      gas: toNano('0.1'),
      account,
      site: 'http://adnl-address.ton',
    });

    const total = await organizations.getTotal();
    expect(1).toEqual(total);

    const result = await organizations.sendChangeOwner(client.getSender(), {
      gas: toNano('0.1'),
      account,
      newOwner: client2.getSender().address,
    });

    expect(result.transactions).toHaveTransaction({
      from: client.address,
      to: organizations.address,
      success: true,
    });

    const address = await organizations.getAddress(accountId);
    expect(account.toString()).toEqual(address?.toString());

    const owner = await organizations.getOwner(accountId);
    expect(client2.getSender().address.toString()).toEqual(owner?.toString());
  });

  it('Should be failed on changing the organization owner. The organization does not exist', async () => {
    const client = await blockchain.treasury('client');
    const client2 = await blockchain.treasury('client2');

    await organizations.sendCreate(client.getSender(), {
      gas: toNano('0.1'),
      account: accounts[0],
      site: 'http://adnl-address.ton',
    });

    const totalAfterCreation = await organizations.getTotal();
    expect(1).toBe(totalAfterCreation);

    const result = await organizations.sendChangeOwner(client.getSender(), {
      gas: toNano('0.1'),
      account: accounts[1],
      newOwner: client2.getSender().address,
    });

    expect(result.transactions).toHaveTransaction({
      from: client.address,
      to: organizations.address,
      exitCode: 404,
      success: false,
    });

    const total = await organizations.getTotal();
    expect(1).toBe(total);
  });

  it('Should be failed on changing an owner from the organization that does not belong to the current owner', async () => {
    const account = accounts[0];
    const accountId = accountIds[0];
    const site = 'http://adnl-address.ton';

    const client = await blockchain.treasury('client');
    const client2 = await blockchain.treasury('client2');

    await organizations.sendCreate(client.getSender(), {
      gas: toNano('0.1'),
      account,
      site,
    });

    const total = await organizations.getTotal();
    expect(1).toEqual(total);

    const result = await organizations.sendChangeOwner(client2.getSender(), {
      gas: toNano('0.1'),
      account,
      newOwner: client2.getSender().address,
    });

    expect(result.transactions).toHaveTransaction({
      from: client2.address,
      to: organizations.address,
      exitCode: 403,
      success: false,
    });

    const address = await organizations.getAddress(accountId);
    expect(account.toString()).toEqual(address?.toString());

    const owner = await organizations.getOwner(accountId);
    expect(client.getSender().address.toString()).toEqual(owner?.toString());
  });

  it('Should change the organization site', async () => {
    const account = accounts[0];
    const accountId = accountIds[0];
    const newSite = 'http://adnl-address-new.ton';

    const client = await blockchain.treasury('client');

    await organizations.sendCreate(client.getSender(), {
      gas: toNano('0.1'),
      account,
      site: 'http://adnl-address.ton',
    });

    const total = await organizations.getTotal();
    expect(1).toEqual(total);

    const result = await organizations.sendChangeSite(client.getSender(), {
      gas: toNano('0.1'),
      account,
      site: newSite,
    });

    expect(result.transactions).toHaveTransaction({
      from: client.address,
      to: organizations.address,
      success: true,
    });

    const address = await organizations.getAddress(accountId);
    expect(account.toString()).toEqual(address?.toString());

    const siteResult = await organizations.getSite(accountId);
    expect(newSite).toEqual(siteResult);
  });

  it('Should be failed on changing the organization site. The organization does not exist', async () => {
    const account = accounts[0];
    const accountId = accountIds[0];
    const site = 'http://adnl-address.ton';

    const client = await blockchain.treasury('client');

    await organizations.sendCreate(client.getSender(), {
      gas: toNano('0.1'),
      account,
      site,
    });

    const total = await organizations.getTotal();
    expect(1).toEqual(total);

    const result = await organizations.sendChangeSite(client.getSender(), {
      gas: toNano('0.1'),
      account: accounts[1],
      site: 'untzo7eat2h77xzfugxrfgfy3zbl5txomvetzke6fwr45lehvdk-new',
    });

    expect(result.transactions).toHaveTransaction({
      from: client.address,
      to: organizations.address,
      exitCode: 404,
      success: false,
    });

    const address = await organizations.getAddress(accountId);
    expect(account.toString()).toEqual(address?.toString());

    const siteResult = await organizations.getSite(accountId);
    expect(site).toEqual(siteResult);
  });

  it('Should be failed on changing the organization site from the organization that does not belong to the current owner', async () => {
    const account = accounts[0];
    const accountId = accountIds[0];
    const site = 'http://adnl-address.ton';

    const client = await blockchain.treasury('client');
    const client2 = await blockchain.treasury('client2');

    await organizations.sendCreate(client.getSender(), {
      gas: toNano('0.1'),
      account,
      site,
    });

    const total = await organizations.getTotal();
    expect(1).toEqual(total);

    const result = await organizations.sendChangeSite(client2.getSender(), {
      gas: toNano('0.1'),
      account,
      site: 'untzo7eat2h77xzfugxrfgfy3zbl5txomvetzke6fwr45lehvdk-new',
    });

    expect(result.transactions).toHaveTransaction({
      from: client2.address,
      to: organizations.address,
      exitCode: 403,
      success: false,
    });

    const address = await organizations.getAddress(accountId);
    expect(account.toString()).toEqual(address?.toString());

    const siteResult = await organizations.getSite(accountId);
    expect(site).toEqual(siteResult);
  });

  it('Should get the total number of organizations', async () => {
    const client = await blockchain.treasury('client');

    await Promise.all(
      accounts.map((account) =>
        organizations.sendCreate(client.getSender(), {
          gas: toNano('0.1'),
          account,
          site: 'test-sete',
        })
      )
    );

    const total = await organizations.getTotal();
    expect(accounts.length).toEqual(total);
  });

  it('Should get the organization owner and site by the organization account address', async () => {
    const account = accounts[0];
    const site = 'http://adnl-address.ton';

    const client = await blockchain.treasury('client');

    const result = await organizations.sendCreate(client.getSender(), {
      gas: toNano('0.1'),
      account,
      site,
    });

    expect(result.transactions).toHaveTransaction({
      from: client.address,
      to: organizations.address,
      success: true,
    });

    const total = await organizations.getTotal();
    expect(1).toEqual(total);

    const ownerByAddress = await organizations.getOwnerByAdrress(account);
    expect(client.getSender().address.toString()).toEqual(ownerByAddress?.toString());

    const siteByAddress = await organizations.getSiteByAdrress(account);
    expect(site).toEqual(siteByAddress);
  });
});
