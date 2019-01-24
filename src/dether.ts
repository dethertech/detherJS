import { ethers } from 'ethers';

import * as constants from './constants';

import * as providers from './helpers/providers';

import * as teller from './core/teller';
import * as shop from './core/shop';
import * as shopDispute from './core/shopDispute';
import * as wallet from './core/wallet';
import * as util from './core/util';
import * as user from './core/user';

import {
  Unit, Token, TransactionStatus, Tier, DetherContract,
  IEthersOptions, ITeller, IBalances, ITellerArgs, IShop, IShopArgs, IShopDispute, ITxOptions,
} from './types';

// import * as zoneAuction from './core/zoneAuction';

export default class DetherJS {
  usingMetamask: boolean;
  encryptedWallet: string;
  provider: any;
  network: any;

  constructor(useMetamask: boolean) {
    this.usingMetamask = useMetamask;
    this.encryptedWallet = null;
    this.provider = null;
    this.network = null;
  }

  async init(connectOptions?: IEthersOptions) : Promise<void> {
    this.provider = this.usingMetamask ? await providers.connectMetamask() : await providers.connectEthers(connectOptions);
    this.network = await this.provider.getNetwork();

  }

  async setCustomContractAddresses(contractAddresses: any) {
    constants.TICKER.custom.DTH = contractAddresses[DetherContract.DetherToken];

    constants.CONTRACT_ADDRESSES.custom.DetherToken = contractAddresses[DetherContract.DetherToken];
    constants.CONTRACT_ADDRESSES.custom.Control = contractAddresses[DetherContract.DetherToken];
    constants.CONTRACT_ADDRESSES.custom.GeoRegistry = contractAddresses[DetherContract.DetherToken];
    constants.CONTRACT_ADDRESSES.custom.KycCertifier = contractAddresses[DetherContract.DetherToken];
    constants.CONTRACT_ADDRESSES.custom.SmsCertifier = contractAddresses[DetherContract.DetherToken];
    constants.CONTRACT_ADDRESSES.custom.Users = contractAddresses[DetherContract.DetherToken];
    constants.CONTRACT_ADDRESSES.custom.ZoneFactory = contractAddresses[DetherContract.DetherToken];
  }

  loadUser(encryptedWallet: string) {
    // no need for init() to first have been called
    if (this.usingMetamask) throw new Error('cannot add encrypted wallet when using metamask');

    this.encryptedWallet = encryptedWallet;
  }

  private async loadWallet(password?: string) : Promise<ethers.Wallet> {
    if (this.usingMetamask) {
      // source: https://docs.ethers.io/ethers.js/html/cookbook-providers.html?highlight=metamask
      //         https://docs.ethers.io/ethers.js/html/cookbook-providers.html?highlight=getsigner
      const signer = this.provider.getSigner();
      return signer;
    }

    if (!this.encryptedWallet) throw new Error('did find no encrypted wallet');
    if (!password) throw new Error('need to pass in password as arg 1');
    console.log('this.encryptedWallet, is it json or a string?', this.encryptedWallet);
    const disconnectedWallet = await ethers.Wallet.fromEncryptedJson(this.encryptedWallet, password);
    const connectedWallet: ethers.Wallet = new ethers.Wallet(disconnectedWallet.privateKey, this.provider);
    return connectedWallet;
  }

  // -------------------- //
  //        Checks        //
  // -------------------- //

  private hasProvider() {
    if (!this.provider) throw new Error('detherjs not yet initialized, first call init()');
  }

  private hasWallet() {
    if (!this.encryptedWallet && !this.usingMetamask) throw new Error('no user loaded');
  }

  // -------------------- //
  //        Wallet        //
  // -------------------- //

  async getAllBalance(address: string, tickers: Token[]) : Promise<IBalances> {
    this.hasProvider();
    return wallet.getAllBalance(address, tickers, this.provider);
  }

  async getExchangeEstimation(sellToken: Token, buyToken: Token, sellAmount: string) : Promise<string> {
    this.hasProvider();
    return wallet.getExchangeEstimation(sellToken, buyToken, sellAmount, this.provider);
  }

  async execExchange(password: string, sellToken: Token, buyToken: Token, sellAmount: string, buyAmount: string, options?: { gasPrice: number }) : Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const userWallet = await this.loadWallet(password);
    return wallet.execTrade(sellToken, buyToken, sellAmount, buyAmount, userWallet, options);
  }

  // -------------------- //
  //        Teller        //
  // -------------------- //

  async getTellerInZone(geohash7: string) : Promise<ITeller> {
    this.hasProvider();
    return teller.getTellerInZone(geohash7, this.provider);
  }

  async getTellersInZones(geohash7List: string[]) : Promise<ITeller[]> {
    this.hasProvider();
    return teller.getTellersInZones(geohash7List, this.provider);
  }

  async addTeller(password: string, zoneAddress: string, tellerData: ITellerArgs) : Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return teller.addTeller(zoneAddress, tellerData, wallet);
  }

  async removeTeller(password: string, zoneAddress: string) : Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return teller.removeTeller(zoneAddress, wallet);
  }

  async addFunds(password: string, zoneAddress: string, ethAmount: string) : Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return teller.addFunds(zoneAddress, ethAmount, wallet);
  }

  async sellEth(password: string, zoneAddress: string, recipient: string, ethAmount: string) : Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return teller.sellEth(zoneAddress, recipient, ethAmount, wallet);
  }

  async addComment(password: string, zoneAddress: string, commentHash: string) : Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return teller.addComment(zoneAddress, commentHash, wallet);
  }

  async addCertifiedComment(password: string, zoneAddress: string, commentHash: string) : Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return teller.addCertifiedComment(zoneAddress, commentHash, wallet);
  }

  // -------------------- //
  //         Shop         //
  // -------------------- //

  async shopExists(shopAddress: string) : Promise<boolean> {
    this.hasProvider();
    return shop.existsByAddress(shopAddress, this.provider);
  }

  async getShopByAddress(shopAddress: string) : Promise<IShop> {
    this.hasProvider();
    return shop.getShopByAddress(shopAddress, this.provider);
  }

  async getShopByPosition(geohash12: string) : Promise<IShop> {
    this.hasProvider();
    return shop.getShopByPosition(geohash12, this.provider);
  }

  async getShopsInZone(geohash7: string) : Promise<IShop[]> {
    this.hasProvider();
    return shop.getShopsInZone(geohash7, this.provider);
  }

  async addShop(password: string, zoneAddress: string, shopData: IShopArgs) : Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return shop.addShop(zoneAddress, shopData, wallet);
  }

  // 1 eth address can only own 1 shop
  async removeShop(password: string) : Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return shop.removeShop(wallet);
  }

  // -------------------- //
  //     Shop Dispute     //
  // -------------------- //

  async getDispute(disputeID: number) : Promise<IShopDispute> {
    this.hasProvider();
    return shopDispute.getDispute(disputeID, this.provider);
  }

  async getDisputeCreateCost() : Promise<string> {
    this.hasProvider();
    return shopDispute.getDisputeCreateCost(this.provider);
  }

  async getDisputeAppealCost(disputeID: number) : Promise<string> {
    this.hasProvider();
    return shopDispute.getDisputeAppealCost(disputeID, this.provider);
  }

  async createDispute(password: string, shopAddress: string, evidenceHash: string, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return shopDispute.createDispute(shopAddress, evidenceHash, wallet, txOptions);
  }

  // NOTE: disputeID is created by kleros and should be unique?!
  async appealDispute(password: string, disputeID: number, evidenceHash: string, txOptions: ITxOptions) : Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return shopDispute.appealDispute(disputeID, evidenceHash, wallet, txOptions);
  }

  // -------------------- //
  //         User         //
  // -------------------- //

  async getUserTier(address: string) : Promise<Tier> {
    this.hasProvider();
    return user.getTier(address, this.provider);
  }

  async getAvailableSellAmountToday(userAddress: string, country: string, unit: Unit = Unit.eth) : Promise<string> {
    this.hasProvider();
    return user.getAvailableSellAmountToday(userAddress, country, unit, this.provider);
  }

  // -------------------- //
  //     Zone Auction     //
  // -------------------- //

  // async calcBidAmount(zoneAddress: string, walletAddress: string, zoneAuctionId: number, bidAmount: string) : Promise<ethers.utils.BigNumber> {
  //   this.hasProvider();
  //   return zoneAuction.calcBidAmount(zoneAddress, zoneAuctionId, bidAmount, this.provider);
  // }

  // -------------------- //
  //        Util        //
  // -------------------- //

  async getTransactionStatus(txHash: string) : Promise<TransactionStatus> {
    this.hasProvider();
    return util.getTransactionStatus(txHash, this.provider);
  }
}
