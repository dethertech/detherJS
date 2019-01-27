import { ethers } from 'ethers';

import * as constants from '../constants';

import * as util from '../helpers/util';
import * as validate from '../helpers/validate';
import * as contract from '../helpers/contracts';

import {
  DetherContract,
  IShop, IShopArgs, ITxOptions,
} from '../types';

const SHOP_ADD_FN = '30';

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
export const addShopObjToBytes = (shopData: IShopArgs) : string => {
  const data = [
    SHOP_ADD_FN,
    util.toNBytes(shopData.country, 2),
    util.toNBytes(shopData.position, 12),
    shopData.category ? util.toNBytes(shopData.category, 16) : util.remove0x(constants.BYTES16_ZERO),
    shopData.name ? util.toNBytes(shopData.name, 16) : util.remove0x(constants.BYTES16_ZERO),
    shopData.description ? util.toNBytes(shopData.description, 32) : util.remove0x(constants.BYTES32_ZERO),
    shopData.opening ? util.toNBytes(shopData.opening, 16) : util.remove0x(constants.BYTES16_ZERO),
  ].join('');

  return `0x${data}`;
};

// -------------------- //
//        Getters       //
// -------------------- //

export const existsByAddress = async (shopAddress: string, provider: ethers.providers.Provider) : Promise<boolean> => {
  validate.ethAddress(shopAddress);

  const shopInstance: ethers.Contract = await contract.get(provider, DetherContract.Shops);
  const shopExists: boolean = await shopInstance.shopByAddrExists(shopAddress);
  return shopExists;
};

export const getShopByAddress = async (shopAddress: string, provider: ethers.providers.Provider) : Promise<IShop> => {
  validate.ethAddress(shopAddress);

  const shopInstance: ethers.Contract = await contract.get(provider, DetherContract.Shops);
  const shop: IShop = shopArrToObj(await shopInstance.getShopByAddr(shopAddress));
  return shop;
};

export const getShopByPosition = async (geohash12: string, provider: ethers.providers.Provider) : Promise<IShop> => {
  validate.geohash(geohash12, 12);

  const shopInstance = await contract.get(provider, DetherContract.Shops);
  const shop = shopArrToObj(await shopInstance.getShopByPos(geohash12));
  return shop;
};

export const getShopsInZone = async (geohash7: string, provider: ethers.providers.Provider) : Promise<IShop[]> => {
  validate.geohash(geohash7, 7);

  const shopInstance: ethers.Contract = await contract.get(provider, DetherContract.Shops);
  const shopAddressesInZone: string[] = await shopInstance.getShopAddressesInZone(util.stringToBytes(geohash7.slice(0, 7), 7));
  return Promise.all(shopAddressesInZone.map((shopAddress: string) : Promise<IShop> => getShopByAddress(shopAddress, provider)));
};

// -------------------- //
//        Setters       //
// -------------------- //

// erc223 call
export const addShop = async (shopData: IShopArgs, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.countryCode(shopData.country);
  validate.geohash(shopData.position, 12);
  // other 4 args are optional strings: category, name, description, opening

  const shopContract = await contract.get(wallet.provider, DetherContract.Shops);
  const detherTokenContract = await contract.get(wallet.provider, DetherContract.DetherToken);
  const licensePrice = await shopContract.countryLicensePrice(util.stringToBytes(shopData.country, 2));
  return detherTokenContract.connect(wallet).transfer(shopContract.address, licensePrice, addShopObjToBytes(shopData), txOptions); // erc223 call
};

// 1 address can only own 1 shop
export const removeShop = async (wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  const shopContract = await contract.get(wallet.provider, DetherContract.Shops);
  const shopExists = await shopContract.shopByAddrExists(wallet.address);
  if (!shopExists) throw new Error('wallet address not registered as shop');
  const shopInstance = shopContract.connect(wallet, txOptions);
  return shopInstance.removeShop();
};
