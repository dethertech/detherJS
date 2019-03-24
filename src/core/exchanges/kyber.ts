import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';

import * as constants from '../../constants';
import * as contract from '../../helpers/contracts';
import * as util from '../../helpers/util';

import ExchangeBase from './base';

import {
  Token, Exchange, ExternalContract, ITxOptions
} from '../../types';

const KYBER_ETH_TOKEN_ADDR: string = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

// TO DO
// add minConversionRate params for kyber swap (* 0.985)

const weiToEthBN = (weiAmount: string): BigNumber => (
  new BigNumber(ethers.utils.formatEther(weiAmount))
);

export default class ExchangeKyber extends ExchangeBase {
  constructor(sellToken: Token, buyToken: Token) {
    super(sellToken, buyToken);
    this.name = Exchange.kyber;
  }
  async estimate(sellAmount: string, provider: ethers.providers.Provider): Promise<string> {
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
  async trade(sellAmount: string, buyAmount: string, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> {
    const kyberNetworkProxyContract = await contract.get(wallet.provider, ExternalContract.kyberNetworkProxy);
    const buyRateBN = weiToEthBN(buyAmount).div(weiToEthBN(sellAmount));
    if (this.sellToken === Token.ETH) {
      const buyTokenContract = await contract.getErc20(wallet.provider, this.buyToken);
      const kyberNetworkProxyInstance = kyberNetworkProxyContract.connect(wallet);
      txOptions.value = ethers.utils.bigNumberify(sellAmount);

      const tradeTx = await kyberNetworkProxyInstance.swapEtherToToken(buyTokenContract.address, 0, txOptions);
      return tradeTx;
    }
    if (this.buyToken === Token.ETH) {
      const sellTokenContract = await contract.getErc20(wallet.provider, this.sellToken);
      const tradeTx = await kyberNetworkProxyContract.connect(wallet).swapTokenToEther(sellTokenContract.address, sellAmount, 0, txOptions);
      return tradeTx;
    }
    throw new Error('erc20 token to erc20 token not yet implemented');
  }
  async trade_delayed(sellAmount: string, buyAmount: string, wallet: ethers.Wallet, nonce: number, txOptions: ITxOptions): Promise<any> {

    // https://docs.ethers.io/ethers.js/html/api-advanced.html?highlight=encode
    const kyberInterfaceAbi = await contract.getAbi(ExternalContract.kyberNetworkProxy)
    const ikyber = new ethers.utils.Interface(kyberInterfaceAbi);

    const kyberNetworkProxyContract = await contract.get(wallet.provider, ExternalContract.kyberNetworkProxy);

    if (this.sellToken === Token.ETH) {
      const buyTokenContract = await contract.getErc20(wallet.provider, this.buyToken);
      txOptions.value = ethers.utils.bigNumberify(sellAmount);
      const args = Object.values({
        token: buyTokenContract.address,
        minConversionRate: 0,
      });
      const data = ikyber.functions.swapEtherToToken.encode(args);
      const tsx = {
        nonce,
        gasPrice: txOptions.gasPrice,
        gasLimit: 500000,
        to: kyberNetworkProxyContract.address,
        value: ethers.utils.bigNumberify(sellAmount),
        data,
        chainId: 42,
      }
      return wallet.sign(tsx);
    }
    if (this.buyToken === Token.ETH) {
      const sellTokenContract = await contract.getErc20(wallet.provider, this.sellToken);
      const args = Object.values({
        token: sellTokenContract.address,
        srcAmount: sellAmount,
        minConversionRate: 0,
      });
      const data = ikyber.functions.swapTokenToEther.encode(args);
      const tsx = {
        nonce,
        gasPrice: txOptions.gasPrice,
        gasLimit: 500000,
        to: kyberNetworkProxyContract.address,
        value: 0,
        data,
        chainId: 42,
      }
      return wallet.sign(tsx);
    }
    throw new Error('erc20 token to erc20 token not yet implemented');
  }
}
