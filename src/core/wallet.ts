import ethers from 'ethers';

import * as util from '../helpers/util';
import * as validate from '../helpers/validate';
import * as contract from '../helpers/contracts';

import {
  Token, TransactionStatus,
  IBalances,
} from '../types';

// -------------------- //
//        Getters       //
// -------------------- //

export const getAllBalance = async (address: string, tickers: Token[], provider: ethers.providers.Provider) : Promise<IBalances> => {
  validate.ethAddress(address);
  tickers.forEach(validate.token);

  let getEthBalance = false;

  const result: IBalances = {};

  for (const ticker of tickers) {
    if (ticker === Token.ETH) {
      getEthBalance = true;
      continue;
    }
    const erc20instance = await contract.getErc20(provider, ticker);
    result[ticker] = ethers.utils.formatEther(await erc20instance.balanceOf(address));
  }

  if (getEthBalance) {
    result.ETH = ethers.utils.formatEther(await provider.getBalance(address));
  }

  return result;
};

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
