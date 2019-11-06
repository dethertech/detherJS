import { ethers } from "ethers";

import * as constants from "../constants";
import * as util from "../helpers/util";
import * as convert from "../helpers/convert";
import * as validate from "../helpers/validate";
import * as contract from "../helpers/contracts";

import {
  DetherContract,
  ZoneAuctionState,
  ZoneStatus,
  IZoneAuction,
  IZoneOwner,
  ITxOptions,
  IZone
} from "../types";

// -------------------- //
//      Formatters      //
// -------------------- //

export const zoneOwnerArrToObj = (onchainZoneOwner: any[]): IZoneOwner => ({
  address: onchainZoneOwner[0],
  startTime: onchainZoneOwner[1].toNumber(),
  staked: convert.weiToEthNumber(onchainZoneOwner[2].toString()),
  balance: convert.weiToEthNumber(onchainZoneOwner[3].toString()),
  lastTaxTime: onchainZoneOwner[4].toNumber(),
  auctionId:
    onchainZoneOwner[5].toNumber() > 0 ? onchainZoneOwner[5] : undefined
});

// const hasEnded = util.timestampNow() >= onchainZoneAuction[3].toNumber();

export const zoneAuctionArrToObj = (
  onchainZoneAuction: any[]
): IZoneAuction => ({
  id: onchainZoneAuction[0].toNumber(),
  state: onchainZoneAuction[1].toNumber(),
  startTime: onchainZoneAuction[2].toNumber(),
  endTime: onchainZoneAuction[3].toNumber(),
  highestBidder:
    onchainZoneAuction[4] !== constants.ADDRESS_ZERO
      ? onchainZoneAuction[4]
      : undefined,
  highestBid: convert.weiToEthNumber(onchainZoneAuction[5].toString())
});

const createZoneBytes = (country: string, geohash6: string): string => {
  // if (tier.toString().length === 1)
  const data = [util.toNBytes(country, 2), util.toNBytes(geohash6, 6)].join("");
  return `0x${data}`;
};

const checkForeclosure = async (
  beginTime: number,
  endTime: number,
  balance: string,
  zoneContract: ethers.Contract
): Promise<boolean> => {
  if (beginTime >= endTime) return false;
  const [, taxesDue] = await zoneContract.calcHarbergerTax(
    beginTime,
    endTime,
    convert.ethToWei(Number(balance))
  );
  return taxesDue.gte(convert.ethToWei(Number(balance)));
};
const calcHarbergerTax = (
  startTime: number,
  endTime: number,
  dthAmount: ethers.utils.BigNumber
): ethers.utils.BigNumber => {
  const taxAmountBN = dthAmount
    .mul(endTime - startTime)
    .mul(4)
    .div(10000)
    .div(86400);
  /*
  console.log(
    "tax amount",
    taxAmountBN.toString(),
    "keep amount",
    dthAmount.sub(taxAmountBN).toString()
  );*/
  return taxAmountBN;
};
// here zone is updated on the state it should be even before process state is called in the smart contract
export const toLiveZone = async (
  zoneAddress: string,
  geohash6: string,
  zoneContract: ethers.Contract,
  zoneOwner: IZoneOwner,
  lastAuction: IZoneAuction
): Promise<any> => {
  console.log("toLiveZone");
  let zoneStatus: ZoneStatus;
  if (zoneOwner.startTime === 0) zoneStatus = ZoneStatus.Claimable;
  else {
    const now = util.timestampNow();
    // TODO: calc harberger tax locally
    if (lastAuction.id === 0 || lastAuction.state === ZoneAuctionState.ended) {
      // there is NO active auction, check zoneowner tax payments
      if (zoneOwner.lastTaxTime >= now) zoneStatus = ZoneStatus.Occupied;
      else {
        const myTaxesDue = calcHarbergerTax(
          zoneOwner.lastTaxTime,
          now,
          convert.ethToWeiBN(zoneOwner.balance)
        );

        if (myTaxesDue.gte(convert.ethToWei(zoneOwner.balance)))
          zoneStatus = ZoneStatus.Claimable;
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
          // strange here as its already done in smart contract
          zoneOwner.staked = Number(zoneOwner.staked);
          //             Number(zoneOwner.staked) + Number(lastAuction.highestBid);
          zoneOwner.balance = Number(zoneOwner.balance);
          // Number(zoneOwner.balance) + Number(lastAuction.highestBid);
          if (zoneOwner.lastTaxTime >= now) zoneStatus = ZoneStatus.Occupied;
          else {
            const myTaxesDue = calcHarbergerTax(
              zoneOwner.lastTaxTime,
              now,
              convert.ethToWeiBN(zoneOwner.balance)
            );

            // zone owner needs to pay harberger taxes, but dows not have enough balance
            if (myTaxesDue.gte(convert.ethToWei(zoneOwner.balance)))
              zoneStatus = ZoneStatus.Claimable;
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
            const myTaxesDue = calcHarbergerTax(
              zoneOwner.lastTaxTime,
              now,
              convert.ethToWeiBN(zoneOwner.balance)
            );
            // zone owner needs to pay harberger taxes, but dows not have enough balance
            if (myTaxesDue.gte(convert.ethToWei(zoneOwner.balance)))
              zoneStatus = ZoneStatus.Claimable;
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
    auction: lastAuction.id !== 0 ? lastAuction : undefined
  };
};

// here the state is the always the same that the current state on the smart contract
export const toLiveZoneRaw = async (
  zoneAddress: string,
  geohash6: string,
  zoneContract: ethers.Contract,
  zoneOwner: IZoneOwner,
  lastAuction: IZoneAuction
): Promise<any> => {
  let zoneStatus: ZoneStatus;
  if (zoneOwner.startTime === 0) zoneStatus = ZoneStatus.Claimable;
  else {
    const now = util.timestampNow();
    // TODO: calc harberger tax locally
    if (lastAuction.id === 0 || lastAuction.state === ZoneAuctionState.ended) {
      // there is NO active auction, check zoneowner tax payments
      if (zoneOwner.lastTaxTime >= now) zoneStatus = ZoneStatus.Occupied;
      else {
        const myTaxesDue = calcHarbergerTax(
          zoneOwner.lastTaxTime,
          now,
          convert.ethToWeiBN(zoneOwner.balance)
        );
        if (myTaxesDue.gte(convert.ethToWei(zoneOwner.balance)))
          zoneStatus = ZoneStatus.Claimable;
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
          // strange here as its already done in smart contract
          zoneOwner.staked = Number(zoneOwner.staked);
          //             Number(zoneOwner.staked) + Number(lastAuction.highestBid);
          zoneOwner.balance = Number(zoneOwner.balance);
          // Number(zoneOwner.balance) + Number(lastAuction.highestBid);
          if (zoneOwner.lastTaxTime >= now) zoneStatus = ZoneStatus.Occupied;
          else {
            const myTaxesDue = calcHarbergerTax(
              zoneOwner.lastTaxTime,
              now,
              convert.ethToWeiBN(zoneOwner.balance)
            );

            // zone owner needs to pay harberger taxes, but dows not have enough balance
            // if (taxesDue.gte(convert.ethToWei(zoneOwner.balance)))
            if (myTaxesDue.gte(convert.ethToWei(zoneOwner.balance)))
              zoneStatus = ZoneStatus.Claimable;
            else zoneStatus = ZoneStatus.Occupied;
          }
          // zone owner can pay for his taxes
        } else {
          // winner is NOT the current zone owner
          zoneOwner.startTime = lastAuction.endTime;
          if (zoneOwner.lastTaxTime >= now) zoneStatus = ZoneStatus.Occupied;
          else {
            const myTaxesDue = calcHarbergerTax(
              zoneOwner.lastTaxTime,
              now,
              convert.ethToWeiBN(zoneOwner.balance)
            );
            // zone owner needs to pay harberger taxes, but dows not have enough balance
            if (myTaxesDue.gte(convert.ethToWei(zoneOwner.balance)))
              zoneStatus = ZoneStatus.Claimable;
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
    auction: lastAuction.id !== 0 ? lastAuction : undefined
  };
};

//
export const toLiveZoneNoBidYet = async (
  zoneAddress: string,
  geohash6: string,
  zoneContract: ethers.Contract,
  zoneOwner: IZoneOwner
): Promise<any> => {
  let zoneStatus: ZoneStatus;
  if (zoneOwner.startTime === 0) zoneStatus = ZoneStatus.Claimable;
  else {
    const now = util.timestampNow();
    // TODO: calc harberger tax locally
    // there is NO active auction, check zoneowner tax payments
    if (zoneOwner.lastTaxTime >= now) zoneStatus = ZoneStatus.Occupied;
    else {
      const myTaxesDue = calcHarbergerTax(
        zoneOwner.lastTaxTime,
        now,
        convert.ethToWeiBN(zoneOwner.balance)
      );
      if (myTaxesDue.gte(convert.ethToWei(zoneOwner.balance)))
        zoneStatus = ZoneStatus.Claimable;
      else zoneStatus = ZoneStatus.Occupied;
    }
  }
  return {
    geohash: geohash6,
    status: zoneStatus,
    address: zoneAddress,
    owner: zoneOwner.address !== constants.ADDRESS_ZERO ? zoneOwner : undefined,
    auction: undefined
  };
};

// -------------------- //
//        Getters       //
// -------------------- //

export const isZoneOwned = async (
  geohash6: string,
  zoneFactoryContract: ethers.Contract,
  provider: ethers.providers.Provider
): Promise<Boolean> => {
  validate.geohash(geohash6, 6);
  const zoneExists = await zoneFactoryContract.zoneExists(
    convert.asciiToHex(geohash6).substring(0, 14)
  );
  if (!zoneExists) return false;
  // there is a zone contract
  // check if someone is owner now
  const zoneAddress = await zoneFactoryContract.geohashToZone(
    convert.asciiToHex(geohash6).substring(0, 14)
  );
  const zoneContract = await contract.get(
    provider,
    DetherContract.Zone,
    zoneAddress
  );
  const zoneOwner: IZoneOwner = zoneOwnerArrToObj(
    await zoneContract.getZoneOwner()
  );
  if (
    zoneOwner &&
    zoneOwner.address != "0x0000000000000000000000000000000000000000"
  ) {
    return true;
  }
  return false;
};

export const getZoneByGeohash = async (
  geohash6: string,
  zoneFactoryContract: ethers.Contract,
  provider: ethers.providers.Provider
): Promise<IZone> => {
  validate.geohash(geohash6, 6);

  const zoneExists = await zoneFactoryContract.zoneExists(
    convert.asciiToHex(geohash6).substring(0, 14)
  );
  if (!zoneExists) return { geohash: geohash6, status: ZoneStatus.Inexistent };
  // there exists a zone contract

  const zoneAddress = await zoneFactoryContract.geohashToZone(
    convert.asciiToHex(geohash6).substring(0, 14)
  );

  const zoneContract = await contract.get(
    provider,
    DetherContract.Zone,
    zoneAddress
  );

  const zoneOwner: IZoneOwner = zoneOwnerArrToObj(
    await zoneContract.getZoneOwner()
  );

  const auctionID = await zoneContract.currentAuctionId();

  if (auctionID > 0) {
    const lastAuction: IZoneAuction = zoneAuctionArrToObj(
      await zoneContract.getLastAuction()
    );

    return toLiveZoneRaw(
      zoneAddress,
      geohash6,
      zoneContract,
      zoneOwner,
      lastAuction
    );
  } else {
    return toLiveZoneNoBidYet(zoneAddress, geohash6, zoneContract, zoneOwner);
  }
};

// TO DO GET ZONE WHEN ITS CLAIMED AND WIN AFTER AUCTION
// BECAUSE OWNER IS SET TO THE PREVIOUS AUCTION OWNER AND NOT THE CLAIMER
// DO THE SAME IN GETZONE()
export const getZoneByAddress = async (
  address: string,
  provider: ethers.providers.Provider
): Promise<IZone> => {
  validate.ethAddress(address);
  let zoneContract;
  try {
    zoneContract = await contract.get(provider, DetherContract.Zone, address);
  } catch (e) {
    return { geohash: "000000", status: ZoneStatus.Inexistent };
  }

  const zoneOwner: IZoneOwner = zoneOwnerArrToObj(
    await zoneContract.getZoneOwner()
  );

  const geohash6 = await zoneContract.geohash();
  const auctionID = await zoneContract.currentAuctionId();
  if (auctionID > 0) {
    const lastAuction: IZoneAuction = zoneAuctionArrToObj(
      await zoneContract.getLastAuction()
    );
    return toLiveZoneRaw(
      address,
      convert.hexToAscii(geohash6),
      zoneContract,
      zoneOwner,
      lastAuction
    );
  } else {
    return toLiveZoneNoBidYet(
      address,
      convert.hexToAscii(geohash6),
      zoneContract,
      zoneOwner
    );
  }
};

export const getZonesStatus = async (
  geohash6List: string[],
  zoneFactoryContract: ethers.Contract,
  provider: ethers.providers.Provider
): Promise<any[]> =>
  Promise.all(
    geohash6List.map(
      (geohash6: string): Promise<IZone> =>
        getZoneByGeohash(geohash6, zoneFactoryContract, provider)
    )
  );

export const isZoneOpened = async (
  geohash6: string,
  country: string,
  geoRegistryContract: ethers.Contract
): Promise<Boolean> => {
  validate.geohash(geohash6, 6);

  const countryOpen = await geoRegistryContract.zoneIsEnabled(
    convert.asciiToHex(country).substring(0, 6)
  );
  if (countryOpen === false) {
    return false;
  }
  const zoneAvailable = await geoRegistryContract.zoneInsideBiggerZone(
    convert.asciiToHex(country).substring(0, 6),
    convert.asciiToHex(geohash6).substring(0, 10)
  );

  if (zoneAvailable === false) {
    return false;
  }
  return true;
};

export const isZoneOwner = async (
  address: string,
  zoneFactoryContract: ethers.Contract,
  provider: ethers.providers.Provider
): Promise<any> => {
  validate.ethAddress(address);
  try {
    const zoneAddr = await zoneFactoryContract.ownerToZone(address);
    const zoneGeohash = convert
      .hexToAscii(await zoneFactoryContract.zoneToGeohash(zoneAddr))
      .slice(0, 6);
    return {
      zoneAddr,
      zoneGeohash
    };
  } catch (e) {
    return false;
  }
};

export const getOpenBid = async (
  address: string,
  zoneFactoryContract: ethers.Contract
): Promise<any> => {
  validate.ethAddress(address);
  try {
    const zoneBid = await zoneFactoryContract.activeBidderToZone(address);
    if (zoneBid != "0x0000000000000000000000000000000000000000") return zoneBid;
    else return "no";
  } catch (e) {
    return false;
  }
};

// DO NOT USE TO KNOW IF CAN WITHDRAW FROM THE AUCTION
export const isBidderOnthisAuction = async (
  zoneAddress: string,
  ethAddress: string,
  auctionID: number,
  provider: ethers.providers.Provider
): Promise<number> => {
  const zoneContract = await contract.get(
    provider,
    DetherContract.Zone,
    zoneAddress
  );
  const result = await zoneContract.auctionBids(auctionID, ethAddress);
  return convert.weiToEthNumber(result);
};

// -------------------- //
//        Setters       //
// -------------------- //

// ERC223
export const create = async (
  country: string,
  geohash6: string,
  amount: number,
  zoneFactoryContract: ethers.Contract,
  detherTokenContract: ethers.Contract,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.countryCode(country);
  validate.geohash(geohash6, 6);
  validate.minStake(amount);

  const zoneExists = await zoneFactoryContract.zoneExists(
    convert.asciiToHex(geohash6).substring(0, 14)
  );
  if (zoneExists) {
    return claimFree(
      geohash6,
      wallet,
      zoneFactoryContract,
      detherTokenContract,
      txOptions
    );
  }
  /*const detherTokenContract = await contract.get(
    wallet.provider,
    DetherContract.DetherToken,
    undefined,
    [constants.ERC223_TRANSFER_ABI]
  );*/

  if (!txOptions.gasLimit) txOptions.gasLimit = 450000;
  return detherTokenContract
    .connect(wallet)
    .functions.transfer(
      zoneFactoryContract.address,
      convert.ethToWei(amount),
      createZoneBytes(country, geohash6),
      txOptions
    ); // erc223 call
};

// TO DO ADD PARAM HERE
// ERC223
export const claimFree = async (
  geohash6: string,
  wallet: ethers.Wallet,
  zoneFactoryContract: ethers.Contract,
  detherTokenContract: ethers.Contract,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);
  const zoneAddress = await zoneFactoryContract.geohashToZone(
    convert.asciiToHex(geohash6).substring(0, 14)
  );

  return detherTokenContract
    .connect(wallet)
    .transfer(
      zoneAddress,
      convert.ethToWei(constants.MIN_ZONE_STAKE),
      "0x41",
      txOptions
    ); // erc223 call
};

// ERC223
export const bid = async (
  geohash6: string,
  bidAmount: number,
  zoneFactoryContract: ethers.Contract,
  detherTokenContract: ethers.Contract,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);
  try {
    const zoneAddress = await zoneFactoryContract.geohashToZone(
      convert.asciiToHex(geohash6).substring(0, 14)
    );
    return detherTokenContract
      .connect(wallet)
      .transfer(zoneAddress, convert.ethToWei(bidAmount), "0x42", txOptions); // erc223 call
  } catch (e) {
    console.log("impossible to bid here", e);
  }
};

// ERC223
export const topUp = async (
  geohash6: string,
  topUpAmount: string,
  zoneFactoryContract: ethers.Contract,
  detherTokenContract: ethers.Contract,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);

  const zoneAddress = await zoneFactoryContract.geohashToZone(
    convert.asciiToHex(geohash6).substring(0, 14)
  );
  return detherTokenContract
    .connect(wallet)
    .transfer(zoneAddress, topUpAmount, "0x43", txOptions); // erc223 call
};

export const release = async (
  geohash6: string,
  zoneFactoryContract: ethers.Contract,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);
  const zoneAddress = await zoneFactoryContract.geohashToZone(
    convert.asciiToHex(geohash6).substring(0, 14)
  );
  const zoneContract = await contract.get(
    wallet.provider,
    DetherContract.Zone,
    zoneAddress
  );

  return zoneContract.connect(wallet).release(txOptions);
};

export const withdrawFromAuction = async (
  geohash6: string,
  auctionId: number,
  zoneFactoryContract: ethers.Contract,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);

  const zoneAddress = await zoneFactoryContract.geohashToZone(
    convert.asciiToHex(geohash6).substring(0, 14)
  );
  const zoneContract = await contract.get(
    wallet.provider,
    DetherContract.Zone,
    zoneAddress
  );
  return zoneContract.connect(wallet).withdrawFromAuction(auctionId, txOptions);
};

export const withdrawFromAuctionAddress = async (
  zoneAddress: string,
  auctionId: number,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.ethAddress(zoneAddress);

  const zoneContract = await contract.get(
    wallet.provider,
    DetherContract.Zone,
    zoneAddress
  );
  return zoneContract.connect(wallet).withdrawFromAuction(auctionId, txOptions);
};

const checkIfWithdrawable = async (
  zoneContract: ethers.Contract,
  ethAddress: string,
  auctionID: number
): Promise<number> => {
  const result = await zoneContract.auctionBids(auctionID, ethAddress);
  console.log(
    "auctionID checkIfWithdrawable",
    auctionID,
    convert.weiToEthNumber(result)
  );
  if (convert.weiToEthNumber(result) > 0) {
    const auction: IZoneAuction = zoneAuctionArrToObj(
      await zoneContract.getAuction(auctionID)
    );
    if (auction.highestBidder !== ethAddress) return auctionID;
  } else {
    return 0;
  }
};

// TO DO:
// improve this function to only withdraw from know auction, to avoid doing useles call to previous zone auction
export const withdrawAuctionsRaw = async (
  zoneAddress: string,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.ethAddress(zoneAddress);
  const zoneContract = await contract.get(
    wallet.provider,
    DetherContract.Zone,
    zoneAddress
  );

  const numberOfAuctions = await zoneContract.currentAuctionId();
  // TO DO :
  // CHECK IF WE CAN HAVE DTH IN MULTIPLE AUCTION OR ITS IMPOSSIBLE NOW
  const rawArray = [];
  let counter = numberOfAuctions > 20 ? 1 : numberOfAuctions - 20; // we'll check only the last 20 auctions (40 days minimum)
  for (let i = 1; i <= numberOfAuctions; i++) {
    rawArray.push(i);
  }
  let bidToWithdraws = await Promise.all(
    rawArray.map(
      (auctionId: number): Promise<number> =>
        checkIfWithdrawable(zoneContract, wallet.address, auctionId)
    )
  );
  console.log("bidToWithdraws", bidToWithdraws);
  const filteredArrays = bidToWithdraws.filter((value, index) => {
    return value > 0;
  });
  console.log("filteredArrays", filteredArrays);
  if (filteredArrays.length > 0) {
    console.log("detherjs withdrawFromAuctions");
    return zoneContract
      .connect(wallet)
      .withdrawFromAuctions(filteredArrays, txOptions);
  } else {
    console.log("detherjs withdrawDth only");

    return zoneContract.connect(wallet).withdrawDth(txOptions);
  }
};

export const withdrawFromAuctions = async (
  geohash6: string,
  auctionIds: number[],
  zoneFactoryContract: ethers.Contract,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);

  const zoneAddress = await zoneFactoryContract.geohashToZone(
    convert.asciiToHex(geohash6).substring(0, 14)
  );
  const zoneContract = await contract.get(
    wallet.provider,
    DetherContract.Zone,
    zoneAddress
  );
  return zoneContract
    .connect(wallet)
    .withdrawFromAuctions(auctionIds, txOptions);
};

export const withdrawFromAuctionsAddress = async (
  zoneAddress: string,
  auctionIds: number[],
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.ethAddress(zoneAddress);

  const zoneContract = await contract.get(
    wallet.provider,
    DetherContract.Zone,
    zoneAddress
  );
  return zoneContract
    .connect(wallet)
    .withdrawFromAuctions(auctionIds, txOptions);
};

export const withdrawDth = async (
  geohash6: string,
  zoneFactoryContract: ethers.Contract,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);

  const zoneAddress = await zoneFactoryContract.geohashToZone(
    convert.asciiToHex(geohash6).substring(0, 14)
  );
  const zoneContract = await contract.get(
    wallet.provider,
    DetherContract.Zone,
    zoneAddress
  );
  return zoneContract.connect(wallet).withdrawDth(txOptions);
};

export const withdrawDthAddress = async (
  zoneAddress: string,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.ethAddress(zoneAddress);
  const zoneContract = await contract.get(
    wallet.provider,
    DetherContract.Zone,
    zoneAddress
  );
  return zoneContract.connect(wallet).withdrawDth(txOptions);
};

export const processState = async (
  zoneAddress: string,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  try {
    const zoneContract = await contract.get(
      wallet.provider,
      DetherContract.Zone,
      zoneAddress
    );
    return zoneContract.connect(wallet).processState(txOptions);
  } catch (e) {
    console.log("error detherJS process state");
  }
};
