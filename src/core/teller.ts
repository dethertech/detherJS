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

export const tellerArrToObj = (zoneAddr: string, tellerArr: any[]) : ITeller => {
  const settingsInt = parseInt(tellerArr[3], 16);
  const isSeller = (settingsInt & 1) > 0;
  const isBuyer = (settingsInt & 2) > 0;
  return {
    isSeller,
    isBuyer,
    currencyId: tellerArr[0],
    tellerGeohash: convert.hexToAscii(tellerArr[2]), // geohash 12 chars long
    zoneAddress: zoneAddr,
    zoneGeohash: convert.hexToAscii(tellerArr[2]).slice(0, 7),
    // optional
    buyRate: isBuyer ? tellerArr[4] : 0,
    sellRate: isSeller ? tellerArr[5] : 0,
    funds: isSeller ? tellerArr[6].toNumber() : 0,
    referrer: tellerArr[7] !== constants.ADDRESS_ZERO ? tellerArr[7] : undefined,
    messenger: tellerArr[1] !== EMPTY_MESSENGER_FIELD ? convert.hexToAscii(tellerArr[1]) : undefined,
  };
};

export const settingsToBytes = (isBuyer: boolean, isSeller: boolean) : string => {
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

export const getTellerInZone = async (geohash7: string, provider: ethers.providers.Provider) : Promise<ITeller> => {
  validate.geohash(geohash7, 7);

  const zoneFactoryContract = await contract.get(provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash7));
  const zoneInstance = await contract.get(provider, DetherContract.Zone, zoneAddress);
  return tellerArrToObj(zoneAddress, await zoneInstance.getTeller());
};

export const getTellersInZones = async (geohash7List: string[], provider: ethers.providers.Provider) : Promise<ITeller[]> => (
  Promise.all(geohash7List.map((geohash7: string) : Promise<ITeller> => getTellerInZone(geohash7, provider)))
);

// -------------------- //
//        Setters       //
// -------------------- //

// tellerData contains the zone geohash, the first 7 characters of tellerData.position
export const addTeller = async (tellerData: ITellerArgs, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.geohash(tellerData.position, 12);
  validate.currencyId(tellerData.currencyId);
  validate.tellerBuyerInfo(tellerData.isBuyer, tellerData.buyRate);
  validate.tellerSellerInfo(tellerData.isSeller, tellerData.sellRate);

  if (tellerData.messenger) validate.telegramUsername(tellerData.messenger);
  if (tellerData.referrer) validate.ethAddress(tellerData.referrer);

  const tellerSettings = settingsToBytes(tellerData.isBuyer, tellerData.isSeller);

  const geohash7 = tellerData.position.slice(0, 7);
  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(util.stringToBytes(geohash7, 7));
  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);

  return zoneContract.connect(wallet).addTeller(
    util.stringToBytes(tellerData.position, 12),
    tellerData.currencyId,
    tellerData.messenger ? util.stringToBytes(tellerData.messenger, 16) : EMPTY_MESSENGER_FIELD,
    tellerData.sellRate,
    tellerData.buyRate,
    tellerSettings,
    tellerData.referrer || constants.ADDRESS_ZERO,
    txOptions,
  );
};

export const removeTeller = async (zoneGeohash: string, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.geohash(zoneGeohash, 7);

  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(zoneGeohash));
  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);

  return zoneContract.connect(wallet).removeTeller(txOptions);
};

// ethAmount in wei
export const addFunds = async (zoneGeohash: string, ethAmount: string, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.geohash(zoneGeohash, 7);

  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(zoneGeohash));
  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);

  const ethAmountBN = ethers.utils.parseUnits(ethAmount, 'wei');
  // TODO: check that wallet address has enough eth balance + is a teller

  return zoneContract.connect(wallet).addFunds({ ...txOptions, value: ethAmountBN });
};

export const sellEth = async (zoneGeohash: string, recipient: string, ethAmount: string, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.geohash(zoneGeohash, 7);
  validate.ethAddress(recipient);

  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(zoneGeohash));
  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);

  const ethAmountBN = ethers.utils.parseUnits(ethAmount, 'wei');

  const fundsInZone = await zoneContract.funds(wallet.address);
  if (fundsInZone.lt(ethAmountBN)) throw new Error('not enough funds in zone');
  // TODO: check that wallet address has enough funds in the zone contract + is a teller

  return zoneContract.connect(wallet).sellEth(recipient, ethAmountBN, txOptions);
};

// --- Comments

export const addComment = async (zoneGeohash: string, ipfsHash: string, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.geohash(zoneGeohash, 7);

  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(zoneGeohash));
  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);

  // TODO: check that wallet address is allowed to place a comment

  return zoneContract.connect(wallet).addComment(util.ipfsHashToBytes32(ipfsHash), txOptions);
};

export const addCertifiedComment = async (zoneGeohash: string, ipfsHash: string, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.geohash(zoneGeohash, 7);

  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(zoneGeohash));
  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);

  // TODO: check that wallet address is allowed to place a certified comment

  return zoneContract.connect(wallet).addCertifiedComment(util.ipfsHashToBytes32(ipfsHash), txOptions);
};
