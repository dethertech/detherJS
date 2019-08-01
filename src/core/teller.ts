import { ethers } from 'ethers';

import * as constants from '../constants';
import * as util from '../helpers/util';
import * as validate from '../helpers/validate';
import * as convert from '../helpers/convert';
import * as contract from '../helpers/contracts';

import {
  DetherContract,
  ITeller, ITellerArgs, IDate, ITxOptions,
} from '../types';

const EMPTY_MESSENGER_FIELD = '0x00000000000000000000000000000000';

// -------------------- //
//      Formatters      //
// -------------------- //

export const tellerArrToObj = (zoneAddr: string, tellerContractAddr: string, tellerArr: any[]): ITeller => {
  const settingsInt = parseInt(tellerArr[4], 16);
  const isSeller = (settingsInt & 1) > 0;
  const isBuyer = (settingsInt & 2) > 0;
  const description = convert.hexToAscii(tellerArr[8]).split('-');
  return {
    isSeller,
    isBuyer,
    currencyId: tellerArr[1],
    tellerGeohash: convert.hexToAscii(tellerArr[3]), // geohash 12 chars long
    zoneAddress: zoneAddr,
    zoneGeohash: convert.hexToAscii(tellerArr[3]).slice(0, 6),
    // optional
    buyRate: isBuyer ? tellerArr[5] / 100 : 0,
    sellRate: isSeller ? tellerArr[6] / 100 : 0,
    referrer: tellerArr[7] !== constants.ADDRESS_ZERO ? tellerArr[7] : undefined,
    messenger: tellerArr[2] !== EMPTY_MESSENGER_FIELD ? convert.hexToAscii(tellerArr[2]) : undefined,
    tellerAddress: tellerArr[0],
    tellerContractAddress: tellerContractAddr,
    sellUp: description.length == 3 ? description[0] : '?',
    buyUp: description.length == 3 ? description[1] : '?',
    ticker: description.length == 3 ? description[2] : '',
  };
};

export const settingsToBytes = (isBuyer: boolean, isSeller: boolean): string => {
  let settings = '0x0';
  if (isBuyer && isSeller) settings += '3';
  else if (isBuyer) settings += '2';
  else if (isSeller) settings += '1';
  else settings += '0';
  return settings;
};

// -------------------- //
//        Getters       //
// -------------------- //

export const getTellerInZone = async (geohash6: string, provider: ethers.providers.Provider): Promise<any> => {
  validate.geohash(geohash6, 6);
  let zoneAddress, tellerAddress, tellerInstance;
  try {
    const zoneFactoryContract = await contract.get(provider, DetherContract.ZoneFactory);
    zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash6).substring(0, 14));
    const zoneInstance = await contract.get(provider, DetherContract.Zone, zoneAddress);
    tellerAddress = await zoneInstance.teller();
    tellerInstance = await contract.get(provider, DetherContract.Teller, tellerAddress);
  } catch {
    return {};
  }

  return tellerArrToObj(zoneAddress, tellerAddress, await tellerInstance.getTeller());
};

export const getTellersInZones = async (geohash6List: string[], provider: ethers.providers.Provider): Promise<any[]> => (
  Promise.all(geohash6List.map((geohash6: string): Promise<ITeller> => getTellerInZone(geohash6, provider)))
);


export const isTeller = async (address: string, provider: ethers.providers.Provider): Promise<any> => {
  validate.ethAddress(address);
  let zoneAddress, tellerAddress, tellerInstance;
  try {
    const zoneFactoryContract = await contract.get(provider, DetherContract.ZoneFactory);
    zoneAddress = await zoneFactoryContract.ownerToZone(address);
    // if (zoneAddr)
    const zoneInstance = await contract.get(provider, DetherContract.Zone, zoneAddress);
    tellerAddress = await zoneInstance.teller();
    tellerInstance = await contract.get(provider, DetherContract.Teller, tellerAddress);
  } catch {
    return false
  }
  const teller = tellerArrToObj(zoneAddress, tellerAddress, await tellerInstance.getTeller());
  return teller.tellerAddress;
}

// -------------------- //
//        Setters       //
// -------------------- //

// tellerData contains the zone geohash, the first 6 characters of tellerData.position
export const addTeller = async (tellerData: ITellerArgs, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  validate.geohash(tellerData.position, 12);
  validate.currencyId(tellerData.currencyId);
  validate.tellerBuyerInfo(tellerData.isBuyer, tellerData.buyRate);
  validate.tellerSellerInfo(tellerData.isSeller, tellerData.sellRate);
  validate.tellerDescrInfo(tellerData.description);

  if (tellerData.refFees) validate.refFees(tellerData.refFees);
  if (tellerData.messenger) validate.telegramUsername(tellerData.messenger);
  if (tellerData.referrer) validate.ethAddress(tellerData.referrer);
  if (tellerData.description) validate.tellerDescrInfo(tellerData.description);
  const tellerSettings = settingsToBytes(tellerData.isBuyer, tellerData.isSeller);

  const geohash6 = tellerData.position.slice(0, 6);
  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(util.stringToBytes(geohash6, 6));
  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);
  const tellerAddress = await zoneContract.teller();
  const tellerContract = await contract.get(wallet.provider, DetherContract.Teller, tellerAddress);

  return tellerContract.connect(wallet).addTeller(
    util.stringToBytes(tellerData.position, 12),
    tellerData.currencyId,
    tellerData.messenger ? util.stringToBytes(tellerData.messenger, 16) : EMPTY_MESSENGER_FIELD,
    tellerData.sellRate,
    tellerData.buyRate,
    tellerSettings,
    tellerData.referrer || constants.ADDRESS_ZERO,
    tellerData.refFees || 0,
    tellerData.description ? util.stringToBytes(tellerData.description, 32) : '',
    txOptions,
  );
};

// tellerData contains the zone geohash, the first 6 characters of tellerData.position

export const updateTeller = async (tellerData: ITellerArgs, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  // console.log('teller update teller', tellerData);
  validate.geohash(tellerData.position, 12);
  validate.currencyId(tellerData.currencyId);
  validate.tellerBuyerInfo(tellerData.isBuyer, tellerData.buyRate);
  validate.tellerSellerInfo(tellerData.isSeller, tellerData.sellRate);
  validate.tellerDescrInfo(tellerData.description);

  if (tellerData.description) validate.tellerDescrInfo(tellerData.description);
  const tellerSettings = settingsToBytes(tellerData.isBuyer, tellerData.isSeller);

  const geohash6 = tellerData.position.slice(0, 6);
  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(util.stringToBytes(geohash6, 6));
  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);
  const tellerAddress = await zoneContract.teller();
  const tellerContract = await contract.get(wallet.provider, DetherContract.Teller, tellerAddress);

  return tellerContract.connect(wallet).updateTeller(
    util.stringToBytes(tellerData.position, 12),
    tellerData.currencyId,
    tellerData.messenger ? util.stringToBytes(tellerData.messenger, 16) : EMPTY_MESSENGER_FIELD,
    tellerData.sellRate,
    tellerData.buyRate,
    tellerSettings,
    tellerData.description ? util.stringToBytes(tellerData.description, 32) : '',
    txOptions,
  );
};

export const removeTeller = async (zoneGeohash: string, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  validate.geohash(zoneGeohash, 6);

  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(zoneGeohash).substring(0, 14));
  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);
  const tellerAddress = await zoneContract.teller();
  const tellerContract = await contract.get(wallet.provider, DetherContract.Teller, tellerAddress);
  return tellerContract.connect(wallet).removeTeller(txOptions);
};

// ethAmount in wei
export const addFunds = async (zoneGeohash: string, ethAmount: string, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  validate.geohash(zoneGeohash, 6);

  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(zoneGeohash).substring(0, 14));
  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);
  const tellerAddress = await zoneContract.teller();
  const tellerContract = await contract.get(wallet.provider, DetherContract.Teller, tellerAddress);
  const ethAmountBN = ethers.utils.parseUnits(ethAmount, 'wei');
  // TODO: check that wallet address has enough eth balance + is a teller

  return tellerContract.connect(wallet).addFunds({ ...txOptions, value: ethAmountBN });
};

// --- Comments

export const addComment = async (zoneGeohash: string, ipfsHash: string, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  validate.geohash(zoneGeohash, 6);

  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(zoneGeohash).substring(0, 14));
  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);
  const tellerAddress = await zoneContract.teller();
  const tellerContract = await contract.get(wallet.provider, DetherContract.Teller, tellerAddress);
  // TODO: check that wallet address is allowed to place a comment

  return tellerContract.connect(wallet).addComment(util.ipfsHashToBytes32(ipfsHash), txOptions);
};
