import { ethers } from 'ethers';

import * as constants from '../constants';

import * as convert from '../helpers/convert';
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

export const shopArrToObj = (shopArr: any[]): IShop => ({
  position: convert.hexToAscii(shopArr[0]),
  zoneGeohash: convert.hexToAscii(`0x${convert.remove0x(shopArr[0]).slice(0, 12)}`),
  category: shopArr[1] !== constants.BYTES16_ZERO ? shopArr[1] : undefined,
  name: shopArr[2] !== constants.BYTES16_ZERO ? shopArr[2] : undefined,
  description: shopArr[3] !== constants.BYTES32_ZERO ? shopArr[3] : undefined,
  opening: shopArr[4] !== constants.BYTES16_ZERO ? shopArr[4] : undefined,
  staked: shopArr[5].toString(),
  hasDispute: shopArr[6],
  disputeID: shopArr[6] ? shopArr[7].toString() : undefined,
});

// to send as erc233 call data, which calls shop.tokenFallback
export const createShopBytes = (shopData: IShopArgs): string => {
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

export const existsByAddress = async (shopAddress: string, provider: ethers.providers.Provider): Promise<boolean> => {
  validate.ethAddress(shopAddress);

  const shopInstance: ethers.Contract = await contract.get(provider, DetherContract.Shops);
  const shopExists: boolean = await shopInstance.shopByAddrExists(shopAddress);
  return shopExists;
};

export const getShopByAddress = async (shopAddress: string, provider: ethers.providers.Provider): Promise<IShop> => {
  validate.ethAddress(shopAddress);

  const shopInstance: ethers.Contract = await contract.get(provider, DetherContract.Shops);
  const shop: IShop = shopArrToObj(await shopInstance.getShopByAddr(shopAddress));
  return shop;
};

export const getShopByPosition = async (geohash12: string, provider: ethers.providers.Provider): Promise<IShop> => {
  validate.geohash(geohash12, 12);

  const shopInstance = await contract.get(provider, DetherContract.Shops);
  const shop = shopArrToObj(await shopInstance.getShopByPos(convert.asciiToHex(geohash12).substring(0, 26)));
  return shop;
};

export const getShopsInZone = async (geohash6: string, provider: ethers.providers.Provider): Promise<IShop[]> => {
  validate.geohash(geohash6, 6);

  const shopInstance: ethers.Contract = await contract.get(provider, DetherContract.Shops);
  const shopAddressesInZone: string[] = await shopInstance.getShopAddressesInZone(util.stringToBytes(geohash6.slice(0, 6), 6));
  return Promise.all(shopAddressesInZone.map((shopAddress: string): Promise<IShop> => getShopByAddress(shopAddress, provider)));
};

// -------------------- //
//        Setters       //
// -------------------- //

// ERC223
export const addShop = async (shopData: IShopArgs, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  validate.countryCode(shopData.country);
  validate.geohash(shopData.position, 12);
  // other 4 args are optional strings: category, name, description, opening

  const shopContract = await contract.get(wallet.provider, DetherContract.Shops);
  const detherTokenContract = await contract.get(wallet.provider, DetherContract.DetherToken, undefined, [constants.ERC223_TRANSFER_ABI]);
  const licensePrice = await shopContract.countryLicensePrice(util.stringToBytes(shopData.country, 2));
  return detherTokenContract.connect(wallet).transfer(shopContract.address, licensePrice, createShopBytes(shopData), txOptions); // erc223 call
};

// currently 1 address can only own 1 shop
export const removeShop = async (wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  const shopContract = await contract.get(wallet.provider, DetherContract.Shops);
  const shopExists = await shopContract.shopByAddrExists(wallet.address);
  if (!shopExists) throw new Error('wallet address not registered as shop');
  const shopInstance = shopContract.connect(wallet, txOptions);
  return shopInstance.removeShop();
};
