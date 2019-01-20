import Web3 from 'web3';
import { ethers } from 'ethers';

import * as providers from './helpers/providers';
import * as contract from './helpers/contracts';

import {
  Unit, Token, TransactionStatus, Tier,
  IEthersOptions, ITeller, IBalances, ITellerArgs, IShop, IShopArgs, IShopDispute,
} from './types';

import * as exchange from './core/exchange';
import * as teller from './core/teller';
import * as shop from './core/shop';
import * as shopDispute from './core/shopDispute';
import * as wallet from './core/wallet';
import * as user from './core/user';
import * as zoneAuction from './core/zoneAuction';

const EMPTY_MESSENGER_FIELD = '0x00000000000000000000000000000000';

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

    if (this.encryptedWallet) {
      if (!password) throw new Error('need to pass in password as arg 1');
      console.log('this.encryptedWallet, is it json or a string?', this.encryptedWallet);
      const disconnectedWallet = await ethers.Wallet.fromEncryptedJson(this.encryptedWallet, password);
      const connectedWallet: ethers.Wallet = new ethers.Wallet(disconnectedWallet.privateKey, this.provider);
      return connectedWallet;
    }
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

  async getTransactionStatus(txHash: string) : Promise<TransactionStatus> {
    this.hasProvider();
    return wallet.getTransactionStatus(txHash, this.provider);
  }

  // -------------------- //
  //       Exchange       //
  // -------------------- //

  async getExchangeEstimation(sellToken: Token, buyToken: Token, sellAmount: string) : Promise<string> {
    this.hasProvider();
    return exchange.getExchangeEstimation(sellToken, buyToken, sellAmount, this.provider);
  }

  async execExchange(password: string, sellToken: Token, buyToken: Token, sellAmount: string, buyAmount: string, options?: { gasPrice: number }) : Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return exchange.execTrade(sellToken, buyToken, sellAmount, buyAmount, wallet, options);
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
    return teller.add(zoneAddress, tellerData, wallet);
  }

  async removeTeller(password: string, zoneAddress: string) : Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return teller.remove(zoneAddress, wallet);
  }

  // -------------------- //
  //        Shop        //
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

  async createDispute(password: string, shopAddress: string) : Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    // TODO: check that user is allowed to perform this action
    return shopDispute.createDispute(shopAddress, wallet);
  }

  async appealDispute(password: string, shopAddress: string) : Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    // TODO: check that user is allowed to perform this action
    return shopDispute.appealDispute(shopAddress, wallet);
  }

  // -------------------- //
  //         User         //
  // -------------------- //

  async getUserTier(address: string) : Promise<Tier> {
    this.hasProvider();
    return user.getTier(address, this.provider);
  }

  // -------------------- //
  //     Zone Auction     //
  // -------------------- //

  async calcBidAmount(zoneAddress: string, walletAddress: string, zoneAuctionId: number, bidAmount: string) : Promise<ethers.utils.BigNumber> {
    this.hasProvider();
    return zoneAuction.calcBidAmount(zoneAddress, zoneAuctionId, bidAmount, this.provider);
  }
}
