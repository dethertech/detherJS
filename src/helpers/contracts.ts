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
  // external
  [ExternalContract.erc20]: require('../../abi/external/erc20.json'),
  [ExternalContract.kyberNetworkProxy]: require('../../abi/external/kyberNetworkProxy.json'),
};

export const getAbi = async (contractName: DetherContract | ExternalContract): Promise<any> => {
  return ABI[contractName];
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
