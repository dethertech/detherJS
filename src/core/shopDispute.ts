import { ethers } from 'ethers';

import * as validate from '../helpers/validate';
import * as contract from '../helpers/contracts';
import * as util from '../helpers/util';

import {
  DetherContract, DisputeType,
  IShopDispute, ShopDisputeRuling, ShopDisputeStatus, ITxOptions,
} from '../types';

// -------------------- //
//       Formatters     //
// -------------------- //

export const shopDisputeArrToObj = (shopDisputeArr: any[]) : IShopDispute => ({
  shop: shopDisputeArr[0].toString(), // address
  challenger: shopDisputeArr[1], // address
  disputeType: shopDisputeArr[2], // integer
  // TODO: does below work? outputs string values
  ruling: <ShopDisputeRuling>ShopDisputeRuling[shopDisputeArr[3].toNumber()], // ShopDisputeRuling
  status: <ShopDisputeStatus>ShopDisputeStatus[shopDisputeArr[4].toNumber()], // ShopDisputeStatus
});

// -------------------- //
//        Getters       //
// -------------------- //

export const getDispute = async (disputeID: number, provider: ethers.providers.Provider) : Promise<IShopDispute> => {
  validate.shopDisputeID(disputeID);

  const shopContract = await contract.get(provider, DetherContract.Shops);
  const shopDispute: IShopDispute = shopDisputeArrToObj(await shopContract.getDispute(disputeID));
  return shopDispute;
};

export const getDisputeCreateCost = async (provider: ethers.providers.Provider) : Promise<string> => {
  const shopContract = await contract.get(provider, DetherContract.Shops);
  const disputeCreateCostBN = await shopContract.getDisputeCreateCost();
  return disputeCreateCostBN.toString(); // e.g. 1.26453 ETH
};

export const getDisputeAppealCost = async (disputeID: number, provider: ethers.providers.Provider) : Promise<string> => {
  validate.shopDisputeID(disputeID);

  const shopContract = await contract.get(provider, DetherContract.Shops);
  const disputeAppealCostBN = await shopContract.getDisputeAppealCost(disputeID);
  return disputeAppealCostBN.toString(); // e.g. 1.26453 ETH
};

// -------------------- //
//        Setters       //
// -------------------- //

const createDisputeGasCost = ethers.utils.bigNumberify(300000);
export const createDispute = async (shopAddress: string, evidenceHash: string, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  console.log({ txOptions });
  validate.ethAddress(shopAddress);
  validate.ipfsHash(evidenceHash);
  const shopContract = await contract.get(wallet.provider, DetherContract.Shops);
  const shopExists = await shopContract.shopByAddrExists(shopAddress);
  if (!shopExists) throw new Error('no shop at that address');
  const createFee = ethers.utils.bigNumberify(await getDisputeCreateCost(wallet.provider));
  const ethBalance = await wallet.getBalance();
  const totalCost = createFee.add(createDisputeGasCost.mul(txOptions.gasPrice));
  console.log({
    ethBalance: ethBalance.toString(),
    createDisputeGasCost: createDisputeGasCost.toString(),
    gasPrice: txOptions.gasPrice.toString(),
    createFee: createFee.toString(),
    totalCost: totalCost.toString(),
  });
  if (ethBalance.lt(totalCost)) throw new Error('not enough eth balance to make call');
  const tx = await shopContract.connect(wallet).createDispute(shopAddress, DisputeType.firstOne, util.ipfsHashToBytes32(evidenceHash), { value: createFee });
  return tx;
};

const appealDisputeGasCost = ethers.utils.bigNumberify(300000);
export const appealDispute = async (disputeID: number, evidenceHash: string, wallet: ethers.Wallet, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> => {
  validate.shopDisputeID(disputeID);
  validate.ipfsHash(evidenceHash);
  const shopContract = await contract.get(wallet.provider, DetherContract.Shops);
  const disputeExists = await shopContract.disputeExists(disputeID);
  if (!disputeExists) throw new Error('no dispute exists with that dispute id');
  const appealCost = ethers.utils.bigNumberify(await getDisputeAppealCost(disputeID, wallet.provider));
  const ethBalance = await wallet.provider.getBalance(wallet.address);
  if (ethBalance.lt(appealCost.add(appealDisputeGasCost.mul(txOptions.gasPrice)))) throw new Error('not enough eth balance to make call');
  const tx = await shopContract.connect(wallet).appealDispute(disputeID, util.ipfsHashToBytes32(evidenceHash), { value: appealCost });
  return tx;
};
