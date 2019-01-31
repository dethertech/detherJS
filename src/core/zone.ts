import { ethers } from 'ethers';

import * as constants from '../constants';
import * as util from '../helpers/util';
import * as convert from '../helpers/convert';
import * as validate from '../helpers/validate';
import * as contract from '../helpers/contracts';

import {
  DetherContract, ZoneAuctionState,
  IZoneAuction, IZoneOwner, ITxOptions, IZone,
} from '../types';

const ZONE_CREATE_FN = '40';

// -------------------- //
//      Formatters      //
// -------------------- //

export const zoneOwnerArrToObj = (onchainZoneOwner: any[]) : IZoneOwner => ({
  address: onchainZoneOwner[0].toNumber(), // positive incrementing integer
  startTime: onchainZoneOwner[1].toNumber(), // timestamp
  staked: onchainZoneOwner[2].toString(), // eth amount in wei (18 decimals)
  balance: onchainZoneOwner[3].toString(), // eth amount in wei (18 decimals)
  lastTaxTime: onchainZoneOwner[4], // timestamp
});

export const zoneAuctionArrToObj = (onchainZoneAuction: any[]) : IZoneAuction => {
  const hasEnded = util.timestampNow() >= onchainZoneAuction[3].toNumber();

  return {
    id: onchainZoneAuction[0].toNumber(), // positive incrementing integer
    state: hasEnded ? ZoneAuctionState.ended : ZoneAuctionState.started, // 0 or 1
    startTime: onchainZoneAuction[2].toNumber(), // timestamp
    endTime: onchainZoneAuction[3].toNumber(), // timestamp
    highestBidder: onchainZoneAuction[4], // address
    highestBid: onchainZoneAuction[5].toString(), // eth amount in wei
  };
};

const createZoneBytes = (country: string, geohash7: string) : string => {
  const data = [
    ZONE_CREATE_FN,
    util.toNBytes(country, 2),
    util.toNBytes(geohash7, 7),
  ].join('');

  return `0x${data}`;
};

// -------------------- //
//        Getters       //
// -------------------- //

export const getZone = async (geohash7: string, provider: ethers.providers.Provider) : Promise<IZone> => {
  validate.geohash(geohash7, 7);

  const zoneFactoryContract = await contract.get(provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash7));
  const zoneContract = await contract.get(provider, DetherContract.Zone, zoneAddress);

  const [zoneOwner, zoneAuction] = await Promise.all([
    zoneContract.getZoneOwner(),
    zoneContract.getLastAuction(),
  ]);
  console.log({
    zoneOwner, zoneAuction,
  });
  return true;

  // return zoneContract.getZoneOwner(auctionId, txOptions);
};

// -------------------- //
//        Setters       //
// -------------------- //

// ERC223
export const create = async (country: string, geohash7: string, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.countryCode(country);
  validate.geohash(geohash7, 7);

  const detherTokenContract = await contract.get(wallet.provider, DetherContract.DetherToken, undefined, [constants.ERC223_TRANSFER_ABI]);
  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);

  if (!txOptions.gasLimit) txOptions.gasLimit = 450000;
  return detherTokenContract.connect(wallet).functions.transfer(zoneFactoryContract.address, convert.ethToWei(constants.MIN_ZONE_STAKE), createZoneBytes(country, geohash7), txOptions); // erc223 call
};

// ERC223
export const claimFree = async(geohash7: string, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash7, 7);

  const detherTokenContract = await contract.get(wallet.provider, DetherContract.DetherToken, undefined, [constants.ERC223_TRANSFER_ABI]);
  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash7));

  return detherTokenContract.connect(wallet).transfer(zoneAddress, convert.ethToWei(constants.MIN_ZONE_STAKE), '0x41', txOptions); // erc223 call
};

// ERC223
export const bid = async(geohash7: string, bidAmount: string, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash7, 7);

  const detherTokenContract = await contract.get(wallet.provider, DetherContract.DetherToken, undefined, [constants.ERC223_TRANSFER_ABI]);
  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash7));
  return detherTokenContract.connect(wallet).transfer(zoneAddress, bidAmount, '0x42', txOptions); // erc223 call
};

// ERC223
export const topUp = async(geohash7: string, topUpAmount: string, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash7, 7);

  const detherTokenContract = await contract.get(wallet.provider, DetherContract.DetherToken, undefined, [constants.ERC223_TRANSFER_ABI]);
  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash7));
  return detherTokenContract.connect(wallet).transfer(zoneAddress, topUpAmount, '0x43', txOptions); // erc223 call
};

export const release = async(geohash7: string, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash7, 7);

  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash7));
  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);
  return zoneContract.connect(wallet).release(txOptions);
};

export const withdrawFromAuction = async(geohash7: string, auctionId: number, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash7, 7);

  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash7));
  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);
  return zoneContract.connect(wallet).withdrawFromAuction(auctionId, txOptions);
};

export const withdrawFromAuctions = async(geohash7: string, auctionIds: number[], wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash7, 7);

  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash7));
  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);
  return zoneContract.connect(wallet).withdrawFromAuctions(auctionIds, txOptions);
};

export const withdrawDth = async(geohash7: string, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash7, 7);

  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash7));
  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);
  return zoneContract.connect(wallet).withdrawDth(txOptions);
};

export const withdrawEth = async(geohash7: string, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash7, 7);

  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash7));
  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);
  return zoneContract.connect(wallet).withdrawEth(txOptions);
};
