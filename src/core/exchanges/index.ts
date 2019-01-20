import * as constants from '../../constants';

import ExchangeKyber from './kyber';
import ExchangeUniswap from './uniswap';

import {
  Token, Exchange,
  IExchangePair, IExchange,
} from '../../types';

export const load = (sellToken: Token, buyToken: Token) : IExchange => {
  const result: IExchangePair|void = constants.EXCHANGE_PAIRS.find((pair: IExchangePair) : boolean => {
    const [sell, buy] = pair.tokens;
    return (sell === sellToken && buy === buyToken) ||
           (sell === buyToken && buy === sellToken);
  });
  if (!result) throw new Error('token pair not found');

  let exchange: IExchange;
  switch (result.exchange) {
    case Exchange.kyber: exchange = new ExchangeKyber(sellToken, buyToken);
    case Exchange.uniswap: exchange = new ExchangeUniswap(sellToken, buyToken);
  }
  return exchange;
};
