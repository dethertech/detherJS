import Web3 from 'web3';
import { ethers } from 'ethers';

import {
  Network,
  IEthersOptions,
} from '../types';

export const connectMetamask = async () : Promise<any> => {
  // get metamask, new "privacy" way, and original "injection" way
  const web3metamask: any = await new Promise((resolve, reject) => {
    // Wait for loading completion to avoid race conditions with web3 injection timing.
    window.addEventListener('load', async () => { // Modern dapp browsers...
      if (window.ethereum) {
        const web3: any = new Web3(window.ethereum);
        try { // Request account access if needed
          await window.ethereum.enable(); // Acccounts now exposed
          resolve(web3);
        } catch (error) {
          reject(error);
        }
      } else if (window.web3) { // Legacy dapp browsers...Use Mist/MetaMask's provider.
        const web3 = window.web3;
        console.log('Injected web3 detected.');
        resolve(web3);
      }
    });
  });

  return new ethers.providers.Web3Provider(web3metamask.currentProvider);
};

export const connectEthers = async (opts: IEthersOptions) : Promise<any> => {
  if (!opts.network && !opts.rpcURL) {
    throw new Error('missing one of options: rpcURL, network');
  }

  const providers = [];

  // when using ganache, there is no network name, only an rpcURL
  if (opts.rpcURL) {
    providers.push(new ethers.providers.JsonRpcProvider(opts.rpcURL));

    if (opts.rpcURL2) {
      providers.push(new ethers.providers.JsonRpcProvider(opts.rpcURL2));
    }
  }

  if (opts.network) {
    if (!Object.keys(Network).includes(opts.network)) {
      throw new Error(`network with name: ${opts.network} is not a valid network name`);
    }

    if (opts.etherscanKey) {
      providers.push(new ethers.providers.EtherscanProvider(opts.network, opts.etherscanKey));
    }

    if (opts.infuraKey) {
      providers.push(new ethers.providers.InfuraProvider(opts.network, opts.infuraKey));
    }

    providers.push(ethers.getDefaultProvider(opts.network));
  }

  return new ethers.providers.FallbackProvider(providers);
};
