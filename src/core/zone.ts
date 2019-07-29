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

// -------------------- //
//      Formatters      //
// -------------------- //

export const zoneOwnerArrToObj = (onchainZoneOwner: any[]): IZoneOwner => ({
  address: onchainZoneOwner[0],
  startTime: onchainZoneOwner[1].toNumber(),
  staked: onchainZoneOwner[2].toString(),
  balance: onchainZoneOwner[3].toString(),
  lastTaxTime: onchainZoneOwner[4].toNumber(),
  auctionId: onchainZoneOwner[5].toNumber() > 0 ? onchainZoneOwner[5] : undefined,
});

// const hasEnded = util.timestampNow() >= onchainZoneAuction[3].toNumber();

export const zoneAuctionArrToObj = (onchainZoneAuction: any[]): IZoneAuction => ({
  id: onchainZoneAuction[0].toNumber(),
  state: onchainZoneAuction[1].toNumber(),
  startTime: onchainZoneAuction[2].toNumber(),
  endTime: onchainZoneAuction[3].toNumber(),
  highestBidder: onchainZoneAuction[4] !== constants.ADDRESS_ZERO ? onchainZoneAuction[4] : undefined,
  highestBid: onchainZoneAuction[5].toString(),
});

const createZoneBytes = (country: string, geohash6: string): string => {
  // if (tier.toString().length === 1)
  const data = [
    util.toNBytes(country, 2),
    util.toNBytes(geohash6, 6),
  ].join('');
  return `0x${data}`;
};

const checkForeclosure = async (beginTime: number, endTime: number, balance: string, zoneContract: ethers.Contract): Promise<boolean> => {
  if (beginTime >= endTime) return false;
  const [, taxesDue] = await zoneContract.calcHarbergerTax(beginTime, endTime, balance);
  return taxesDue.gte(balance);
};

export const toLiveZone = async (zoneAddress: string, geohash6: string, zoneContract: ethers.Contract, zoneOwner: IZoneOwner, lastAuction: IZoneAuction): Promise<any> => {
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
    geohash: geohash6,
    status: zoneStatus,
    address: zoneAddress,
    owner: zoneOwner.address !== constants.ADDRESS_ZERO ? zoneOwner : undefined,
    auction: lastAuction.id !== 0 ? lastAuction : undefined,
  }
};

// 
export const toLiveZoneNoBidYet = async (zoneAddress: string, geohash6: string, zoneContract: ethers.Contract, zoneOwner: IZoneOwner): Promise<any> => {
  let zoneStatus: ZoneStatus;

  if (zoneOwner.startTime === 0) zoneStatus = ZoneStatus.Claimable;
  else {
    const now = util.timestampNow();
    // TODO: calc harberger tax locally
    // there is NO active auction, check zoneowner tax payments
    if (zoneOwner.lastTaxTime >= now) zoneStatus = ZoneStatus.Occupied;
    else {
      const [, taxesDue] = await zoneContract.calcHarbergerTax(zoneOwner.lastTaxTime, now, zoneOwner.balance);
      if (taxesDue.gte(zoneOwner.balance)) zoneStatus = ZoneStatus.Claimable;
      else zoneStatus = ZoneStatus.Occupied;
    }
  }
  return {
    geohash: geohash6,
    status: zoneStatus,
    address: zoneAddress,
    owner: zoneOwner.address !== constants.ADDRESS_ZERO ? zoneOwner : undefined,
    auction: undefined,
  }
};

// -------------------- //
//        Getters       //
// -------------------- //

export const getZone = async (geohash6: string, provider: ethers.providers.Provider): Promise<IZone> => {
  validate.geohash(geohash6, 6);
  const zoneFactoryContract = await contract.get(provider, DetherContract.ZoneFactory);
  const zoneExists = await zoneFactoryContract.zoneExists(convert.asciiToHex(geohash6).substring(0, 14));
  if (!zoneExists) return { geohash: geohash6, status: ZoneStatus.Inexistent };
  // there exists a zone contract
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash6).substring(0, 14));
  const zoneContract = await contract.get(provider, DetherContract.Zone, zoneAddress);

  const zoneOwner: IZoneOwner = zoneOwnerArrToObj(await zoneContract.getZoneOwner());
  const auctionID = await zoneContract.currentAuctionId();
  if (auctionID > 0) {
    const lastAuction: IZoneAuction = zoneAuctionArrToObj(await zoneContract.getLastAuction());
    return toLiveZone(zoneAddress, geohash6, zoneContract, zoneOwner, lastAuction);
  } else {
    return toLiveZoneNoBidYet(zoneAddress, geohash6, zoneContract, zoneOwner);
  }
};

export const isZoneOpened = async (geohash6: string, country: string, provider: ethers.providers.Provider): Promise<Boolean> => {
  validate.geohash(geohash6, 6);
  const geoRegistryContract = await contract.get(provider, DetherContract.GeoRegistry);
  const countryOpen = await geoRegistryContract.countryIsEnabled(convert.asciiToHex(geohash6).substring(0, 6));
  if (countryOpen === false) {
    return false
  }
  const zoneAvailable = await geoRegistryContract.zoneInsideCountry(convert.asciiToHex(geohash6).substring(0, 6), convert.asciiToHex(geohash6).substring(0, 10))
  if (zoneAvailable === false) {
    return false;
  }
  return true;
}

export const isZoneOwner = async (address: string, provider: ethers.providers.Provider): Promise<any> => {
  validate.ethAddress(address);
  try {
    const zoneFactoryContract = await contract.get(provider, DetherContract.ZoneFactory);
    const zoneAddr = await zoneFactoryContract.ownerToZone(address);
    return zoneAddr;
  } catch {
    return false;
  }
}

// -------------------- //
//        Setters       //
// -------------------- //

// ERC223
export const create = async (country: string, geohash6: string, amount: number, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  validate.countryCode(country);
  validate.geohash(geohash6, 6);
  validate.minStake(amount);

  console.log('detherJS create', geohash6, country, convert.ethToWei(amount), createZoneBytes(country, geohash6));
  const detherTokenContract = await contract.get(wallet.provider, DetherContract.DetherToken, undefined, [constants.ERC223_TRANSFER_ABI]);
  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  if (!txOptions.gasLimit) txOptions.gasLimit = 450000;
  return detherTokenContract.connect(wallet).functions.transfer(zoneFactoryContract.address, convert.ethToWei(amount), createZoneBytes(country, geohash6), txOptions); // erc223 call
};

// ERC223
export const claimFree = async (geohash6: string, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);

  const detherTokenContract = await contract.get(wallet.provider, DetherContract.DetherToken, undefined, [constants.ERC223_TRANSFER_ABI]);
  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash6).substring(0, 14));

  return detherTokenContract.connect(wallet).transfer(zoneAddress, convert.ethToWei(constants.MIN_ZONE_STAKE), '0x41', txOptions); // erc223 call
};

// ERC223
export const bid = async (geohash6: string, bidAmount: string, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);

  const detherTokenContract = await contract.get(wallet.provider, DetherContract.DetherToken, undefined, [constants.ERC223_TRANSFER_ABI]);
  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash6).substring(0, 14));
  return detherTokenContract.connect(wallet).transfer(zoneAddress, bidAmount, '0x42', txOptions); // erc223 call
};

// ERC223
export const topUp = async (geohash6: string, topUpAmount: string, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);

  const detherTokenContract = await contract.get(wallet.provider, DetherContract.DetherToken, undefined, [constants.ERC223_TRANSFER_ABI]);
  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash6).substring(0, 14));
  return detherTokenContract.connect(wallet).transfer(zoneAddress, topUpAmount, '0x43', txOptions); // erc223 call
};

export const release = async (geohash6: string, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);
  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash6).substring(0, 14));
  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);

  return zoneContract.connect(wallet).release(txOptions);
};

export const withdrawFromAuction = async (geohash6: string, auctionId: number, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);

  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash6).substring(0, 14));
  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);
  return zoneContract.connect(wallet).withdrawFromAuction(auctionId, txOptions);
};

export const withdrawFromAuctions = async (geohash6: string, auctionIds: number[], wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);

  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash6).substring(0, 14));
  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);
  return zoneContract.connect(wallet).withdrawFromAuctions(auctionIds, txOptions);
};

export const withdrawDth = async (geohash6: string, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);

  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash6).substring(0, 14));
  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);
  return zoneContract.connect(wallet).withdrawDth(txOptions);
};

export const withdrawEth = async (geohash6: string, wallet: ethers.Wallet, txOptions: ITxOptions): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);

  const zoneFactoryContract = await contract.get(wallet.provider, DetherContract.ZoneFactory);
  const zoneAddress = await zoneFactoryContract.geohashToZone(convert.asciiToHex(geohash6).substring(0, 14));
  const zoneContract = await contract.get(wallet.provider, DetherContract.Zone, zoneAddress);
  return zoneContract.connect(wallet).withdrawEth(txOptions);
};
