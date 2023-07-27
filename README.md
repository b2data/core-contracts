# Contracts

## Organizations Contract
The smart-contract stores data in a cell of 4 dictionaries
```
contract_dict   { account_id: ton_address   }
owner_dict      { account_id: ton_address   }
site_dict       { account_id: string        }
user_dict       { telegram_id: [account_id] }
```

All methods of the contracts are exported to `npm` and can be used from `@b2data/contracts`



#### Methods

| Parameter | Type    | Desctiption                                                                             |
| --------- | ------- | --------------------------------------------------------------------------------------- |
| sender    | Sender  | Represents the connected wallet and allow to send transactions                          |
| gas       | bigint  | Transaction fee                                                                         |
| account   | Address | TON Address of wallet                                                                   |
| site      | string  | ADNL address                                                                            |
| newOwner  | Address | TON Address of new owner wallet                                                         |
| accountId | bit256  | [Account ID](https://docs.ton.org/learn/overviews/addresses#account-id) of TON Address  |

- Create new organization
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

- Change organization owner
  ```
  sendChangeOwner(
    sender: Sender,
    options: { gas: bigint; account: Address; newOwner: Address }  
  ) => Promise<void>
  ```

- Change organization site
  ```
  sendChangeSite(
    sender: Sender,
    options: { gas: bigint; account: Address; site: string }  
  ) => Promise<void>
  ```

- Get total number of accounts that registred in smart-contract
  ```
  getTotal() => Promise<number>
  ```

- Get TON address of organizations by accountId
  ```
  getAddress(accountId: bigint) => Promise<Address>
  ```

- Get owner of organization by accountId
  ```
  getOwner(accountId: bigint) => Promise<Address | null>
  ```

- Get owner of organization by TON Address
  ```
  getOwnerByAdrress(address: Address) => Promise<Address | null>
  ```

- Get site of organization by accountId
  ```
  getOwner(accountId: bigint) => Promise<string | null>
  ```

- Get site of organization by TON Address
  ```
  getOwnerByAdrress(address: Address) => Promise<string | null>
  ```


#### Error codes
| Code  | Description                                         |
| ----- | --------------------------------------------------- |
| 400   | Organization with such `account` already exists     |
| 403   | You are not owner of the `account` to make changes  |
| 404   | The requested `account` does not exists             |



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
