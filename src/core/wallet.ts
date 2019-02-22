import { ethers } from 'ethers';

import * as constants from '../constants';

import * as validate from '../helpers/validate';
import * as contract from '../helpers/contracts';
import * as exchanges from './exchanges';

import {
  Token,
  IBalances, IExchange, ITxOptions, ITicker,
} from '../types';

// -------------------- //
//        Getters       //
// -------------------- //

export const getAllBalance = async (address: string, tickers: Token[], provider: ethers.providers.Provider): Promise<IBalances> => {
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

export const getExchangeEstimation = async (sellToken: Token, buyToken: Token, sellAmount: string, provider: ethers.providers.Provider): Promise<string> => {
  // validate.sellAmount(sellAmount);

  const exchange: IExchange = exchanges.load(sellToken, buyToken);
  const buyAmountEstimation: string = await exchange.estimate(sellAmount, provider);
  return buyAmountEstimation.toString();
};

// NOTE: buyArg
export const execTrade = async (sellToken: Token, buyToken: Token, sellAmount: string, buyAmount: string, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  const exchange: IExchange = exchanges.load(sellToken, buyToken);
  const tradeTx = await exchange.trade(sellAmount, buyAmount, wallet, txOptions);
  return tradeTx;
};

export const getAvailableToken = async (provider: ethers.providers.Provider, forLogo?: boolean): Promise<ITicker> => {
  // forLogo is for returning mainnet ticker in case of testnet, because we use an open library matching
  // mainnet address to logo
  if (forLogo) return constants.TICKER['homestead']
  else {
    const network = await provider.getNetwork();
    return constants.TICKER[network.name];
  }
}