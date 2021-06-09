import { ethers } from "ethers";

import * as constants from "../constants";

import * as convert from "../helpers/convert";
import * as util from "../helpers/util";
import * as validate from "../helpers/validate";
import * as contract from "../helpers/contracts";

import { DetherContract, IShop, IShopArgs, ITxOptions } from "../types";

const SHOP_ADD_FN = "30";

// -------------------- //
//       Formatters     //
// -------------------- //

export const shopArrToObj = (shopArr: any): IShop => {
  const shopObj: IShop = {
    position: "",
    zoneGeohash: "",
    category: "",
    name: "",
    description: "",
    opening: "",
    // hasDispute: false,
    // disputeID: undefined,
    staked: "",
  };

  try {
    shopObj.position = convert.hexToAscii(shopArr[0]);
  } catch (e) {
    shopObj.position = "ujxs37uuuuuu";
  }
  try {
    shopObj.zoneGeohash = convert.hexToAscii(
      `0x${convert.remove0x(shopArr[0]).slice(0, 12)}`
    );
  } catch (e) {
    shopObj.zoneGeohash = "ujxs37";
  }
  try {
    shopObj.category =
      shopArr[1] !== constants.BYTES16_ZERO
        ? convert.hexToAscii(shopArr[1])
        : undefined;
  } catch (e) {
    console.log("error shopArrToObj category ", e, shopArr[1]);
    shopObj.category = "--";
  }

  try {
    shopObj.name =
      shopArr[2] !== constants.BYTES16_ZERO
        ? convert.hexToAscii(shopArr[2])
        : "--";
  } catch (error) {
    console.log("error shopArrToObj name ", error, shopArr[2]);
    shopObj.name = "--";
  }

  try {
    shopObj.description =
      shopArr[3] !== constants.BYTES32_ZERO && convert.hexToAscii(shopArr[3])
        ? convert.hexToAscii(shopArr[3])
        : "--";
  } catch (error) {
    console.log("error shopArrToObj description ", error, shopArr[3]);
    shopObj.description = "--";
  }

  try {
    shopObj.opening =
      shopArr[4] !== constants.BYTES16_ZERO
        ? convert.hexToAscii(shopArr[4])
        : "WWWWWWWWWWWWWW";
  } catch (e) {
    shopObj.opening = "--";
  }
  try {
    shopObj.staked = ethers.utils.formatEther(shopArr[5].toString());
    shopObj.lastTaxTime = Number(shopArr[6]);
    shopObj.selfZonePrice = ethers.utils.formatEther(shopArr[7]);
  } catch (e) {
    console.log("error get shop ", e);
  }
  return shopObj;
};

// to send as erc233 call data, which calls shop.tokenFallback
export const createShopBytes = (shopData: IShopArgs): string => {
  const data = [
    SHOP_ADD_FN,
    util.toNBytes(shopData.country, 2),
    util.toNBytes(shopData.position, 12),
    shopData.category
      ? util.toNBytes(shopData.category, 16)
      : util.remove0x(constants.BYTES16_ZERO),
    shopData.name
      ? util.toNBytes(shopData.name, 16)
      : util.remove0x(constants.BYTES16_ZERO),
    shopData.description
      ? util.toNBytes(shopData.description, 32)
      : util.remove0x(constants.BYTES32_ZERO),
    shopData.opening
      ? util.toNBytes(shopData.opening, 16)
      : util.remove0x(constants.BYTES16_ZERO),
  ].join("");

  return `0x${data}`;
};

// to send as erc233 call data, which calls shop.tokenFallback
export const createShopTopUpBytes = (): string => {
  return `0x31${util.toNBytes("0", 94)}`;
};

// -------------------- //
//        Getters       //
// -------------------- //

export const existsByAddress = async (
  shopAddress: string,
  shopInstance: ethers.Contract
): Promise<boolean> => {
  validate.ethAddress(shopAddress);

  const shopExists: boolean = await shopInstance.shopByAddrExists(shopAddress);
  return shopExists;
};

// untested
export const getLicencePrice = async (
  geohash6: string,
  shopInstance: ethers.Contract
): Promise<any> => {
  validate.geohash(geohash6, 6);
  try {
    let priceRaw = await shopInstance.zoneLicencePrice(
      `0x${util.toNBytes(geohash6, 6)}`
    );
    let price;
    if (Number(ethers.utils.formatEther(priceRaw)) <= 42) {
      price = "42";
    } else {
      price = ethers.utils.formatEther(priceRaw);
    }
    return price;
  } catch (e) {
    console.log("erreur getLicencePrice()", e);
  }
};

export const getShopByAddress = async (
  shopAddress: string,
  shopInstance: ethers.Contract
): Promise<IShop> => {
  validate.ethAddress(shopAddress);
  const shop: IShop = shopArrToObj(
    await shopInstance.getShopByAddr(shopAddress)
  );
  shop.address = shopAddress;
  if (shop.zoneGeohash) {
    const licencePrice = await getLicencePrice(shop.zoneGeohash, shopInstance);
    shop.zonePrice = licencePrice;
  }
  return shop;
};

// Do not return neither address or shopZonePrice
export const getShopByPosition = async (
  geohash12: string,
  shopInstance: ethers.Contract
): Promise<IShop> => {
  validate.geohash(geohash12, 12);

  const shop = shopArrToObj(
    await shopInstance.getShopByPos(
      convert.asciiToHex(geohash12).substring(0, 26)
    )
  );
  return shop;
};

export const getShopsInZone = async (
  geohash6: string,
  shopInstance: ethers.Contract
): Promise<IShop[]> => {
  validate.geohash(geohash6, 6);
  const shopAddressesInZone: string[] = await shopInstance.getShopAddressesInZone(
    util.stringToBytes(geohash6.slice(0, 6), 6)
  );

  return Promise.all(
    shopAddressesInZone.map(
      (shopAddress: string): Promise<IShop> =>
        getShopByAddress(shopAddress, shopInstance)
    )
  );
};

export const getShopsInZones = async (
  geohash6List: string[],
  shopInstance: ethers.Contract
): Promise<IShop[][]> =>
  Promise.all(
    geohash6List.map(
      (geohash6: string): Promise<IShop[]> =>
        getShopsInZone(geohash6, shopInstance)
    )
  );

// -------------------- //
//        Setters       //
// -------------------- //

// ERC223
export const addShop = async (
  shopData: IShopArgs,
  shopContract: ethers.Contract,
  detherTokenContract: ethers.Contract,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.countryCode(shopData.country);
  validate.geohash(shopData.position, 12);
  validate.zonePrice(shopData.staking);
  // other 4 args are optional strings: category, name, description, opening
  return detherTokenContract
    .connect(wallet)
    .transferAndCall(
      shopContract.address,
      ethers.utils.parseEther(shopData.staking),
      createShopBytes(shopData),
      txOptions
    ); // erc223 call
};

// currently 1 address can only own 1 shop
export const removeShop = async (
  shopContract: ethers.Contract,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  const shopExists = await shopContract.shopByAddrExists(wallet.address);
  if (!shopExists) throw new Error("wallet address not registered as shop");
  return shopContract.connect(wallet).removeShop(txOptions);
};

export const topUpShop = async (
  topUpAmount: string,
  shopContract: ethers.Contract,
  detherTokenContract: ethers.Contract,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  return detherTokenContract.connect(wallet).transferAndCall(
    shopContract.address,
    ethers.utils.parseEther(topUpAmount),
    `0x31${util.toNBytes("0", 94)}`, // shop's tokenFallback need 95 bytes as data
    txOptions
  ); // erc223 call
};

export const setShopLicencePrice = async (
  geohash6: string,
  newPrice: string,
  shopContract: ethers.Contract,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  return shopContract
    .connect(wallet)
    .setZoneLicensePrice(
      `0x${util.toNBytes(geohash6, 6)}`,
      ethers.utils.parseEther(newPrice),
      txOptions
    );
};

export const collectShopTaxes = async (
  geohash6: string,
  start: number,
  end: number,
  shopContract: ethers.Contract,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  return shopContract
    .connect(wallet)
    .collectTax(`0x${util.toNBytes(geohash6, 6)}`, start, end, txOptions);
};

export const deleteUserShop = async (
  geohash6: string,
  shopAddress: string,
  shopContract: ethers.Contract,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  return shopContract
    .connect(wallet)
    .removeShopFromZoneOwner(
      shopAddress,
      `0x${util.toNBytes(geohash6, 6)}`,
      txOptions
    );
};
