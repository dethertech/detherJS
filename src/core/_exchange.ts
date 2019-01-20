import ethers from 'ethers';

import * as validate from '../helpers/validate';
import * as exchanges from './exchanges';

import {
  Token,
  IExchange,
} from '../types';

// -------------------- //
//        Getters       //
// -------------------- //

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
