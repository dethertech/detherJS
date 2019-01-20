import ExchangeBase from './base';

import {
  Token, Exchange,
} from '../../types';

export default class ExchangeUniswap extends ExchangeBase {
  constructor(sellToken: Token, buyToken: Token) {
    super(sellToken, buyToken);
    this.name = Exchange.uniswap;
  }
  // TODO
}
