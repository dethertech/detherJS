import { ethers } from 'ethers';

import * as util from '../helpers/util';
import * as validate from '../helpers/validate';

import {
  TransactionStatus,
} from '../types';

// -------------------- //
//        Getters       //
// -------------------- //

export const getTransactionStatus = async (txHash: string, provider: ethers.providers.Provider) : Promise<TransactionStatus> => {
  validate.txHash(txHash);

  try {
    const tx = await provider.getTransaction(util.add0x(txHash));
    if (tx && tx.blockHash) {
      const receipt = await provider.getTransactionReceipt(util.add0x(txHash));
      return receipt.status === 1 ? TransactionStatus.success : TransactionStatus.error;
    }
    return tx ? TransactionStatus.pending : TransactionStatus.unknown;
  } catch (e) {
    return TransactionStatus.unknown;
  }
};
