import ethers from 'ethers';

import { CONTRACT_ADDRESSES, TICKER } from './constants';

import { DetherContract, ExternalContract, Token } from './types';

const ABI: any = {
  // dether
  [DetherContract.Control]: require('../abi/dether/Control.json'),
  [DetherContract.DetherToken]: require('../abi/dether/DetherToken.json'),
  [DetherContract.GeoRegistry]: require('../abi/dether/GeoRegistry.json'),
  [DetherContract.Users]: require('../abi/dether/Users.json'),
  [DetherContract.ZoneFactory]: require('../abi/dether/ZoneFactory.json'),
  [DetherContract.ExchangeRateOracle]: require('../abi/dether/ExchangeRateOracle.json'),
  // external
  [ExternalContract.erc20]: require('../abi/external/erc20.json'),
  [ExternalContract.weth]: require('../abi/external/weth.json'),
  [ExternalContract.airswapExchange]: require('../abi/external/airswapExchange.json'),
  [ExternalContract.kyberNetworkProxy]: require('../abi/external/kyberNetworkProxy.json'),
};

export const getContract = async (provider: ethers.providers.FallbackProvider, name: DetherContract|ExternalContract, address?: string) : Promise<any> => {
  if (!provider) throw new Error('missing provider arg');
  if (!name) throw new Error('missing contract name');
  const abi = ABI[name];
  if (!abi) throw new Error(`contract '${name}' is unknown`);
  if (!address) { // if no address passed in, load address from constants.js file
    const { name: networkName } = await provider.getNetwork();
    address = CONTRACT_ADDRESSES[networkName][name]; // tslint:disable-line
    if (!address) throw new Error(`could not find contract address of ${name} on ${networkName}`);
  }
  return new ethers.Contract(address, abi, provider);
};

export const getErc20Contract = async (provider: any, name: Token) : Promise<any> => {
  if (!provider) throw new Error('missing provider arg');
  if (!name) throw new Error('missing contract name');
  const { name: networkName } = await provider.getNetwork();
  const address = TICKER[networkName][name]; // tslint:disable-line
  if (!address) throw new Error(`could not find token address of ${name} on ${networkName}`);
  return new ethers.Contract(address, ABI.erc20, provider);
};
