// Jest setup file for TON test utilities
// This properly extends Jest's expect with TON-specific matchers

// Mock @ton/test-utils before any imports to prevent CI issues
jest.mock('@ton/test-utils', () => ({
  contractsMeta: {
    upsert: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    size: 0,
    forEach: jest.fn(),
    entries: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    [Symbol.iterator]: jest.fn(),
  },
  compareTransaction: jest.fn(),
  flattenTransaction: jest.fn(),
  findTransaction: jest.fn(),
  findTransactionRequired: jest.fn(),
  filterTransactions: jest.fn(),
  ContractsMeta: jest.fn(),
  ExitCodes: {},
  prettifyTransaction: jest.fn(),
  randomAddress: jest.fn(),
  executeTill: jest.fn(),
  executeFrom: jest.fn(),
}));

import { expect } from '@jest/globals';
import { compareTransactionForTest } from '@ton/test-utils/dist/test/transaction';
import { compareCellForTest, compareAddressForTest, compareSliceForTest } from '@ton/test-utils/dist/test/comparisons';
import { compareThrownExitCodeForTest } from '@ton/test-utils/dist/test/exitCode';

// Helper function to wrap comparers
function wrapComparer(comparer: any) {
  return function (actual: any, cmp: any) {
    const result = comparer(actual, cmp);
    if (result instanceof Promise) {
      return result.then(extractResult);
    }
    return extractResult(result);
  };
}

function extractResult(result: any) {
  return {
    pass: result.pass,
    message: () => {
      if (result.pass) {
        return result.negMessage();
      } else {
        return result.posMessage();
      }
    },
  };
}

// Extend Jest's expect with TON matchers
expect.extend({
  toHaveTransaction: wrapComparer(compareTransactionForTest),
  toEqualCell: wrapComparer(compareCellForTest),
  toEqualAddress: wrapComparer(compareAddressForTest),
  toEqualSlice: wrapComparer(compareSliceForTest),
  toThrowExitCode: wrapComparer(compareThrownExitCodeForTest),
});
