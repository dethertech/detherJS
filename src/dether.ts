import { ethers } from 'ethers';

import * as constants from './constants';

import * as providers from './helpers/providers';

import * as teller from './core/teller';
import * as shop from './core/shop';
import * as shopDispute from './core/shopDispute';
import * as wallet from './core/wallet';
import * as util from './core/util';
import * as user from './core/user';
import * as zone from './core/zone';

import {
  Unit, Token, TransactionStatus, Tier, DetherContract,
  IEthersOptions, ITeller, IBalances, ITellerArgs, IShop, IShopArgs, IShopDispute, ITxOptions, IZone, ITicker,
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

  async init(connectOptions?: IEthersOptions): Promise<void> {
    this.provider = this.usingMetamask ? await providers.connectMetamask() : await providers.connectEthers(connectOptions);
    this.network = await this.provider.getNetwork();

  }

  async setCustomContractAddresses(contractAddresses: any) {
    constants.TICKER.custom.DTH = contractAddresses[DetherContract.DetherToken];

    constants.CONTRACT_ADDRESSES.custom.DetherToken = contractAddresses[DetherContract.DetherToken];
    constants.CONTRACT_ADDRESSES.custom.Control = contractAddresses[DetherContract.Control];
    constants.CONTRACT_ADDRESSES.custom.GeoRegistry = contractAddresses[DetherContract.GeoRegistry];
    constants.CONTRACT_ADDRESSES.custom.KycCertifier = contractAddresses[DetherContract.KycCertifier];
    constants.CONTRACT_ADDRESSES.custom.SmsCertifier = contractAddresses[DetherContract.SmsCertifier];
    constants.CONTRACT_ADDRESSES.custom.Users = contractAddresses[DetherContract.Users];
    constants.CONTRACT_ADDRESSES.custom.ZoneFactory = contractAddresses[DetherContract.ZoneFactory];
    constants.CONTRACT_ADDRESSES.custom.Zone = contractAddresses[DetherContract.Zone];
    constants.CONTRACT_ADDRESSES.custom.Shops = contractAddresses[DetherContract.Shops];
  }

  loadUser(encryptedWallet: string) {
    // no need for init() to first have been called
    if (this.usingMetamask) throw new Error('cannot add encrypted wallet when using metamask');

    this.encryptedWallet = encryptedWallet;
  }

  private async loadWallet(password?: string): Promise<ethers.Wallet> {
    if (this.usingMetamask) {
      // source: https://docs.ethers.io/ethers.js/html/cookbook-providers.html?highlight=metamask
      //         https://docs.ethers.io/ethers.js/html/cookbook-providers.html?highlight=getsigner
      const signer = this.provider.getSigner();
      return signer;
    }

    if (!this.encryptedWallet) throw new Error('did find no encrypted wallet');
    if (!password) throw new Error('need to pass in password as arg 1');
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

  async getAllBalance(address: string, tickers: Token[]): Promise<IBalances> {
    this.hasProvider();
    return wallet.getAllBalance(address, tickers, this.provider);
  }

  async getExchangeEstimation(sellToken: Token, buyToken: Token, sellAmount: string): Promise<string> {
    this.hasProvider();
    return wallet.getExchangeEstimation(sellToken, buyToken, sellAmount, this.provider);
  }

  async execExchange(password: string, sellToken: Token, buyToken: Token, sellAmount: string, buyAmount: string, txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const userWallet = await this.loadWallet(password);
    return wallet.execTrade(sellToken, buyToken, sellAmount, buyAmount, userWallet, txOptions);
  }

  async getAvailableToken(forLogo?: false): Promise<ITicker> {
    this.hasProvider();
    return wallet.getAvailableToken(this.provider, forLogo);
  }
  // -------------------- //
  //        Teller        //
  // -------------------- //

  async getTellerInZone(geohash7: string): Promise<ITeller> {
    this.hasProvider();
    return teller.getTellerInZone(geohash7, this.provider);
  }

  async getTellersInZones(geohash7List: string[]): Promise<ITeller[]> {
    this.hasProvider();
    return teller.getTellersInZones(geohash7List, this.provider);
  }

  async addTeller(password: string, tellerData: ITellerArgs, txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return teller.addTeller(tellerData, wallet, txOptions);
  }

  async removeTeller(password: string, zoneGeohash: string, txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return teller.removeTeller(zoneGeohash, wallet, txOptions);
  }

  async addTellerFunds(password: string, zoneGeohash: string, ethAmount: string, txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return teller.addFunds(zoneGeohash, ethAmount, wallet, txOptions);
  }

  async sellTellerEth(password: string, zoneGeohash: string, recipient: string, ethAmount: string, txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return teller.sellEth(zoneGeohash, recipient, ethAmount, wallet, txOptions);
  }

  async addTellerComment(password: string, zoneGeohash: string, ipfsHash: string, txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return teller.addComment(zoneGeohash, ipfsHash, wallet, txOptions);
  }

  async addTellerCertifiedComment(password: string, zoneGeohash: string, ipfsHash: string, txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return teller.addCertifiedComment(zoneGeohash, ipfsHash, wallet, txOptions);
  }

  // -------------------- //
  //         Shop         //
  // -------------------- //

  async shopExistsByAddress(shopAddress: string): Promise<boolean> {
    this.hasProvider();
    return shop.existsByAddress(shopAddress, this.provider);
  }

  async getShopByAddress(shopAddress: string): Promise<IShop> {
    this.hasProvider();
    return shop.getShopByAddress(shopAddress, this.provider);
  }

  async getShopByPosition(geohash12: string): Promise<IShop> {
    this.hasProvider();
    return shop.getShopByPosition(geohash12, this.provider);
  }

  async getShopsInZone(geohash7: string): Promise<IShop[]> {
    this.hasProvider();
    return shop.getShopsInZone(geohash7, this.provider);
  }

  async addShop(password: string, shopData: IShopArgs, txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return shop.addShop(shopData, wallet, txOptions);
  }

  // 1 eth address can only own 1 shop
  async removeShop(password: string, txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return shop.removeShop(wallet, txOptions);
  }

  // -------------------- //
  //     Shop Dispute     //
  // -------------------- //

  async getShopDispute(shopAddress: string): Promise<IShopDispute> {
    this.hasProvider();
    return shopDispute.getDispute(shopAddress, this.provider);
  }

  async getShopDisputeCreateCost(): Promise<string> {
    this.hasProvider();
    return shopDispute.getDisputeCreateCost(this.provider);
  }

  async getShopDisputeAppealCost(shopAddress: string): Promise<string> {
    this.hasProvider();
    return shopDispute.getDisputeAppealCost(shopAddress, this.provider);
  }

  async createShopDispute(password: string, shopAddress: string, evidenceHash: string, txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return shopDispute.createDispute(shopAddress, evidenceHash, wallet, txOptions);
  }

  // NOTE: disputeID is created by kleros and should be unique?!
  async appealShopDispute(password: string, shopAddress: string, evidenceHash: string, txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return shopDispute.appealDispute(shopAddress, evidenceHash, wallet, txOptions);
  }

  // -------------------- //
  //         User         //
  // -------------------- //

  async getUserTier(address: string): Promise<Tier> {
    this.hasProvider();
    return user.getTier(address, this.provider);
  }

  async getAvailableSellAmountToday(userAddress: string, country: string, unit: Unit = Unit.eth): Promise<string> {
    this.hasProvider();
    return user.getAvailableSellAmountToday(userAddress, country, unit, this.provider);
  }

  // -------------------- //
  //         Zone         //
  // -------------------- //

  async getZone(geohash7: string): Promise<IZone> {
    this.hasProvider();
    return zone.getZone(geohash7, this.provider);
  }
  async createZone(password: string, country: string, geohash7: string, txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return zone.create(country, geohash7, wallet, txOptions);
  }

  async claimFreeZone(password: string, geohash7: string, txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return zone.claimFree(geohash7, wallet, txOptions);
  }

  async bidZone(password: string, geohash7: string, bidAmount: string, txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return zone.bid(geohash7, bidAmount, wallet, txOptions);
  }

  async topUpZone(password: string, geohash7: string, topUpAmount: string, txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return zone.topUp(geohash7, topUpAmount, wallet, txOptions);
  }

  async releaseZone(password: string, geohash7: string, txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return zone.release(geohash7, wallet, txOptions);
  }

  async withdrawZoneAuctionBid(password: string, geohash7: string, auctionId: number, txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return zone.withdrawFromAuction(geohash7, auctionId, wallet, txOptions);
  }

  async withdrawZoneAuctionsBid(password: string, geohash7: string, auctionIds: number[], txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return zone.withdrawFromAuctions(geohash7, auctionIds, wallet, txOptions);
  }

  async withdrawZoneOwnerDth(password: string, geohash7: string, txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return zone.withdrawDth(geohash7, wallet, txOptions);
  }

  async withdrawZoneOwnerEth(password: string, geohash7: string, txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return zone.withdrawEth(geohash7, wallet, txOptions);
  }

  // -------------------- //
  //        Util        //
  // -------------------- //

  async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
    this.hasProvider();
    return util.getTransactionStatus(txHash, this.provider);
  }
}
