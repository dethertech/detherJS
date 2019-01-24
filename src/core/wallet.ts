import { ethers } from 'ethers';

import * as validate from '../helpers/validate';
import * as contract from '../helpers/contracts';
import * as exchanges from './exchanges';

import {
  Token,
  IBalances, IExchange,
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

export const getExchangeEstimation = async (sellToken: Token, buyToken: Token, sellAmount: string, provider: ethers.providers.Provider) : Promise<string> => {
  // validate.sellAmount(sellAmount);

  const exchange: IExchange = exchanges.load(sellToken, buyToken);
  const buyAmountEstimation: string = await exchange.estimate(sellAmount, provider);
  return buyAmountEstimation.toString();
};

// NOTE: buyArg
export const execTrade = async (sellToken: Token, buyToken: Token, sellAmount: string, buyAmount: string, wallet: ethers.Wallet, options?: { gasPrice: number }) : Promise<ethers.ContractTransaction> => {
  const exchange: IExchange = exchanges.load(sellToken, buyToken);
  const tradeTx = await exchange.trade(sellAmount, buyAmount, wallet, options);
  return tradeTx;
};
