# Contracts

| Smart contract  | Network  | Address                                            | TonScan                                                                                      |
| --------------- | --------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Organizations   | testnet   | `EQAjgRWlRXBXQiluvbI8Fo0yqgwnIptbinKJM1S1WracD26t` | [link](https://testnet.tonscan.org/address/EQAjgRWlRXBXQiluvbI8Fo0yqgwnIptbinKJM1S1WracD26t) |
| Organizations   | mainnet   | `-` | [link](https://tonscan.org/address/) |
| Users           | testnet   | `EQAdrRC0nbILTblhbyDAYSqZWaK1fVphCBg233byIO63fEAV` | [link](https://testnet.tonscan.org/address/EQAdrRC0nbILTblhbyDAYSqZWaK1fVphCBg233byIO63fEAV) |
| Users           | mainnet   | `-` | [link](https://tonscan.org/address/) |

All methods of the contracts are exported to `npm` and can be used as `import { * } from '@b2data/contracts'`

## Jetton Contract

The smart-contract is the original [jetton-minter](https://github.com/ton-blockchain/token-contract/blob/main/ft/jetton-minter.fc) and [jetton-wallet](https://github.com/ton-blockchain/token-contract/blob/main/ft/jetton-wallet.fc) smart-contracts in the TON with next changes:
- sending jettons allows to Jetton Admin Wallet
- receiving jettons allows from Jetton Admin Wallet

## Coop Users Contracts

The smart-contract stores data of coop users, number of active users and supervisors who has access to decode user data
```
admin_address:MsgAddress
active_wallets:Int
total_wallets:Int
access:^Dict [slice]
users:^Dict [int(32), int(32), cell]
```

### Methods
| Parameter       | Type    | Description                                                                             |
| --------------- | ------- | --------------------------------------------------------------------------------------- |
| sender          | Sender  | Represents the connected wallet and allows to send transactions                         |
| newAdmin        | Address | TON Address of new admin who can make requests                                          |
| wallet          | Address | TON Address of supervisor or user based on request                                      |
| timestampEnter  | int     | Timestamp when user created. Cannot be changed                                          |
| timestampLeave  | int     | Timestamp when user leave. If user active it is equal 0                                 |
| data            | string  | Encoded user data                                                                       |


- Change contract admin address
  ```
  sendChangeAdmin(
    sender: Sender,
    newAdmin: Address
  ) => Promise<void>
  ```

- Add supervisor wallet
  ```
  sendAddSupervisor(
    sender: Sender,
    wallet: Address
  ) => Promise<void>
  ```

- Remove supervisor wallet
  ```
  sendRemoveSupervisor(
    sender: Sender,
    wallet: Address
  ) => Promise<void>
  ```

- Set user data supervisor wallet
  ```
  sendSetUser(
    sender: Sender,
    options: {
      wallet: Address;
      timestampEnter: number;
      timestampLeave: number;
      data: string;
    },
  ) => Promise<void>
  ```

- Get full data of smart-contract
  ```
  getFullData() => Promise<{
    adminAddress: string;
    activeWallets: number;
    totalWallets: number;
    supervisors: string[];
    users: { wallet:string; timestampEnter:number; timestampLeave:number; data:string; }[]
  }>
  ```

- Check if wallet has supervisor access
  ```
  getSupervisorAccess(wallet: Address) => Promise<boolean>
  ```

- Check if user has access (timestampLeave = 0)
  ```
  getUserAccess(wallet: Address) => Promise<boolean>
  ```

- Get user information
  ```
  getUserInfo(wallet: Address) => Promise<{ 
    wallet: string;
    timestampEnter: number;
    timestampLeave: number;
    data: string;
  }>
  ```

- Get amount of active wallets
  ```
  getActiveWalletsCount() => Promise<number>
  ```

- Get amount of total wallets
  ```
  getTotalUsersCount() => Promise<number>
  ```

### Error codes


| Code  | Description                                             |
| ----- | ------------------------------------------------------- |
| 403   | The wallet is different to adminWallet                  |
| 4001  | Timestamp enter should be positive                      |
| 4002  | Timestamp leave should be positive                      |
| 4002  | Timestamp enter should be before timestamp leave        |
| 4041  | The wallet is not in supervisors list                   |
| 4042  | The wallet is not in users list                         |


## Organizations Contract

The smart-contract store data in a cell of 3 dictionaries
```
contract_dict   { account_id: ton_address   }
owner_dict      { account_id: ton_address   }
site_dict       { account_id: string        }
```

### Methods

| Parameter   | Type    | Description                                                                             |
| ----------- | ------- | --------------------------------------------------------------------------------------- |
| sender      | Sender  | Represents the connected wallet and allows to send transactions                         |
| gas         | bigint  | Transaction fee                                                                         |
| account     | Address | TON Address of organization wallet                                                      |
| accountId   | bigint  | [Account ID](https://docs.ton.org/learn/overviews/addresses#account-id) of TON Address  |
| site        | string  | ADNL address of organization server                                                     |
| newOwner    | Address | TON Address of new organization wallet                                                  |

- Create a new organization
  ```
  sendCreate(
    sender: Sender,
    options: { gas: bigint; account: Address; site: string }  
  ) => Promise<void>
  ```

- Remove organization
  ```
  sendRemove(
    sender: Sender,
    options: { gas: bigint; account: Address }  
  ) => Promise<void>
  ```

- Change the owner of the organization
  ```
  sendChangeOwner(
    sender: Sender,
    options: { gas: bigint; account: Address; newOwner: Address }  
  ) => Promise<void>
  ```

- Change the site of the organization
  ```
  sendChangeSite(
    sender: Sender,
    options: { gas: bigint; account: Address; site: string }  
  ) => Promise<void>
  ```

- Get the total number of accounts that registered in smart-contract
  ```
  getTotal() => Promise<number>
  ```

- Get the TON address of organizations by accountId
  ```
  getAddress(accountId: bigint) => Promise<Address | null>
  ```

- Get the owner of the organization by accountId
  ```
  getOwner(accountId: bigint) => Promise<Address | null>
  ```

- Get the owner of the organization by TON address
  ```
  getOwnerByAddress(address: Address) => Promise<Address | null>
  ```

- Get the site of the organization by accountId
  ```
  getOwner(accountId: bigint) => Promise<string | null>
  ```

- Get the site of the organization by TON Address
  ```
  getOwnerByAddress(address: Address) => Promise<string | null>
  ```


### Error codes

| Code  | Description                                             |
| ----- | ------------------------------------------------------- |
| 400   | Organization with such `account` already exists         |
| 403   | You are not the owner of the `account` to make changes  |
| 404   | The requested `account` does not exist                  |


## Users Contract

The smart-contract store data in a cell of 3 dictionaries
```
contract_dict   { account_id: ton_address   }
owner_dict      { account_id: ton_address   }
site_dict       { account_id: string        }
```

### Methods

| Parameter   | Type    | Description                                                     |
| ----------- | ------- | --------------------------------------------------------------- |
| sender      | Sender  | Represents the connected wallet and allows to send transactions |
| gas         | bigint  | Transaction fee                                                 |
| account     | Address | TON Address of organization wallet                              |
| wallet      | Address | TON Address of user wallet                                      |

- Add the user to the organization
  ```
  sendAddToOrganization(
    sender: Sender,
    options: { gas: bigint; wallet: Address; account: Address; }  
  ) => Promise<void>
  ```

- Remove the user from the organization
  ```
  sendRemoveFromOrganization(
    sender: Sender,
    options: { gas: bigint; wallet: Address; account: Address }  
  ) => Promise<void>
  ```

- Get user's organizations
  ```
  getOrganizations(wallet: Address) => Promise<Address[]>
  ```

### Error codes

| Code  | Description                                     |
| ----- | ------------------------------------------------|
| 4000  | User wallet is the same as organization wallet  |
| 4001  | User already has access to organization         |
| 4002  | User has no access to organization              |
| 404   | User does not exist                            |



## Links
- [CRC-32 online hash function](https://emn178.github.io/online-tools/crc32.html)


## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
-   `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `tests` - tests for the contracts.
-   `scripts` - scripts used by the project, mainly the deployment scripts.

## How to use

### Build

`npx blueprint build` or `yarn blueprint build`

### Test

`npx blueprint test` or `yarn blueprint test`

### Deploy or run another script

`npx blueprint run` or `yarn blueprint run`

### Add a new contract

`npx blueprint create ContractName` or `yarn blueprint create ContractName`

# License
MIT
