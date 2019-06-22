import { ethers } from 'ethers';
import axios from 'axios';

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

const getBalance = async (address: string, ticker: ITicker, provider: ethers.providers.Provider): Promise<IBalances> => {
  validate.ethAddress(address);
  const result: IBalances = {};
  if (Object.keys(ticker)[0] === Token.ETH) {
    result.ETH = ethers.utils.formatEther(await provider.getBalance(address));
    return result;
  }
  let decimals;
  let erc20instance;
  try {
    erc20instance = await contract.getErc20Address(provider, ticker[Object.keys(ticker)[0]]);
  } catch (e) {
    console.log('error detherJS getBalance instanciation', e)
    return;
  }
  try {
    decimals = await erc20instance.decimals();
  } catch (e) {
    console.log('error getBalance decimal', e)
    decimals = 18;
    return;
  }
  try {
    result[`${Object.keys(ticker)[0]}`] = ethers.utils.formatUnits(await erc20instance.balanceOf(address), decimals);
  } catch (e) {
    console.log('error detherJS getBalance', e);
    return;
  }
  return result;
}

export const getAllBalance = async (address: string, tickers: ITicker[], provider: ethers.providers.Provider): Promise<IBalances[]> => {
  const myBalances = await Promise.all(tickers.map((ticker: ITicker): Promise<IBalances> => getBalance(address, ticker, provider)));
  const cleanBalances = await myBalances.filter(function (el) {
    return el != null;
  });
  return cleanBalances;
};

export const getExchangeEstimation = async (sellToken: string, buyToken: string, sellAmount: string, provider: ethers.providers.Provider): Promise<string> => {
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

const _getTokenInfo = async (token: any, networkName: string): Promise<object> => {
  try {

    const jsonData = await axios.get(token.urlInfo);
    if (jsonData.status === 200 && networkName === 'homestead') {
      return jsonData.data;
    } else if (jsonData.status === 200 && networkName === 'kovan') {
      jsonData.data.address = constants.TICKER['kovan'][jsonData.data.symbol];
      return jsonData.data;
    }
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
    return Promise.all(availableToken.map((token: Object): Promise<any> => _getTokenInfo(token, network.name)));
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

export const isExchangeAvailable = async (token: string, provider: ethers.providers.Provider): Promise<boolean> => {
  try {
    await contract.getUniswapExchangeAddress(provider, token);
    return true;
  } catch (e) {
    return false;
  }
}

// -------------------- //
//     Transactions     //
// -------------------- //

export const execTrade = async (sellToken: string, buyToken: string, sellAmount: string, buyAmount: string, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  const exchange: IExchange = exchanges.load(sellToken, buyToken);
  const tradeTx = await exchange.trade(sellAmount, buyAmount, wallet, txOptions);
  return tradeTx;
};

export const execTrade_delayed = async (sellToken: string, buyToken: string, sellAmount: string, buyAmount: string, wallet: ethers.Wallet, nonce: number, txOptions: ITxOptions): Promise<any> => {
  const exchange: IExchange = exchanges.load(sellToken, buyToken);
  const tradeTx = await exchange.trade_delayed(sellAmount, buyAmount, wallet, nonce, txOptions);
  return tradeTx;
};

// TO DO get token address call from staking smart contracts?
export const sendCrypto = async (amount: string, toAddress: string, token: Token, wallet: ethers.Wallet, tokenAddress: string, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  let tsx;
  if (token === 'ETH') {
    return wallet.sendTransaction({
      to: toAddress,
      value: convert.ethToWeiBN(Number(amount)),
      ...txOptions,
    });
  } else {
    const erc20instance = await contract.getErc20Address(wallet.provider, tokenAddress);
    let decimals;
    try {
      decimals = await erc20instance.decimals();
    } catch (e) {
      throw new Error('Unable to get decimals of the token');
    }
    const valueToSend = ethers.utils.parseUnits(amount, decimals);
    return erc20instance.connect(wallet).transfer(
      toAddress,
      valueToSend,
      txOptions
    );
  }
};

export const approveToken = async (token: string, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  const exchangeAddress = await contract.getUniswapExchangeAddress(wallet.provider, token)
  const erc20instance = await contract.getErc20Address(wallet.provider, token);
  return erc20instance.connect(wallet).approve(exchangeAddress, ethers.utils.bigNumberify(2).pow(256).sub(1), txOptions);
};
