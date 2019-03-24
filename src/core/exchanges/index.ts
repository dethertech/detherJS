import * as constants from '../../constants';

import ExchangeKyber from './kyber';
import ExchangeUniswap from './uniswap';

import {
  Token, Exchange,
  IExchangePair, IExchange,
} from '../../types';

export const load = (sellToken: Token, buyToken: Token): IExchange => {
  const result: IExchangePair | void = constants.EXCHANGE_PAIRS.find((pair: IExchangePair): boolean => {
    const [sell, buy] = pair.tokens;
    return (sell === sellToken && buy === buyToken) ||
      (sell === buyToken && buy === sellToken);
  });
  if (!result) throw new Error('token pair not found');

  const exchange: IExchange = result.exchange === Exchange.kyber
    ? new ExchangeKyber(sellToken, buyToken)
    : new ExchangeUniswap(sellToken, buyToken)
  return exchange;
};

