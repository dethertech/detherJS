import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';

import * as constants from '../../constants';
import * as contract from '../../helpers/contracts';
import * as util from '../../helpers/util';

import ExchangeBase from './base';

import {
  Token, Exchange, ExternalContract,
} from '../../types';

const KYBER_ETH_TOKEN_ADDR: string = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

const weiToEthBN = (weiAmount: string) : BigNumber => (
  new BigNumber(ethers.utils.formatEther(weiAmount))
);

export default class ExchangeKyber extends ExchangeBase {
  constructor(sellToken: Token, buyToken: Token) {
    super(sellToken, buyToken);
    this.name = Exchange.kyber;
  }
  async estimate(sellAmount: string, provider: ethers.providers.Provider) : Promise<string> {
    const kyberNetworkProxyContract = await contract.get(provider, ExternalContract.kyberNetworkProxy);
    const network = await provider.getNetwork();
    const sellTokenAddr = this.sellToken === Token.ETH ? KYBER_ETH_TOKEN_ADDR : constants.TICKER[network.name][this.sellToken];
    const buyTokenAddr = this.buyToken === Token.ETH ? KYBER_ETH_TOKEN_ADDR : constants.TICKER[network.name][this.buyToken];
    const expectedRate = (await kyberNetworkProxyContract.getExpectedRate(sellTokenAddr, buyTokenAddr, sellAmount))[0];
    if (expectedRate.eq(0)) return '0';
    const buyAmountBN = weiToEthBN(sellAmount).times(weiToEthBN(expectedRate));
    console.log({
      network, sellTokenAddr, buyTokenAddr, expectedRate, buyAmount: buyAmountBN.toString(),
    });
    return buyAmountBN.toString();
  }
  async trade(sellAmount: string, buyAmount: string, wallet: ethers.Wallet, gasPrice: number = 0) : Promise<ethers.ContractTransaction> {
    const kyberNetworkProxyContract = await contract.get(wallet.provider, ExternalContract.kyberNetworkProxy);
    const buyRateBN = weiToEthBN(buyAmount).div(weiToEthBN(sellAmount));
    console.log('what is buyRate, bignumber or string, normal number or wei amount?', typeof buyRateBN, buyRateBN);
    if (this.sellToken === Token.ETH) {
      const buyTokenContract = await contract.getErc20(wallet.provider, this.buyToken);
      const kyberNetworkProxyInstance = kyberNetworkProxyContract.connect(wallet);
      const tradeTx = await kyberNetworkProxyInstance.swapEtherToToken(buyTokenContract.address, buyRateBN.toString(), { gasPrice, value: sellAmount });
      return tradeTx;
    }
    if (this.buyToken === Token.ETH) {
      const sellTokenContract = await contract.getErc20(wallet.provider, this.sellToken);
      const sellTokenAllowanceOfKyber = await sellTokenContract.allowance(wallet.address, kyberNetworkProxyContract.address);
      const maxUint256Val = util.getMaxUint256Value();
      // TODO: do them in one go by incrementing nonce, or wait until approve has succeeded before doing trade tx
      if (sellTokenAllowanceOfKyber.lt(maxUint256Val.div(2))) { // if allowance has decreased below half of max uint256 value, re-set allowance to max uint256
        const sellTokenInstance = sellTokenContract.connect(wallet);
        const approveTx = await sellTokenInstance.approve(kyberNetworkProxyContract.address, maxUint256Val, { gasPrice });
        await approveTx.wait(); // wait for it to be mined
      }
      const tradeTx = await kyberNetworkProxyContract.swapTokenToEther(sellTokenContract.address, sellAmount, buyRateBN.toString());
      return tradeTx;
    }
    throw new Error('erc20 token to erc20 token not yet implemented');
  }
}
