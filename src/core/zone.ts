import { ethers } from 'ethers';

import * as constants from '../constants';
import * as util from '../helpers/util';
import * as convert from '../helpers/convert';
import * as validate from '../helpers/validate';
import * as contract from '../helpers/contracts';

import {
  DetherContract, ZoneAuctionState, ZoneStatus,
  IZoneAuction, IZoneOwner, ITxOptions, IZone,
} from '../types';

const ZONE_CREATE_FN = '40';

// -------------------- //
//      Formatters      //
// -------------------- //

export const zoneOwnerArrToObj = (onchainZoneOwner: any[]) : IZoneOwner => ({
  address: onchainZoneOwner[0],
  startTime: onchainZoneOwner[1].toNumber(),
  staked: onchainZoneOwner[2].toString(),
  balance: onchainZoneOwner[3].toString(),
  lastTaxTime: onchainZoneOwner[4].toNumber(),
  auctionId: onchainZoneOwner[5].toNumber() > 0 ? onchainZoneOwner[5] : undefined,
});

// const hasEnded = util.timestampNow() >= onchainZoneAuction[3].toNumber();

export const zoneAuctionArrToObj = (onchainZoneAuction: any[]) : IZoneAuction => ({
  id: onchainZoneAuction[0].toNumber(),
  state: onchainZoneAuction[1].toNumber(),
  startTime: onchainZoneAuction[2].toNumber(),
  endTime: onchainZoneAuction[3].toNumber(),
  highestBidder: onchainZoneAuction[4] !== constants.ADDRESS_ZERO ? onchainZoneAuction[4] : undefined, 
  highestBid: onchainZoneAuction[5].toString(), 
});

const createZoneBytes = (country: string, geohash7: string) : string => {
  const data = [
    ZONE_CREATE_FN,
    util.toNBytes(country, 2),
    util.toNBytes(geohash7, 7),
  ].join('');

  return `0x${data}`;
};

const checkForeclosure = async (beginTime: number, endTime: number, balance: string, zoneContract: ethers.Contract) : Promise<boolean> => {
  if (beginTime >= endTime) return false;
  const [, taxesDue] = await zoneContract.calcHarbergerTax(beginTime, endTime, balance);
  return taxesDue.gte(balance);
};

export const toLiveZone = async (zoneAddress: string, geohash7: string, zoneContract: ethers.Contract, zoneOwner: IZoneOwner, lastAuction: IZoneAuction) : Promise<any> => {
  let zoneStatus: ZoneStatus;

  if (zoneOwner.startTime === 0) zoneStatus = ZoneStatus.Claimable;
  else {
    const now = util.timestampNow();
    // TODO: calc harberger tax locally
    if (lastAuction.id === 0 || lastAuction.state === ZoneAuctionState.ended) { 
      // there is NO active auction, check zoneowner tax payments
      if (zoneOwner.lastTaxTime >= now) zoneStatus = ZoneStatus.Occupied;
      else {
        const [, taxesDue] = await zoneContract.calcHarbergerTax(zoneOwner.lastTaxTime, now, zoneOwner.balance);
        if (taxesDue.gte(zoneOwner.balance)) zoneStatus = ZoneStatus.Claimable;
        else zoneStatus = ZoneStatus.Occupied;
      }
    } else {
      // there is an active auction

      // check if auction is still open
      if (now < lastAuction.endTime) zoneStatus = ZoneStatus.Occupied;
      else {  
        // this auction has actually ended
        lastAuction.state = ZoneAuctionState.ended;

        if (zoneOwner.address === lastAuction.highestBidder) {
          // winner is current zone owner
          zoneOwner.auctionId = lastAuction.id;
          zoneOwner.staked = ethers.utils.bigNumberify(zoneOwner.staked).add(lastAuction.highestBid).toString();
          zoneOwner.balance = ethers.utils.bigNumberify(zoneOwner.balance).add(lastAuction.highestBid).toString();
          if (zoneOwner.lastTaxTime >= now) zoneStatus = ZoneStatus.Occupied;
          else {
            const [, taxesDue] = await zoneContract.calcHarbergerTax(lastAuction.endTime, now, zoneOwner.balance);
            // zone owner needs to pay harberger taxes, but dows not have enough balance
            if (taxesDue.gte(zoneOwner.balance)) zoneStatus = ZoneStatus.Claimable;
            else zoneStatus = ZoneStatus.Occupied;
          }
          // zone owner can pay for his taxes
        } else {
          // winner is NOT the current zone owner
          zoneOwner.address = lastAuction.highestBidder;
          zoneOwner.startTime = lastAuction.endTime;
          zoneOwner.staked = lastAuction.highestBid;
          zoneOwner.balance = lastAuction.highestBid;
          zoneOwner.lastTaxTime = now;
          zoneOwner.auctionId = lastAuction.id;
          if (zoneOwner.lastTaxTime >= now) zoneStatus = ZoneStatus.Occupied;
          else {
            const [, taxesDue] = await zoneContract.calcHarbergerTax(lastAuction.endTime, now, zoneOwner.balance);
            // zone owner needs to pay harberger taxes, but dows not have enough balance
            if (taxesDue.gte(zoneOwner.balance)) zoneStatus = ZoneStatus.Claimable;
            else zoneStatus = ZoneStatus.Occupied;
          }
        } 
      }
    }
  }
  return { 
    geohash: geohash7,
    status: zoneStatus, 
    address: zoneAddress,
    owner: zoneOwner.address !== constants.ADDRESS_ZERO ? zoneOwner : undefined,
    auction: lastAuction.id !== 0 ? lastAuction : undefined,
  }
};

// -------------------- //
//        Getters       //
// -------------------- //

export const getZone = async (geohash7: string, provider: ethers.providers.Provider) : Promise<IZone> => {
  validate.geohash(geohash7, 7);
  const zoneFactoryContract = await contract.get(provider, DetherContract.ZoneFactory);
  const zoneExists = await zoneFactoryContract.zoneExists(convert.asciiToHex(geohash7));
  if (!zoneExists) return { geohash: geohash7, status: ZoneStatus.Inexistent };
  // there exists a zone contract
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash7));
  const zoneContract = await contract.get(provider, DetherContract.Zone, zoneAddress);
  console.log('here');
  const zoneOwner: IZoneOwner = zoneOwnerArrToObj(await zoneContract.getZoneOwner());
  const lastAuction: IZoneAuction = zoneAuctionArrToObj(await zoneContract.getLastAuction());
  return toLiveZone(zoneAddress, geohash7, zoneContract, zoneOwner, lastAuction); 
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
