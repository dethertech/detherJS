import ExchangeBase from './base';
import { ethers } from 'ethers'
import * as contract from '../../helpers/contracts';

import {
  Token, Exchange, ExternalContract, ITxOptions
} from '../../types';

export default class ExchangeUniswap extends ExchangeBase {
  constructor(sellToken: Token, buyToken: Token) {
    super(sellToken, buyToken);
    this.name = Exchange.uniswap;
  }

  async estimate(sellAmount: string, provider: ethers.providers.Provider): Promise<string> {
    const erc20Token = this.sellToken === 'ETH' ? this.buyToken : this.sellToken
    const exchangeAddress = await contract.getUniswapExchangeAddress(provider, erc20Token)
    const uniswapContract = await contract.get(provider, ExternalContract.uniswapExchange, exchangeAddress);

    const network = await provider.getNetwork();
    const buyAmountWei = this.sellToken === 'ETH'
      ? (await uniswapContract.getEthToTokenInputPrice(sellAmount))
      : (await uniswapContract.getTokenToEthInputPrice(sellAmount))
    if (buyAmountWei.eq(0)) return '0';
    const buyAmount = ethers.utils.formatEther(buyAmountWei)
    console.log({
      network, buyAmount: buyAmount.toString(),
    });
    return buyAmount.toString();
  }

  async trade(sellAmount: string, buyAmount: string, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> {

    const erc20Token = this.sellToken === 'ETH' ? this.buyToken : this.sellToken
    const exchangeAddress = await contract.getUniswapExchangeAddress(wallet.provider, erc20Token)
    const uniswapContract = await contract.get(wallet.provider, ExternalContract.uniswapExchange, exchangeAddress);
    txOptions.gasLimit = 400000;
    if (this.sellToken === Token.ETH) {
      const uniswapInstance = uniswapContract.connect(wallet);
      txOptions.value = ethers.utils.bigNumberify(sellAmount);

      const deadline = Math.floor(Date.now() / 1000) + 100 // 100 seconds from now
      const tradeTx = await uniswapInstance.ethToTokenSwapInput(buyAmount, deadline, txOptions);

      return tradeTx;
    }
    if (this.buyToken === Token.ETH) {
      const deadline = Math.floor(Date.now() / 1000) + 100  // 100 seconds from now
      const tradeTx = await uniswapContract.connect(wallet).tokenToEthSwapInput(sellAmount, buyAmount, deadline, txOptions);
      return tradeTx;
    }
    throw new Error('erc20 token to erc20 token not yet implemented');
  }

  async trade_delayed(sellAmount: string, buyAmount: string, wallet: ethers.Wallet, nonce: number, txOptions: ITxOptions): Promise<any> {

    // https://docs.ethers.io/ethers.js/html/api-advanced.html?highlight=encode
    const uniswapInterfaceAbi = await contract.getAbi(ExternalContract.uniswapExchange)
    const iUniswap = new ethers.utils.Interface(uniswapInterfaceAbi);
    const erc20Token = this.sellToken === 'ETH' ? this.buyToken : this.sellToken

    const exchangeAddress = await contract.getUniswapExchangeAddress(wallet.provider, erc20Token)
    const uniswapContract = await contract.get(wallet.provider, ExternalContract.uniswapExchange, exchangeAddress);
    txOptions.gasLimit = 400000;
    const deadline = Math.floor(Date.now() / 1000) + 600 // 600 seconds from now
    if (this.sellToken === Token.ETH) {
      txOptions.value = ethers.utils.bigNumberify(sellAmount);

      const args = Object.values({
        min_tokens: buyAmount,
        deadline,
      });

      const data = iUniswap.functions.ethToTokenSwapInput.encode(args);
      const tsx = {
        nonce,
        gasPrice: txOptions.gasPrice,
        gasLimit: 500000,
        to: uniswapContract.address,
        value: ethers.utils.bigNumberify(sellAmount),
        data,
        chainId: 42,
      }
      return wallet.sign(tsx);
    }
    if (this.buyToken === Token.ETH) {

      const args = Object.values({
        tokens_sold: sellAmount,
        min_eth: buyAmount,
        deadline,
      });

      const data = iUniswap.functions.tokenToEthSwapInput.encode(args);
      const tsx = {
        nonce,
        gasPrice: txOptions.gasPrice,
        gasLimit: 500000,
        to: uniswapContract.address,
        value: 0,
        data,
        chainId: 42,
      }
      return wallet.sign(tsx);
    }
    throw new Error('erc20 token to erc20 token not yet implemented');
  }

}
