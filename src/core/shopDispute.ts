import { ethers } from 'ethers';

import * as validate from '../helpers/validate';
import * as contract from '../helpers/contracts';
import * as util from '../helpers/util';
import * as convert from '../helpers/convert';

import {
  DetherContract, DisputeType,
  IShopDispute, ShopDisputeRuling, ShopDisputeStatus, ITxOptions,
} from '../types';

// -------------------- //
//       Formatters     //
// -------------------- //

// TODO: find shorthand to convert integer to Shop Status/Ruling enum
const toShopRuling = (idx: number) => {
  switch (idx) {
    case 0: return ShopDisputeRuling.NoRuling;
    case 1: return ShopDisputeRuling.ShopWins;
    case 2: return ShopDisputeRuling.ChallengerWins;
    default: throw new Error(`unknown shop ruling: ${idx}`);
  }
};

const toShopStatus = (idx: number) => {
  switch (idx) {
    case 0: return ShopDisputeStatus.Waiting;
    case 1: return ShopDisputeStatus.Appealable;
    case 2: return ShopDisputeStatus.Solved; // never happens, when solved, a dispute is removed (and shop is possibly removed)
    default: throw new Error(`unknown shop status: ${idx}`);
  }
};

export const shopDisputeArrToObj = (shopDisputeArr: any[]) : IShopDispute => ({
  id: shopDisputeArr[0].toNumber(), // integer
  shop: shopDisputeArr[1], // address
  challenger: shopDisputeArr[2], // address
  disputeType: shopDisputeArr[3].toNumber(), // integer
  // TODO: does below work? outputs string values
  ruling: toShopRuling(shopDisputeArr[4].toNumber()), // ShopDisputeRuling
  status: toShopStatus(shopDisputeArr[5].toNumber()), // ShopDisputeStatus
});

// -------------------- //
//        Getters       //
// -------------------- //

export const getDispute = async (shopAddress: string, provider: ethers.providers.Provider) : Promise<IShopDispute> => {
  validate.ethAddress(shopAddress);

  const shopContract = await contract.get(provider, DetherContract.Shops);
  const shopDispute: IShopDispute = shopDisputeArrToObj(await shopContract.getDispute(shopAddress));
  return shopDispute;
};

export const getDisputeCreateCost = async (provider: ethers.providers.Provider) : Promise<string> => {
  const shopContract = await contract.get(provider, DetherContract.Shops);
  return shopContract.getDisputeCreateCost(); // wei as bignumber
};

export const getDisputeAppealCost = async (shopAddress: string, provider: ethers.providers.Provider) : Promise<string> => {
  validate.ethAddress(shopAddress);

  const shopContract = await contract.get(provider, DetherContract.Shops);
  return shopContract.getDisputeAppealCost(shopAddress); // wei as bignumber
};

// -------------------- //
//        Setters       //
// -------------------- //

const createDisputeGasCost = 300000;
export const createDispute = async (shopAddress: string, evidenceHash: string, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.ethAddress(shopAddress);
  validate.ipfsHash(evidenceHash);
  const shopContract = await contract.get(wallet.provider, DetherContract.Shops);
  const shopExists = await shopContract.shopByAddrExists(shopAddress);
  if (!shopExists) throw new Error('no shop at that address');
  const ethBalance = await wallet.getBalance();
  const createCost = await getDisputeCreateCost(wallet.provider);
  const gasCost = ethers.utils.bigNumberify(createDisputeGasCost).mul(txOptions.gasPrice);
  const totalCost = ethers.utils.bigNumberify(createCost).add(gasCost);
  if (ethBalance.lt(totalCost)) throw new Error('not enough eth balance to make call');
  return shopContract.connect(wallet).createDispute(shopAddress, DisputeType.firstOne, util.ipfsHashToBytes32(evidenceHash), { ...txOptions, value: createCost });
};

const appealDisputeGasCost = ethers.utils.bigNumberify(300000);
export const appealDispute = async (shopAddress: string, evidenceHash: string, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.ethAddress(shopAddress);
  validate.ipfsHash(evidenceHash);
  const shopContract = await contract.get(wallet.provider, DetherContract.Shops);
  const dispute = await shopContract.getDispute(shopAddress);
  const ethBalance = await wallet.provider.getBalance(wallet.address);
  const appealCost = await shopContract.getDisputeAppealCost(shopAddress);
  const gasCost = ethers.utils.bigNumberify(appealDisputeGasCost).mul(txOptions.gasPrice);
  const totalCost = ethers.utils.bigNumberify(appealCost).add(gasCost);
  if (ethBalance.lt(totalCost)) throw new Error('not enough eth balance to make call');
  return shopContract.connect(wallet).appealDispute(shopAddress, util.ipfsHashToBytes32(evidenceHash), { ...txOptions, value: appealCost });
};
