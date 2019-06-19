import { ethers } from 'ethers';
import fetch from 'node-fetch';

import * as constants from '../constants';

import * as validate from '../helpers/validate';
import * as contract from '../helpers/contracts';
import * as convert from '../helpers/convert';
import * as exchanges from './exchanges';

import {
  Token,
  IBalances, IExchange, ITxOptions, ITicker, ExternalContract, ITickerDecimal, DetherContract
} from '../types';

// -------------------- //
//        Getters       //
// -------------------- //

export const getAllBalance = async (address: string, tickers: Token[], provider: ethers.providers.Provider): Promise<IBalances> => {
  validate.ethAddress(address);
  tickers.forEach(validate.token);
  let getEthBalance = false;

  const result: IBalances = {};

  for (const ticker of tickers) {
    if (ticker === Token.ETH) {
      getEthBalance = true;
      continue;
    }
    const erc20instance = await contract.getErc20(provider, ticker);
    result[ticker] = ethers.utils.formatEther(await erc20instance.balanceOf(address));
  }

  if (getEthBalance) {
    result.ETH = ethers.utils.formatEther(await provider.getBalance(address));
  }

  return result;
};

export const getExchangeEstimation = async (sellToken: Token, buyToken: Token, sellAmount: string, provider: ethers.providers.Provider): Promise<string> => {
  // validate.sellAmount(sellAmount);

  const exchange: IExchange = exchanges.load(sellToken, buyToken);
  const buyAmountEstimation: string = await exchange.estimate(sellAmount, provider);
  return buyAmountEstimation.toString();
};

// TO DO get token address call from staking smart contracts
export const getAvailableToken = async (provider: ethers.providers.Provider, forLogo?: boolean): Promise<ITicker> => {
  // forLogo is for returning mainnet ticker in case of testnet, because we use an open library matching
  // mainnet address to logo
  if (forLogo) return constants.TICKER['homestead']
  else {
    const network = await provider.getNetwork();
    return constants.TICKER[network.name];
  }
}

const _getTokenInfo = async (token: any): Promise<object> => {
  try {
    const rawData = await fetch(token.urlInfo);
    const jsonData = await rawData.json();
    console.log('json data', jsonData);
    return jsonData;
  } catch (e) {
    console.log('error getTokenInfo with this url as params', e, token.urlInfo);
  }
}

// TO DO get token address call from staking smart contracts
export const getAvailableTokenDecimals = async (provider: ethers.providers.Provider, forLogo?: boolean): Promise<any> => {
  // forLogo is for returning mainnet ticker in case of testnet, because we use an open library matching
  // mainnet address to logo
  if (forLogo) return constants.TICKER['homestead']
  else {
    const network = await provider.getNetwork();
    const tokenRegistryInstance: ethers.Contract = await contract.get(provider, DetherContract.TokenRegistry);
    const availableToken = await tokenRegistryInstance.getTokenList();
    // const tokenInfo = await _getTokenInfo();
    // console.log('availableTokennnnnnnn', availableToken);
    // return Promise.all(availableToken.map((token: Object): Promise<any> => _getTokenInfo(token)))
    return Promise.all(availableToken.map((token: Object): Promise<any> => _getTokenInfo(token)));
  }
}

export const hasApproval = async (owner: string, sellToken: Token, amount: string, provider: ethers.providers.Provider): Promise<boolean> => {
  const erc20instance = await contract.getErc20(provider, sellToken);
  const exchangeAddress = await contract.getUniswapExchangeAddress(provider, sellToken)
  const approve = await erc20instance.allowance(owner, exchangeAddress);

  if (Number(approve) > Number(amount)) {
    return true;
  }
  return false;
}

// -------------------- //
//     Transactions     //
// -------------------- //

export const execTrade = async (sellToken: Token, buyToken: Token, sellAmount: string, buyAmount: string, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  const exchange: IExchange = exchanges.load(sellToken, buyToken);
  const tradeTx = await exchange.trade(sellAmount, buyAmount, wallet, txOptions);
  return tradeTx;
};

export const execTrade_delayed = async (sellToken: Token, buyToken: Token, sellAmount: string, buyAmount: string, wallet: ethers.Wallet, nonce: number, txOptions: ITxOptions): Promise<any> => {
  const exchange: IExchange = exchanges.load(sellToken, buyToken);
  const tradeTx = await exchange.trade_delayed(sellAmount, buyAmount, wallet, nonce, txOptions);
  return tradeTx;
};

// TO DO get token address call from staking smart contracts?
export const sendCrypto = async (amount: string, toAddress: string, token: Token, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  let tsx;
  if (token === 'ETH') {
    return wallet.sendTransaction({
      to: toAddress,
      value: convert.ethToWeiBN(Number(amount)),
      ...txOptions,
    });
  } else {
    const erc20instance = await contract.getErc20(wallet.provider, token);
    return erc20instance.connect(wallet).transfer(
      toAddress,
      convert.ethToWeiBN(Number(amount)),
      txOptions
    );
  }
};

export const approveToken = async (token: Token, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  const exchangeAddress = await contract.getUniswapExchangeAddress(wallet.provider, token)
  const erc20instance = await contract.getErc20(wallet.provider, token);
  return erc20instance.connect(wallet).approve(exchangeAddress, ethers.utils.bigNumberify(2).pow(256).sub(1), txOptions);
};
