import ExchangeBase from './base';
import { ethers } from 'ethers'
import * as contract from '../../helpers/contracts';

import {
  Token, Exchange, ExternalContract, ITxOptions
} from '../../types';

export default class ExchangeUniswap extends ExchangeBase {
  constructor(sellToken: string, buyToken: string) {
    super(sellToken, buyToken);
    this.name = Exchange.uniswap;
  }

  async estimate(sellAmount: string, provider: ethers.providers.Provider): Promise<string> {
    const erc20Token = this.sellToken === 'ETH' ? this.buyToken : this.sellToken
    const exchangeAddress = await contract.getUniswapExchangeAddress(provider, erc20Token)
    const uniswapContract = await contract.get(provider, ExternalContract.uniswapExchange, exchangeAddress);
    const network = await provider.getNetwork();
    let decimals = 18;
    if (this.sellToken !== 'ETH') {
      const erc20instance = await contract.getErc20Address(provider, this.sellToken);
      decimals = await erc20instance.decimals();
    }
    const sellAmountWei = ethers.utils.parseUnits(sellAmount, decimals);
    const buyAmountWei = this.sellToken === 'ETH'
      ? (await uniswapContract.getEthToTokenInputPrice(sellAmountWei))
      : (await uniswapContract.getTokenToEthInputPrice(sellAmountWei))
    if (buyAmountWei.eq(0)) return '0';
    decimals = 18;
    if (this.buyToken !== 'ETH') {
      const erc20instance2 = await contract.getErc20Address(provider, this.buyToken);
      decimals = await erc20instance2.decimals();
    }
    const buyAmount = ethers.utils.formatUnits(buyAmountWei, decimals);
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
      txOptions.value = ethers.utils.parseEther(sellAmount);
      const erc20instance = await contract.getErc20Address(wallet.provider, this.buyToken);
      const decimal = await erc20instance.decimals();
      if (decimal) {
        const deadline = Math.floor(Date.now() / 1000) + 100 // 100 seconds from now
        const tradeTx = await uniswapInstance.ethToTokenSwapInput(ethers.utils.parseUnits(buyAmount, decimal), deadline, txOptions);
        return tradeTx;
      }
    }
    if (this.buyToken === Token.ETH) {
      const deadline = Math.floor(Date.now() / 1000) + 100  // 100 seconds from now
      const erc20instance = await contract.getErc20Address(wallet.provider, this.sellToken);
      const decimal = await erc20instance.decimals();
      if (decimal) {
        const sellAmountWei = ethers.utils.parseUnits(sellAmount, decimal);
        const tradeTx = await uniswapContract.connect(wallet).tokenToEthSwapInput(sellAmountWei, ethers.utils.parseEther(buyAmount), deadline, txOptions);
        return tradeTx;
      }
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
    const network = await wallet.provider.getNetwork();
    const deadline = Math.floor(Date.now() / 1000) + 600 // 600 seconds from now
    if (this.sellToken === Token.ETH) {
      const erc20instance = await contract.getErc20Address(wallet.provider, this.buyToken);
      const decimal = await erc20instance.decimals();
      if (decimal) {
        const args = Object.values({
          min_tokens: ethers.utils.parseUnits(buyAmount, decimal),
          deadline,
        });
        const data = iUniswap.functions.ethToTokenSwapInput.encode(args);
        const tsx = {
          nonce,
          gasPrice: txOptions.gasPrice ? txOptions.gasPrice : 10000000000,
          gasLimit: 500000,
          to: uniswapContract.address,
          value: ethers.utils.parseEther(sellAmount),
          data,
          chainId: network.chainId,
        }
        return wallet.sign(tsx);
      } else {
        throw new Error('erc20 token decimals not detected');
      }
    }
    if (this.buyToken === Token.ETH) {

      const erc20instance = await contract.getErc20Address(wallet.provider, this.sellToken);
      const decimal = await erc20instance.decimals();
      if (decimal) {
        const args = Object.values({
          tokens_sold: ethers.utils.parseUnits(sellAmount, decimal),
          min_eth: ethers.utils.parseEther(buyAmount),
          deadline,
        });

        const data = iUniswap.functions.tokenToEthSwapInput.encode(args);
        const tsx = {
          nonce,
          gasPrice: txOptions.gasPrice ? txOptions.gasPrice : 10000000000,
          gasLimit: 500000,
          to: uniswapContract.address,
          value: 0,
          data,
          chainId: network.chainId,
        }
        return wallet.sign(tsx);
      } else {
        throw new Error('erc20 token decimals not detected');
      }
    }
    throw new Error('erc20 token to erc20 token not yet implemented');
  }

}
