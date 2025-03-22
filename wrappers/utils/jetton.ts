import { Address } from '@ton/core';
import { beginCell, Dictionary, Cell } from '@ton/core';

// @ts-ignore
import { Sha256 } from '@aws-crypto/sha256-js';

export enum JettonOp {
  Transfer = 0x0f8a7ea5,
  TransferNotification = 0x7362d09c,

  InternalTransfer = 0x178d4519,
  Excesses = 0xd53276db,

  Burn = 0x595f07bc,
  BurnNotification = 0x7bdd97de,

  WithdrawTons = 0x6d8e5e3c,
  BurnJettons = 0x25938561,

  Mint = 0x1674b0a0,
  ChangeAdmin = 0xd4deb03b,
  ChangeMetadata = 0x0ec29200,
}

export enum JettonError {
  WrongWorkchain = 333,

  UnauthorizedTransfer = 705,
  NotEnoughJettons = 706,
  UnauthorizedIncomingTransfer = 707,
  MalformedForwardPayload = 708,
  NotEnoughTons = 709,
  BurnFeeNotMatched = 710,
  UnknownAction = 0xffff,
  UnknownActionBounced = 0xfff0,

  DiscoveryFeeNotMatched = 75,
  UnauthorizedMintRequest = 73,
  UnauthorizedBurnRequest = 74,
  UnauthorizedChangeAdminRequest = 76,
  UnauthorizedChangeContentRequest = 77,
  UnauthorizedSwapRequest = 78,
}

export type JettonMetaDataKeys = 'name' | 'description' | 'image' | 'decimals' | 'symbol';

export type JettonMasterConfig = {
  owner: Address;
  walletCell: Cell;
  metadata: { [s in JettonMetaDataKeys]?: string };
};

export const sha256 = (str: string) => {
  const sha = new Sha256();
  sha.update(str);
  return Buffer.from(sha.digestSync());
};

export const jettonOnChainMetadataSpec: {
  [key in JettonMetaDataKeys]: BufferEncoding;
} = {
  name: 'utf8',
  description: 'utf8',
  image: 'ascii',
  decimals: 'utf8',
  symbol: 'utf8',
};

export const buildTokenMetadataCell = (metadata: JettonMasterConfig['metadata']) => {
  const dict = Dictionary.empty(Dictionary.Keys.Buffer(32), Dictionary.Values.Cell());

  Object.entries(metadata).forEach(([k, v]: [string, string | undefined]) => {
    if (!jettonOnChainMetadataSpec[k as JettonMetaDataKeys]) throw new Error(`Unsupported onchain key: ${k}`);
    if (v === undefined || v === '') return;
    const bufferToStore = Buffer.from(`\x00${v}`, jettonOnChainMetadataSpec[k as JettonMetaDataKeys]);
    dict.set(sha256(k), beginCell().storeBuffer(bufferToStore).endCell());
  });

  return beginCell().storeInt(0x00, 8).storeDict(dict).endCell();
};

export const transformContentCell = (content: Cell) => {
  const metadata: Record<JettonMetaDataKeys, string> = {
    name: '',
    description: '',
    image: '',
    decimals: '',
    symbol: '',
  };

  const contentSlice = content.beginParse();
  const unix = contentSlice.loadUint(8);

  if (unix === 0) {
    const dict = contentSlice.loadDict(Dictionary.Keys.Buffer(32), Dictionary.Values.Cell());
    Object.keys(jettonOnChainMetadataSpec).map((k) => {
      const val = dict.get(sha256(k))?.beginParse();
      if (val) {
        metadata[k as JettonMetaDataKeys] = val
          .loadBuffer(Math.ceil(val.remainingBits / 8))
          .toString(jettonOnChainMetadataSpec[k as JettonMetaDataKeys])
          .replace('\x00', '');
      }
    });
  }

  return metadata;
};

export const randomAddress = (wc: number = 0) => {
  const buf = Buffer.alloc(32);
  for (let i = 0; i < buf.length; i++) {
    buf[i] = Math.floor(Math.random() * 256);
  }
  return new Address(wc, buf);
};
