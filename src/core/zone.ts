import { ethers } from 'ethers';

import * as constants from '../constants';
import * as util from '../helpers/util';
import * as convert from '../helpers/convert';
import * as validate from '../helpers/validate';
import * as contract from '../helpers/contracts';

import {
  DetherContract, ZoneAuctionState,
  IZoneAuction, IZoneOwner, ITxOptions,
} from '../types';

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

// -------------------- //
//        Setters       //
// -------------------- //

export const create = async(country: string, geohash7: string, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.countryCode(country);
  validate.geohash(geohash7, 7);

  const detherTokenContract = await contract.get(wallet.provider, DetherContract.DetherToken);
  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const data = `0x40${convert.remove0x(convert.asciiToHex(country))}${convert.remove0x(convert.asciiToHex(geohash7))}`;
  console.log({ data });
  const myBalance = await wallet.getBalance();
  console.log('eth', convert.weiToEth(myBalance.toString()));
  console.log('dth', convert.weiToEth((await detherTokenContract.balanceOf(wallet.address)).toString()));
  console.log('cost dth', constants.MIN_ZONE_STAKE);
  console.log('args', [zoneFactoryContract.address, convert.ethToWei(constants.MIN_ZONE_STAKE), data, data.length, txOptions]);
  return detherTokenContract.connect(wallet).transfer(zoneFactoryContract.address, convert.ethToWei(constants.MIN_ZONE_STAKE), '0x1337'); // erc223 call
};

export const claimFree = async(geohash7: string, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash7, 7);

  const detherTokenContract = await contract.get(wallet.provider, DetherContract.DetherToken);
  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash7));

  return detherTokenContract.connect(wallet).transfer(zoneAddress, convert.ethToWei(constants.MIN_ZONE_STAKE), '0x41', txOptions); // erc223 call
};

export const bid = async(geohash7: string, bidAmount: string, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash7, 7);

  const detherTokenContract = await contract.get(wallet.provider, DetherContract.DetherToken);
  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash7));
  return detherTokenContract.connect(wallet).transfer(zoneAddress, bidAmount, '0x42', txOptions); // erc223 call
};

export const topUp = async(geohash7: string, topUpAmount: string, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash7, 7);

  const detherTokenContract = await contract.get(wallet.provider, DetherContract.DetherToken);
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
