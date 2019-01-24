import { ethers } from 'ethers';

import * as util from '../helpers/util';
import * as validate from '../helpers/validate';
import * as contract from '../helpers/contracts';

import {
  DetherContract,
  ITeller, ITellerArgs, IDate,
} from '../types';

const EMPTY_MESSENGER_FIELD = '0x00000000000000000000000000000000';

// -------------------- //
//      Formatters      //
// -------------------- //

export const tellerArrToObj = (geohash7: string, zoneAddr: string, tellerArr: any[]) : ITeller => {
  const isSeller = tellerArr[3][7] === '1';
  const isBuyer = tellerArr[3][6] === '1';

  return {
    isSeller,
    isBuyer,
    currencyId: tellerArr[0].toNumber(),
    tellerGeohash: util.toUtf8(tellerArr[2]), // geohash 12 chars long
    zoneAddress: zoneAddr,
    zoneGeohash: geohash7,
    balance: ethers.utils.formatEther(tellerArr[6]),
    // optional
    messenger: tellerArr[1] !== EMPTY_MESSENGER_FIELD && util.toUtf8(tellerArr[1]),
    buyRate: isBuyer && tellerArr[4].toNumber(),
    sellRate: isSeller && tellerArr[5].toNumber(),
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

  const zoneFactoryInstance = await contract.get(provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryInstance.geohashToZone(util.stringToBytes(geohash7, 7));
  const zoneInstance = await contract.get(provider, DetherContract.Zone, zoneAddress);
  const teller = tellerArrToObj(geohash7, zoneAddress, await zoneInstance.getTeller());
  return teller;
};

export const getTellersInZones = async (geohash7List: string[], provider: ethers.providers.Provider) : Promise<ITeller[]> => {
  const tellers = await Promise.all(geohash7List.map((geohash7: string) : Promise<ITeller> => getTellerInZone(geohash7, provider)));
  return tellers;
};

// -------------------- //
//        Setters       //
// -------------------- //

export const addTeller = async (zoneAddress: string, tellerData: ITellerArgs, wallet: ethers.Wallet) : Promise<ethers.ContractTransaction> => {
  validate.ethAddress(zoneAddress);
  validate.geohash(tellerData.position, 12);
  validate.currencyId(tellerData.currencyId);
  validate.tellerBuyerInfo(tellerData.isBuyer, tellerData.buyRate);
  validate.tellerSellerInfo(tellerData.isSeller, tellerData.sellRate);
  if (tellerData.messenger) validate.telegramUsername(tellerData.messenger);

  const tellerSettings = settingsToBytes(tellerData.isBuyer, tellerData.isSeller);

  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);
  const zoneInstance = zoneContract.connect(wallet);

  return zoneInstance.addTeller(
    util.stringToBytes(tellerData.position, 10),
    tellerData.currencyId,
    tellerData.messenger ? util.stringToBytes(tellerData.messenger, 16) : EMPTY_MESSENGER_FIELD,
    tellerData.sellRate,
    tellerData.buyRate,
    tellerSettings,
  );
};

export const removeTeller = async (zoneAddress: string, wallet: ethers.Wallet) : Promise<ethers.ContractTransaction> => {
  validate.ethAddress(zoneAddress);

  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);
  const zoneInstance = zoneContract.connect(wallet);

  return zoneInstance.removeTeller();
};

export const addFunds = async (zoneAddress: string, ethAmount: string, wallet: ethers.Wallet) : Promise<ethers.ContractTransaction> => {
  validate.ethAddress(zoneAddress);

  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);
  const zoneInstance = zoneContract.connect(wallet);

  // TODO: check that wallet address has enough eth balance + is a teller

  const tx = zoneInstance.addFunds({ value: ethers.utils.parseEther(ethAmount) });
  return tx;
};

export const sellEth = async (zoneAddress: string, recipient: string, ethAmount: string, wallet: ethers.Wallet) : Promise<ethers.ContractTransaction> => {
  validate.ethAddress(zoneAddress);
  validate.ethAddress(recipient);

  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);
  const zoneInstance = zoneContract.connect(wallet);

  const fundsInZone = await zoneInstance.funds(wallet.address);
  if (fundsInZone.lt(ethAmount)) throw new Error('not enough funds in zone');
  // TODO: check that wallet address has enough funds in the zone contract + is a teller

  const tx = zoneInstance.sellEth(recipient, ethAmount);
  return tx;
};

// --- Comments

export const addComment = async (zoneAddress: string, commentHash: string, wallet: ethers.Wallet) : Promise<ethers.ContractTransaction> => {
  validate.ethAddress(zoneAddress);

  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);
  const zoneInstance = zoneContract.connect(wallet);

  // TODO: check that wallet address is allowed to place a comment

  return zoneInstance.addComment(util.ipfsHashToBytes32(commentHash));
};

export const addCertifiedComment = async (zoneAddress: string, commentHash: string, wallet: ethers.Wallet) : Promise<ethers.ContractTransaction> => {
  validate.ethAddress(zoneAddress);

  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);
  const zoneInstance = zoneContract.connect(wallet);

  // TODO: check that wallet address is allowed to place a certified comment

  return zoneInstance.addCertifiedComment(util.ipfsHashToBytes32(commentHash));
};
