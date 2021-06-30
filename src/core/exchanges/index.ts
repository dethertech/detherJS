import * as constants from '../../constants';

// import ExchangeKyber from './kyber';
import ExchangeUniswap from './uniswap';
import ExchangePancakeSwap from './pancakeSwap';

import {
  Token, Exchange,
  IExchangePair, IExchange,
} from '../../types';

export const load = (sellToken: string, buyToken: string, isBsc?: boolean): IExchange => {
  // const result: IExchangePair | void = constants.EXCHANGE_PAIRS.find((pair: IExchangePair): boolean => {
  //   const [sell, buy] = pair.tokens;
  //   return (sell === sellToken && buy === buyToken) ||
  //     (sell === buyToken && buy === sellToken);
  // });
  // if (!result) throw new Error('token pair not found');

  // TO DO check pair is in uniswap

  let exchange: IExchange ;
  if (isBsc) {
    exchange = new ExchangePancakeSwap(sellToken, buyToken)
  } else {
    exchange = new ExchangeUniswap(sellToken, buyToken)
  }



  return exchange;
};

