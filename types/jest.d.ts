import '@jest/globals';

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveTransaction(expected: any): R;
      toEqualCell(expected: any): R;
      toEqualAddress(expected: any): R;
      toEqualSlice(expected: any): R;
      toThrowExitCode(expected: any): R;
    }
  }
}

export {};
