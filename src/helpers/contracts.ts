import { ethers } from 'ethers';

import { CONTRACT_ADDRESSES, TICKER } from '../constants';
import { DetherContract, ExternalContract, Token } from '../types';

const ABI: any = {
  // dether
  [DetherContract.Control]: require('../../abi/dether/Control.json').abi,
  [DetherContract.DetherToken]: require('../../abi/dether/DetherToken.json').abi,
  [DetherContract.GeoRegistry]: require('../../abi/dether/GeoRegistry.json').abi,
  [DetherContract.Users]: require('../../abi/dether/Users.json').abi,
  [DetherContract.ZoneFactory]: require('../../abi/dether/ZoneFactory.json').abi,
  [DetherContract.ExchangeRateOracle]: require('../../abi/dether/ExchangeRateOracle.json').abi,
  [DetherContract.Shops]: require('../../abi/dether/Shops.json').abi,
  [DetherContract.Zone]: require('../../abi/dether/Zone.json').abi,
  [DetherContract.Teller]: require('../../abi/dether/Teller.json').abi,
  [DetherContract.CertifierRegistry]: require('../../abi/dether/CertifierRegistry.json').abi,
  [DetherContract.ShopDispute]: require('../../abi/dether/ShopDispute.json').abi,
  [DetherContract.TokenRegistry]: require('../../abi/dether/TokenRegistry.json').abi,

  // external
  [ExternalContract.erc20]: require('../../abi/external/erc20.json'),
  [ExternalContract.kyberNetworkProxy]: require('../../abi/external/kyberNetworkProxy.json'),
  [ExternalContract.uniswapExchange]: require('../../abi/external/uniswapExchange.json'),
  [ExternalContract.uniswapFactory]: require('../../abi/external/uniswapFactory.json'),
};

export const getAbi = async (contractName: DetherContract | ExternalContract): Promise<any> => {
  return ABI[contractName];
}

export const getContractAddress = async (contractName: DetherContract | ExternalContract, networkName: any): Promise<any> => {
  return CONTRACT_ADDRESSES[networkName][contractName];
}

export const getUniswapExchangeAddress = async (provider: ethers.providers.Provider, token: string): Promise<any> => {
  const contractName = ExternalContract.uniswapFactory
  let { name: networkName } = await provider.getNetwork();
  const uniswapFactoryInstance = await get(provider, contractName);

  return uniswapFactoryInstance.getExchange(token)
}

export const get = async (provider: ethers.providers.Provider, contractName: DetherContract | ExternalContract, address?: string, overwriteAbi?: any): Promise<any> => {
  if (!provider) throw new Error('missing provider arg');
  if (!contractName) throw new Error('missing contract name');
  const abi = ABI[contractName];
  if (!abi) throw new Error(`contract '${contractName}' is unknown`);
  if (!address) { // if no address passed in, load address from constants.js file
    let { name: networkName } = await provider.getNetwork();
    if (networkName === 'unknown') networkName = 'custom';
    address = CONTRACT_ADDRESSES[networkName][contractName]; // tslint:disable-line
    if (!address) throw new Error(`could not find contract address of ${contractName} on ${networkName}`);
  }
  return new ethers.Contract(address, overwriteAbi || abi, provider);
};

export const getErc20 = async (provider: ethers.providers.Provider, tokenName: Token): Promise<any> => {
  if (!provider) throw new Error('missing provider arg');
  if (!tokenName) throw new Error('missing tokenName');
  let { name: networkName } = await provider.getNetwork();
  if (networkName === 'unknown') networkName = 'custom';
  const address = TICKER[networkName][tokenName]; // tslint:disable-line
  if (!address) throw new Error(`could not find token address of ${tokenName} on ${networkName}`);
  return new ethers.Contract(address, ABI.erc20, provider);
};

export const getErc20Address = async (provider: ethers.providers.Provider, address: string): Promise<any> => {
  if (!provider) throw new Error('missing provider arg');
  if (!address) throw new Error('missing address');
  let { name: networkName } = await provider.getNetwork();
  if (networkName === 'unknown') networkName = 'custom';
  return new ethers.Contract(address, ABI.erc20, provider);
};
