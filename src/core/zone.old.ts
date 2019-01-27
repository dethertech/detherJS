import { ethers } from 'ethers';

import * as util from '../helpers/util';
import * as validate from '../helpers/validate';
import * as contract from '../helpers/contracts';

import {
  Network, Unit, Token, TransactionStatus, Tier, DetherContract, ZoneAuctionState,
  IEthersOptions, IContractAddresses, ITeller, IBalances, IEstimation, ITellerArgs, IZoneAuction, IZoneOwner,
} from '../types';

// -------------------- //
//      ??????????      //
// -------------------- //


export const getLiveZoneState = (zoneAuction: IZoneAuction, zoneOwner: IZoneOwner) : [IZoneAuction, IZoneOwner] => {
  if (zoneAuction.state === ZoneAuctionState.started) {
    if (util.timestampNow() >= zoneAuction.endTime) {
      // auction has ended, but chain has not yet been updated with that info (<3 blockchain?)
      zoneAuction.state = ZoneAuctionState.ended;
      // update zone owner, could be that highestBidder already is the zone owner, just overwrite with same value
      zoneOwner.address = zoneAuction.highestBidder;
      zoneOwner.staked = zoneAuction.highestBid;
      zoneOwner.startTime = zoneAuction.endTime;
    }
    // TODO: if harberger taxes cannot be paid, zone owner will lose his zone ownership, and claimfreeZone can be called
  }
  return [zoneAuction, zoneOwner];
};

export const getLiveZoneOwner = async (zoneAddress: string) : Promise<IZoneOwner> => {
  const zoneInstance = await contract.get(wallet.provider, DetherContract.ZoneFactory, zoneAddress);

  const [, liveZoneOwner] = await getLiveZoneState();

};

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
//        Getters       //
// -------------------- //



export const calcBidAmount = async (zoneAddress: string, zoneAuctionId: number, bidAmount: string, wallet: ethers.Wallet) : Promise<ethers.utils.BigNumber> => {
  const zoneInstance = await contract.get(wallet.provider, DetherContract.ZoneFactory, zoneAddress);

  const bidAmountBN = ethers.utils.parseEther(bidAmount);
  const existingBidBN = await zoneInstance.bids(zoneAuctionId, wallet.address);
  const zoneOwnerAddress = await zoneInstance.getZoneOwner();

  if (wallet.address.toLowerCase() === zoneOwnerAddress.toLowerCase()) { // current zoneOwner, need to add his stake to bid
    return ethers.utils.parseUnits(zoneOwner.staked, 'wei').add(existingBidBN).add(bidAmountBN);
  }

  if (existingBidBN.gt(0)) { // somebody who already placed a bid is placing another bid
    return existingBidBN.add(bidAmountBN);
  }

  // first time this address wants to place bid
  const bidMinusEntryFee = (await zoneInstance.calcEntryFee(bidAmountBN))[1];
  return bidMinusEntryFee;
};

export const getLastAuction = async (zoneAddress: string, provider: ethers.providers.Provider) : Promise<any> => {
  const zoneInstance = await contract.get(provider, DetherContract.ZoneFactory, zoneAddress);
  const lastAuctionArr = await zoneInstance.getLastAuction();
  const lastAuctionObj = format.
};

private async getLiveZoneOwnerAndAuction(zoneInstance: any) : Promise<[IZoneAuction, IZoneOwner]> {
  const onchainZoneAuction: IZoneAuction = util.zoneAuctionArrToObj(await zoneInstance.getLastAuction());
  const onchainZoneOwner: IZoneOwner = util.zoneOwnerArrToObj(await zoneInstance.getZoneOwner());
  let liveZoneAuction: IZoneAuction;
  let liveZoneOwner: IZoneOwner;
  ([liveZoneAuction, liveZoneOwner] = util.toLiveAuction(zoneInstance, onchainZoneAuction, onchainZoneOwner));
  return [liveZoneAuction, liveZoneOwner];
}

// helper function, throws if for any reason we cannot place a bid, otherwise does nothing
async canBidOnZone(walletAddress: string, zoneAddress: string, bidAmount: string) {
  const zoneInstance = await contract.get(this.provider, DetherContract.Zone, zoneAddress);
  const [zoneAuction, zoneOwner] = await this.getLiveZoneOwnerAndAuction(zoneInstance);
  if (!zoneOwner.address) throw new Error('zone has no owner, call claimFreeZone()');
  if (zoneAuction.state === ZoneAuctionState.started) {
    if (walletAddress === zoneAuction.highestBidder) throw new Error('already highest bidder');
    const bidAmountBN = ethers.utils.parseEther(bidAmount);
    const existingBidBN = await zoneInstance.bids(zoneAuctionId, walletAddress);
    const highestBidBN = ethers.utils.parseEther(zoneAuction.highestBid);
    const bidBN = walletAddress === zoneOwner.address
      // current zoneOwner, need to add his stake to bid
      ? ethers.utils.parseUnits(zoneOwner.staked, 'wei').add(existingBidBN).add(bidAmountBN)
      : existingBidBN
        // somebody who already placed a bid is placing another bid
        ? existingBidBN.add(bidAmountBN)
        // first time this address wants to place bid
        : (await zoneInstance.calcEntryFee(bidAmountBN))[1];
    if (bidBN.lt(highestBidBN)) throw new Error('bid not above current highest');
    const tx = await this.erc223MethodCall(zoneInstance.address, bidBN, '0x42'); // bid()
    console.log({ bidTx: tx });
  } else { // last auction has ended
    if (zoneOwner.address === walletAddress) throw new Error('zone owner cannot start auction');
    const bidAmountBn = ethers.utils.parseEther(bidAmount);

  }
}

async bid(zoneAddress: string, bidAmount: string, password?: string) {
  const wallet = await this.loadWallet(password); // undefined when using metamask
  validate.ethAddress(zoneAddress);
  // we need info to check the zone (auction) current state and if requested bid amount is enough to place a valid bid
  const zoneInstance = await contract.get(this.provider, DetherContract.Zone, zoneAddress);
  const onchainZoneAuction: IZoneAuction = util.zoneAuctionArrToObj(await zoneInstance.getLastAuction());
  const onchainZoneOwner: IZoneOwner = util.zoneOwnerArrToObj(await zoneInstance.getZoneOwner());
  let liveZoneAuction: IZoneAuction;
  let liveZoneOwner: IZoneOwner;
  ([liveZoneAuction, liveZoneOwner] = util.toLiveAuction(zoneInstance, onchainZoneAuction, onchainZoneOwner));
  if (!liveZoneOwner.address) throw new Error('zone has no owner, call claimFreeZone()');
  if (liveZoneAuction.state === ZoneAuctionState.started) {
    if (wallet.address === liveZoneAuction.highestBidder) throw new Error('already highest bidder');
    const bidAmountBN = ethers.utils.parseEther(bidAmount);
    const existingBidBN = await zoneInstance.bids(liveZoneAuction.id, wallet.address);
    const highestBidBN = ethers.utils.parseEther(liveZoneAuction.highestBid);
    const bidBN = wallet.address === liveZoneOwner.address
      ? ethers.utils.parseUnits(liveZoneOwner.staked, 'wei').add(existingBidBN).add(bidAmountBN)
      : existingBidBN
        ? existingBidBN.add(bidAmountBN)
        : (await zoneInstance.calcEntryFee(bidAmountBN))[1];
    if (bidBN.lt(highestBidBN)) throw new Error('bid not above current highest');
    const tx = await this.erc223MethodCall(zoneInstance.address, bidBN, '0x42'); // bid()
    console.log({ bidTx: tx });
  } else { // last auction has ended
    if (liveZoneOwner.address === wallet.address) throw new Error('zone owner cannot start auction');
    const bidAmountBn = ethers.utils.parseEther(bidAmount);

  }
  // await validate.zoneBidAmount(bidAmount, zone);
  // validate.currencyId(tellerData.currencyId);

}