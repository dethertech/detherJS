import { ethers } from 'ethers';

import * as util from '../helpers/util';
import * as validate from '../helpers/validate';
import * as contract from '../helpers/contracts';

import {
  Tier, DetherContract, Unit,
  IDate,
} from '../types';

// -------------------- //
//      Formatters      //
// -------------------- //

export const tierNumToName = (tier: number) : Tier => {
  switch (tier) {
    case 0: return Tier.uncertified;
    case 1: return Tier.sms;
    case 2: return Tier.kyc;
    default: throw new Error(`unknown tier number: ${tier}`);
  }
};

export const dateArrToObj = (dateArr: ethers.utils.BigNumber[]) : IDate => ({
  day: dateArr[0].toNumber(),
  month: dateArr[0].toNumber(),
  year: dateArr[0].toNumber(),
});

// -------------------- //
//        Getters       //
// -------------------- //

export const getTier = async (userAddress: string, provider: ethers.providers.Provider) : Promise<Tier> => {
  validate.ethAddress(userAddress);

  const usersInstance = await contract.get(provider, DetherContract.Users);
  const userTier: number = (await usersInstance.getUserTier()).toNumber();

  return tierNumToName(userTier);
};

// saved in users contract but only applies to tellers
export const getAvailableSellAmountToday = async (userAddress: string, country: string, unit: Unit, provider: ethers.providers.Provider) : Promise<string> => {
  validate.ethAddress(userAddress);
  validate.countryCode(country);
  validate.sellAmountUnit(unit);

  const usersInstance = await contract.get(provider, DetherContract.Users);
  const geoRegistryInstance = await contract.get(provider, DetherContract.GeoRegistry);
  const exchangeRateOracleInstance = await contract.get(provider, DetherContract.ExchangeRateOracle);

  const userTier = Tier[(await usersInstance.getUserTier()).toNumber()];
  const dateNow = dateArrToObj(await usersInstance.getDateInfo(util.timestampNow()));

  const weiSoldToday = await usersInstance.ethSellsUserToday(util.stringToBytes(country, 2), userAddress, dateNow.day, dateNow.month, dateNow.year);
  const usdDailyLimit = await geoRegistryInstance.countryTierDailyLimit(util.stringToBytes(country, 2), userTier);

  const weiPriceOneUsd = await exchangeRateOracleInstance.getWeiPriceOneUsd();
  const weiDailyLimit = usdDailyLimit.mul(weiPriceOneUsd);
  const weiLeftToSell = weiDailyLimit.sub(weiSoldToday);

  switch (unit) {
    case Unit.usd:
      return weiLeftToSell.div(weiPriceOneUsd).toString();
    case Unit.eth:
      return ethers.utils.formatEther(weiLeftToSell);
    case Unit.wei:
      return weiLeftToSell.toString();
    default:
      break;
  }
};
