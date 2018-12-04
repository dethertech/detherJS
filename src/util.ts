import { ethers } from 'ethers';
import utf8 from 'utf8';

import { ITeller, IDate, IZoneAuction, IZoneOwner, Tier, ZoneAuctionState } from './types';

const EMPTY_MESSENGER_FIELD = '0x00000000000000000000000000000000';

export const stringToBytes = (str: string, len: number) => (
  ethers.utils.formatBytes32String(str).slice(0, 2 + (len * 2)) // 1 byte = 2 hex chars
);

const toUtf8 = (hex: string) : string => {
  if (hex.startsWith('0x')) hex = hex.slice(2); // tslint:disable-line
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    const code = parseInt(hex.substr(i, 2), 16);
    if (code === 0) break;
    str += String.fromCharCode(code);
  }
  try {
    return utf8.decode(str);
  } catch (e) {
    return '';
  }
};

export const tellerArrToObj = (geohash: string, zoneAddr: string, tellerArr: any[]) : ITeller => {
  const isSeller = tellerArr[3][7] === '1';
  const isBuyer = tellerArr[3][6] === '1';
  return {
    isSeller,
    isBuyer,
    currencyId: tellerArr[0].toNumber(),
    tellerGeohash: toUtf8(tellerArr[2]), // geohash 10 chars long
    zoneAddress: zoneAddr,
    zoneGeohash: geohash,
    balance: ethers.utils.formatEther(tellerArr[6]),
    // optional
    messenger: tellerArr[1] !== EMPTY_MESSENGER_FIELD && toUtf8(tellerArr[1]),
    buyRate: isBuyer && tellerArr[4].toNumber(),
    sellRate: isSeller && tellerArr[5].toNumber(),
  };
};

export const timestampNow = () : number => (
  Math.floor(Date.now() / 1000)
);

export const zoneAuctionArrToObj = (onchainZoneAuction: any[]) : IZoneAuction => ({
  id: onchainZoneAuction[0].toNumber(), // positive incrementing integer
  state: onchainZoneAuction[1].toNumber() === 2 ? ZoneAuctionState.ended : ZoneAuctionState.started, // 0 or 1
  startTime: onchainZoneAuction[2].toNumber(), // timestamp
  endTime: onchainZoneAuction[3].toNumber(), // timestamp
  highestBidder: onchainZoneAuction[4], // address
  highestBid: onchainZoneAuction[5].toString(), // eth amount in wei
});

export const zoneOwnerArrToObj = (onchainZoneOwner: any[]) : IZoneOwner => ({
  address: onchainZoneOwner[0].toNumber(), // positive incrementing integer
  startTime: onchainZoneOwner[1].toNumber(), // timestamp
  staked: onchainZoneOwner[2].toString(), // eth amount in wei (18 decimals)
  balance: onchainZoneOwner[3].toString(), // eth amount in wei (18 decimals)
  lastTaxTime: onchainZoneOwner[4], // timestamp
});

export const toLiveAuction = (zoneInstance: any, zoneAuction: IZoneAuction, zoneOwner: IZoneOwner) : [IZoneAuction, IZoneOwner] => {
  if (zoneAuction.state === ZoneAuctionState.started) {
    if (timestampNow() >= zoneAuction.endTime) {
      // auction has ended, but chain has not yet been updated with that info (<3 blockchain?)
      zoneAuction.state = ZoneAuctionState.ended;
      // update zone owner, could be that highestBidder already is the zone owner, just overwrite with same value
      zoneOwner.address = zoneAuction.highestBidder;
      zoneOwner.staked = zoneAuction.highestBid;
      zoneOwner.startTime = zoneAuction.endTime;
    }
  }
  return [zoneAuction, zoneOwner];
};

export const dateArrToObj = (dateArr: any[]) : IDate => ({
  day: dateArr[0].toNumber(),
  month: dateArr[1].toNumber(),
  year: dateArr[2].toNumber(),
});

export const add0x = (txHash: string) : string => (
  txHash.startsWith('0x') ? txHash : `0x${txHash}`
);

export const tierNumToName = (tier: number) : Tier => {
  switch (tier) {
    case 0: return Tier.uncertified;
    case 1: return Tier.sms;
    case 2: return Tier.kyc;
    default: throw new Error(`unknown tier number: ${tier}`);
  }
};
