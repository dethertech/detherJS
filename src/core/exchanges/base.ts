import { ethers } from "ethers";

import * as contract from "../../helpers/contracts";
import * as util from "../../helpers/util";

import { Token, Exchange, ITxOptions } from "../../types";

export default class ExchangeBase {
  sellToken: string;
  buyToken: string;
  name: Exchange;
  constructor(sellToken: string, buyToken: string) {
    this.sellToken = sellToken;
    this.buyToken = buyToken;
  }
  async estimate(
    sellAmount: string,
    provider: ethers.providers.Provider
  ): Promise<string> {
    throw new Error("estimate method not implented");
  }
  async trade(
    sellAmount: string,
    buyAmount: string,
    wallet: ethers.Wallet,
    txOptions: ITxOptions
  ): Promise<ethers.ContractTransaction | void> {
    throw new Error("trade method not implented");
  }
  async tradeFromSell(
    sellAmount: string,
    buyAmount: string,
    destAddress: string,
    wallet: ethers.Wallet,
    txOptions: ITxOptions
  ): Promise<ethers.ContractTransaction | void> {
    throw new Error("trade method not implented");
  }
  async trade_delayed(
    sellAmount: string,
    buyAmount: string,
    wallet: ethers.Wallet,
    nonce: number,
    txOptions: ITxOptions
  ): Promise<ethers.ContractTransaction | void> {
    throw new Error("trade_delayed method not implented");
  }
}
