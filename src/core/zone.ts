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
  staked: onchainZoneOwner[2].toString(),
  balance: onchainZoneOwner[3].toString(),
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
  highestBid: onchainZoneAuction[5].toString()
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
    balance
  );
  return taxesDue.gte(balance);
};

export const toLiveZone = async (
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
        const [, taxesDue] = await zoneContract.calcHarbergerTax(
          zoneOwner.lastTaxTime,
          now,
          zoneOwner.balance
        );
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
          zoneOwner.staked = ethers.utils
            .bigNumberify(zoneOwner.staked)
            .add(lastAuction.highestBid)
            .toString();
          zoneOwner.balance = ethers.utils
            .bigNumberify(zoneOwner.balance)
            .add(lastAuction.highestBid)
            .toString();
          if (zoneOwner.lastTaxTime >= now) zoneStatus = ZoneStatus.Occupied;
          else {
            const [, taxesDue] = await zoneContract.calcHarbergerTax(
              lastAuction.endTime,
              now,
              zoneOwner.balance
            );
            // zone owner needs to pay harberger taxes, but dows not have enough balance
            if (taxesDue.gte(zoneOwner.balance))
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
            const [, taxesDue] = await zoneContract.calcHarbergerTax(
              lastAuction.endTime,
              now,
              zoneOwner.balance
            );
            // zone owner needs to pay harberger taxes, but dows not have enough balance
            if (taxesDue.gte(zoneOwner.balance))
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
      const [, taxesDue] = await zoneContract.calcHarbergerTax(
        zoneOwner.lastTaxTime,
        now,
        zoneOwner.balance
      );
      if (taxesDue.gte(zoneOwner.balance)) zoneStatus = ZoneStatus.Claimable;
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

export const getZone = async (
  geohash6: string,
  provider: ethers.providers.Provider
): Promise<IZone> => {
  validate.geohash(geohash6, 6);
  const zoneFactoryContract = await contract.get(
    provider,
    DetherContract.ZoneFactory
  );
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
  console.log("detherhs getZone getZoneOwner", zoneOwner);
  const auctionID = await zoneContract.currentAuctionId();
  if (auctionID > 0) {
    const lastAuction: IZoneAuction = zoneAuctionArrToObj(
      await zoneContract.getLastAuction()
    );
    console.log("detherJS getLastAuction", lastAuction);
    return toLiveZone(
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

export const getZoneByAddress = async (
  address: string,
  provider: ethers.providers.Provider
): Promise<IZone> => {
  validate.ethAddress(address);
  let zoneContract;
  try {
    zoneContract = await contract.get(provider, DetherContract.Zone, address);
  } catch (e) {
    console.log("getZoneByAddress() impossible to get the zone");
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
    return toLiveZone(
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
  provider: ethers.providers.Provider
): Promise<any[]> =>
  Promise.all(
    geohash6List.map(
      (geohash6: string): Promise<IZone> => getZone(geohash6, provider)
    )
  );

export const isZoneOpened = async (
  geohash6: string,
  country: string,
  provider: ethers.providers.Provider
): Promise<Boolean> => {
  validate.geohash(geohash6, 6);
  const geoRegistryContract = await contract.get(
    provider,
    DetherContract.GeoRegistry
  );
  const countryOpen = await geoRegistryContract.countryIsEnabled(
    convert.asciiToHex(geohash6).substring(0, 6)
  );
  if (countryOpen === false) {
    return false;
  }
  const zoneAvailable = await geoRegistryContract.zoneInsideCountry(
    convert.asciiToHex(geohash6).substring(0, 6),
    convert.asciiToHex(geohash6).substring(0, 10)
  );
  if (zoneAvailable === false) {
    return false;
  }
  return true;
};

export const isZoneOwner = async (
  address: string,
  provider: ethers.providers.Provider
): Promise<any> => {
  validate.ethAddress(address);
  try {
    const zoneFactoryContract = await contract.get(
      provider,
      DetherContract.ZoneFactory
    );
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
  provider: ethers.providers.Provider
): Promise<any> => {
  validate.ethAddress(address);
  try {
    const zoneFactoryContract = await contract.get(
      provider,
      DetherContract.ZoneFactory
    );
    const zoneBid = await zoneFactoryContract.activeBidderToZone(address);
    console.log("getActiveBid", zoneBid);
    if (zoneBid != "0x0000000000000000000000000000000000000000") return zoneBid;
    else return "no";
  } catch (e) {
    return false;
  }
};

export const isBidderOnthisAuction = async (
  zoneAddress: string,
  ethAddress: string,
  auctionID: number,
  provider: ethers.providers.Provider
): Promise<boolean> => {
  const zoneContract = await contract.get(
    provider,
    DetherContract.Zone,
    zoneAddress
  );
  const result = await zoneContract.auctionBids(auctionID, ethAddress);
  if (convert.weiToEthNumber(result) > 0) {
    return true;
  } else {
    return false;
  }
};

// -------------------- //
//        Setters       //
// -------------------- //

// ERC223
export const create = async (
  country: string,
  geohash6: string,
  amount: number,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.countryCode(country);
  validate.geohash(geohash6, 6);
  validate.minStake(amount);
  const zoneFactoryContract = await contract.get(
    wallet.provider,
    DetherContract.ZoneFactory
  );
  const zoneExists = await zoneFactoryContract.zoneExists(
    convert.asciiToHex(geohash6).substring(0, 14)
  );
  if (zoneExists) {
    return claimFree(geohash6, wallet, txOptions);
  }
  const detherTokenContract = await contract.get(
    wallet.provider,
    DetherContract.DetherToken,
    undefined,
    [constants.ERC223_TRANSFER_ABI]
  );

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

// ERC223
export const claimFree = async (
  geohash6: string,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);
  console.log("detherJS claim free", geohash6);
  const detherTokenContract = await contract.get(
    wallet.provider,
    DetherContract.DetherToken,
    undefined,
    [constants.ERC223_TRANSFER_ABI]
  );
  const zoneFactoryContract = await contract.get(
    wallet.provider,
    DetherContract.ZoneFactory
  );
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
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);
  try {
    const detherTokenContract = await contract.get(
      wallet.provider,
      DetherContract.DetherToken,
      undefined,
      [constants.ERC223_TRANSFER_ABI]
    );
    const zoneFactoryContract = await contract.get(
      wallet.provider,
      DetherContract.ZoneFactory
    );
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
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);

  const detherTokenContract = await contract.get(
    wallet.provider,
    DetherContract.DetherToken,
    undefined,
    [constants.ERC223_TRANSFER_ABI]
  );
  const zoneFactoryContract = await contract.get(
    wallet.provider,
    DetherContract.ZoneFactory
  );
  const zoneAddress = await zoneFactoryContract.geohashToZone(
    convert.asciiToHex(geohash6).substring(0, 14)
  );
  return detherTokenContract
    .connect(wallet)
    .transfer(zoneAddress, topUpAmount, "0x43", txOptions); // erc223 call
};

export const release = async (
  geohash6: string,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);
  const zoneFactoryContract = await contract.get(
    wallet.provider,
    DetherContract.ZoneFactory
  );
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
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);

  const zoneFactoryContract = await contract.get(
    wallet.provider,
    DetherContract.ZoneFactory
  );
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
    "detherJS, check if withdrawable",
    convert.weiToEthNumber(result)
  );
  if (convert.weiToEthNumber(result) > 0) {
    return auctionID;
  } else {
    return 0;
  }
};

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

  // check if previous owner has balance to withdraw
  const previousOwnerBalance = await zoneContract.withdrawableDth(
    wallet.address
  );
  const balance = Number(convert.weiToEth(previousOwnerBalance.toString()));

  if (balance > 0) {
    return zoneContract.connect(wallet).withdrawDth(txOptions);
  }
  const numberOfAuctions = await zoneContract.currentAuctionId();
  // TO DO :
  // CHECK IF WE CAN HAVE DTH IN MULTIPLE AUCTION OR ITS IMPOSSIBLE NOW
  const rawArray = [];
  for (let i = 1; i <= numberOfAuctions; i++) {
    rawArray.push(i);
  }
  let bidToWithdraws = await Promise.all(
    rawArray.map(
      (auctionId: number): Promise<number> =>
        checkIfWithdrawable(zoneContract, wallet.address, auctionId)
    )
  );
  const filteredArrays = bidToWithdraws.filter((value, index) => {
    return value > 0;
  });
  return zoneContract
    .connect(wallet)
    .withdrawFromAuctions(filteredArrays, txOptions);
};

export const withdrawFromAuctions = async (
  geohash6: string,
  auctionIds: number[],
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);

  const zoneFactoryContract = await contract.get(
    wallet.provider,
    DetherContract.ZoneFactory
  );
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
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);

  const zoneFactoryContract = await contract.get(
    wallet.provider,
    DetherContract.ZoneFactory
  );
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
  console.log("detherJS withdrawDthAddress", zoneAddress);
  const zoneContract = await contract.get(
    wallet.provider,
    DetherContract.Zone,
    zoneAddress
  );
  return zoneContract.connect(wallet).withdrawDth(txOptions);
};

export const withdrawEth = async (
  geohash6: string,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  validate.geohash(geohash6, 6);

  const zoneFactoryContract = await contract.get(
    wallet.provider,
    DetherContract.ZoneFactory
  );
  const zoneAddress = await zoneFactoryContract.geohashToZone(
    convert.asciiToHex(geohash6).substring(0, 14)
  );
  const zoneContract = await contract.get(
    wallet.provider,
    DetherContract.Zone,
    zoneAddress
  );
  return zoneContract.connect(wallet).withdrawEth(txOptions);
};

export const processState = async (
  zoneAddress: string,
  wallet: ethers.Wallet,
  txOptions: ITxOptions
): Promise<ethers.ContractTransaction> => {
  console.log("detherjs process state zoneAddress", zoneAddress);
  try {
    const zoneContract = await contract.get(
      wallet.provider,
      DetherContract.Zone,
      zoneAddress
    );
    console.log("detherjs process state 2", zoneContract);
    return zoneContract.connect(wallet).processState(txOptions);
  } catch (e) {
    console.log("error detherJS process state");
  }
};
