import * as constants from '../../constants';

// import ExchangeKyber from './kyber';
import ExchangeUniswap from './uniswap';

import {
  Token, Exchange,
  IExchangePair, IExchange,
} from '../../types';

export const load = (sellToken: string, buyToken: string): IExchange => {
  // const result: IExchangePair | void = constants.EXCHANGE_PAIRS.find((pair: IExchangePair): boolean => {
  //   const [sell, buy] = pair.tokens;
  //   return (sell === sellToken && buy === buyToken) ||
  //     (sell === buyToken && buy === sellToken);
  // });
  // if (!result) throw new Error('token pair not found');

  // TO DO check pair is in uniswap

  const exchange: IExchange = new ExchangeUniswap(sellToken, buyToken)
  return exchange;
};

