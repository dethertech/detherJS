import { ethers } from 'ethers';

import * as util from '../helpers/util';
import * as validate from '../helpers/validate';
import * as contract from '../helpers/contracts';

import {
  DetherContract,
  IShop, IShopArgs,
} from '../types';

// -------------------- //
//       Formatters     //
// -------------------- //

export const shopArrToObj = (shopArr: any[]) : IShop => ({
  shopGeohash: shopArr[0],
  zoneGeohash: shopArr[0].slice(0, 7),
  category: shopArr[1],
  name: shopArr[2],
  description: shopArr[3],
  opening: shopArr[4],
  staked: shopArr[5].toString(),
  hasDispute: shopArr[6],
  disputeID: shopArr[7].toString(),
});

// to send as erc233 call data, which calls shop.tokenFallback
export const shopObjToBytes = (shopData: IShopArgs) : string => {
  const data = [
    util.toNBytes(shopData.country, 2),
    util.toNBytes(shopData.position, 12),
    util.toNBytes(shopData.category, 16),
    util.toNBytes(shopData.name, 16),
    util.toNBytes(shopData.description, 32),
    util.toNBytes(shopData.opening, 16),
  ].join('');

  return `0x${data}`;
};

// -------------------- //
//        Getters       //
// -------------------- //

export const existsByAddress = async (shopAddress: string, provider: ethers.providers.Provider) : Promise<boolean> => {
  validate.ethAddress(shopAddress);

  const shopInstance: ethers.Contract = await contract.get(provider, DetherContract.Shop);
  const shopExists: boolean = await shopInstance.shopByAddrExists(shopAddress);
  return shopExists;
};

export const getShopByAddress = async (shopAddress: string, provider: ethers.providers.Provider) : Promise<IShop> => {
  validate.ethAddress(shopAddress);

  const shopInstance: ethers.Contract = await contract.get(provider, DetherContract.Shop);
  const shop: IShop = shopArrToObj(await shopInstance.getShopByAddr(shopAddress));
  return shop;
};

export const getShopByPosition = async (geohash12: string, provider: ethers.providers.Provider) : Promise<IShop> => {
  validate.geohash(geohash12, 12);

  const shopInstance = await contract.get(provider, DetherContract.Shop);
  const shop = shopArrToObj(await shopInstance.getShopByPos(geohash12));
  return shop;
};

export const getShopsInZone = async (geohash7: string, provider: ethers.providers.Provider) : Promise<IShop[]> => {
  validate.geohash(geohash7, 7);

  const shopInstance: ethers.Contract = await contract.get(provider, DetherContract.Shop);
  const shopAddressesInZone: string[] = await shopInstance.gedisplaystShopAddressesInZone(util.stringToBytes(geohash7.slice(0, 7), 7));
  const shops: IShop[] = await Promise.all(shopAddressesInZone.map((shopAddress: string) : Promise<IShop> => getShopByAddress(shopAddress, provider)));
  return shops;
};

// -------------------- //
//        Setters       //
// -------------------- //

// erc223 call
export const addShop = async (zoneAddress: string, shopData: IShopArgs, wallet: ethers.Wallet) : Promise<ethers.ContractTransaction> => {
  validate.ethAddress(zoneAddress);
  validate.countryCode(shopData.country);
  validate.geohash(shopData.position, 10);
  // other 4 args are optional strings: category, name, description, opening

  const detherTokenContract = await contract.get(wallet.provider, DetherContract.DetherToken);
  const detherTokenInstance = detherTokenContract.connect(wallet);
  const tx = detherTokenInstance.transfer(shopObjToBytes(shopData)); // erc223 call
  return tx;
};

// 1 address can only own 1 shop
export const removeShop = async (wallet: ethers.Wallet) : Promise<ethers.ContractTransaction> => {
  const shopContract = await contract.get(wallet.provider, DetherContract.Shop);
  const shopExists = await shopContract.shopByAddrExists(wallet.address);
  if (!shopExists) throw new Error('wallet address not registered as shop');
  const shopInstance = shopContract.connect(wallet);
  const tx = await shopInstance.removeShop();
  return tx;
};
