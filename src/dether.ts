import { ethers } from "ethers";

import * as constants from "./constants";

import * as providers from "./helpers/providers";
import * as contract from "./helpers/contracts";

import * as teller from "./core/teller";
import * as shop from "./core/shop";
import * as shopDispute from "./core/shopDispute";
import * as wallet from "./core/wallet";
import * as util from "./core/util";
import * as user from "./core/user";
import * as zone from "./core/zone";
import * as certifier from "./core/certifier";

import {
  Unit,
  Token,
  TransactionStatus,
  Tier,
  DetherContract,
  IEthersOptions,
  ITeller,
  IBalances,
  ITellerArgs,
  IShop,
  IShopArgs,
  IShopDispute,
  ITxOptions,
  IZone,
  ITicker,
  IExchange,
  ITickerDecimal
} from "./types";

// import * as zoneAuction from './core/zoneAuction';

// TO DO :
// teller shop management (set licence price, collect taxes, get available taxes)
// shop licence price moving (get licence price, estimate taxes, is owned or not)
// getShopInZones

export default class DetherJS {
  usingMetamask: boolean;
  encryptedWallet: string;
  provider: any;
  network: any;
  zoneFactoryContract: ethers.Contract;
  geoRegistryContract: ethers.Contract;
  shopsContract: ethers.Contract;
  dthContract: ethers.Contract;

  constructor(useMetamask: boolean) {
    this.usingMetamask = useMetamask;
    this.encryptedWallet = null;
    this.provider = null;
    this.network = null;
  }

  async init(connectOptions?: IEthersOptions): Promise<void> {
    this.provider = this.usingMetamask
      ? await providers.connectMetamask()
      : await providers.connectEthers(connectOptions);
    this.network = await this.provider.getNetwork();
    this.shopsContract = await contract.get(
      this.provider,
      DetherContract.Shops
    );

    this.zoneFactoryContract = await contract.get(
      this.provider,
      DetherContract.ZoneFactory
    );
    this.geoRegistryContract = await contract.get(
      this.provider,
      DetherContract.GeoRegistry
    );
    this.dthContract = await contract.get(
      this.provider,
      DetherContract.DetherToken,
      undefined,
      [constants.ERC223_TRANSFER_ABI]
    );
  }

  async setCustomContractAddresses(contractAddresses: any) {
    constants.TICKER.custom.DTH = contractAddresses[DetherContract.DetherToken];

    constants.CONTRACT_ADDRESSES.custom.DetherToken =
      contractAddresses[DetherContract.DetherToken];
    constants.CONTRACT_ADDRESSES.custom.GeoRegistry =
      contractAddresses[DetherContract.GeoRegistry];
    constants.CONTRACT_ADDRESSES.custom.Users =
      contractAddresses[DetherContract.Users];
    constants.CONTRACT_ADDRESSES.custom.ZoneFactory =
      contractAddresses[DetherContract.ZoneFactory];
    constants.CONTRACT_ADDRESSES.custom.Zone =
      contractAddresses[DetherContract.Zone];
    constants.CONTRACT_ADDRESSES.custom.Shops =
      contractAddresses[DetherContract.Shops];
    constants.CONTRACT_ADDRESSES.custom.ShopDispute =
      contractAddresses[DetherContract.ShopDispute];
    constants.CONTRACT_ADDRESSES.custom.TaxCollector =
      contractAddresses[DetherContract.TaxCollector];
    constants.CONTRACT_ADDRESSES.custom.CertifierRegistry =
      contractAddresses[DetherContract.CertifierRegistry];
  }

  loadUser(encryptedWallet: string) {
    // no need for init() to first have been called
    if (this.usingMetamask)
      throw new Error("cannot add encrypted wallet when using metamask");

    this.encryptedWallet = encryptedWallet;
  }

  private async loadWallet(password?: string): Promise<ethers.Wallet> {
    if (this.usingMetamask) {
      // source: https://docs.ethers.io/ethers.js/html/cookbook-providers.html?highlight=metamask
      //         https://docs.ethers.io/ethers.js/html/cookbook-providers.html?highlight=getsigner
      const signer = this.provider.getSigner();
      return signer;
    }

    if (!this.encryptedWallet) throw new Error("did find no encrypted wallet");
    if (!password) throw new Error("need to pass in password as arg 1");
    const disconnectedWallet = await ethers.Wallet.fromEncryptedJson(
      this.encryptedWallet,
      password
    );
    const connectedWallet: ethers.Wallet = new ethers.Wallet(
      disconnectedWallet.privateKey,
      this.provider
    );
    return connectedWallet;
  }

  // -------------------- //
  //        Checks        //
  // -------------------- //

  private hasProvider() {
    if (!this.provider)
      throw new Error("detherjs not yet initialized, first call init()");
  }

  private hasWallet() {
    if (!this.encryptedWallet && !this.usingMetamask)
      throw new Error("no user loaded");
  }

  // -------------------- //
  //        Wallet        //
  // -------------------- //
  async getERC20Info(address: string): Promise<ITicker> {
    this.hasProvider();
    return wallet.getERC20Info(address, this.provider);
  }

  async getAllBalance(
    address: string,
    tickers: ITicker[]
  ): Promise<IBalances[]> {
    this.hasProvider();
    return wallet.getAllBalance(address, tickers, this.provider);
  }

  async getExchangeEstimation(
    sellToken: Token,
    buyToken: Token,
    sellAmount: string
  ): Promise<string> {
    this.hasProvider();
    return wallet.getExchangeEstimation(
      sellToken,
      buyToken,
      sellAmount,
      this.provider
    );
  }

  async hasApproval(
    owner: string,
    sellToken: Token,
    amount: string
  ): Promise<boolean> {
    this.hasProvider();
    return wallet.hasApproval(owner, sellToken, amount, this.provider);
  }

  // sellAmount and buyAmount in string WEI
  async execExchange(
    password: string,
    sellToken: Token,
    buyToken: Token,
    sellAmount: string,
    buyAmount: string,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const userWallet = await this.loadWallet(password);
    return wallet.execTrade(
      sellToken,
      buyToken,
      sellAmount,
      buyAmount,
      userWallet,
      txOptions
    );
  }

  // sellAmount and buyAmount in string WEI
  // return a signed tx to broadcast later
  async execExchange_delayed(
    password: string,
    sellToken: Token,
    buyToken: Token,
    sellAmount: string,
    buyAmount: string,
    nonce: number,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<any> {
    this.hasProvider();
    this.hasWallet();
    const userWallet = await this.loadWallet(password);
    return wallet.execTrade_delayed(
      sellToken,
      buyToken,
      sellAmount,
      buyAmount,
      userWallet,
      nonce,
      txOptions
    );
  }

  // Used from sell part . ONLY ETH -> ERC20
  async execExchangeFromSell(
    password: string,
    buyToken: Token,
    sellAmount: string,
    buyAmount: string,
    destAddress: string,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const userWallet = await this.loadWallet(password);
    return wallet.execTradeFromSell(
      buyToken,
      sellAmount,
      buyAmount,
      destAddress,
      userWallet,
      txOptions
    );
  }
  async getAvailableToken(forLogo?: false): Promise<ITicker> {
    this.hasProvider();
    return wallet.getAvailableToken(this.provider, forLogo);
  }

  async getAvailableTokenDecimals(forLogo?: false): Promise<any> {
    this.hasProvider();
    return wallet.getAvailableTokenDecimals(this.provider, forLogo);
  }

  async sendCrypto(
    password: string,
    toAddress: string,
    token: Token,
    amount: string,
    tokenAddress: string = constants.ADDRESS_ZERO,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const userWallet = await this.loadWallet(password);
    return wallet.sendCrypto(
      amount,
      toAddress,
      token,
      userWallet,
      tokenAddress,
      txOptions
    );
  }

  async signMessage(password: string, message: string): Promise<string> {
    this.hasProvider();
    this.hasWallet();
    const userWallet = await this.loadWallet(password);
    return userWallet.signMessage(message);
  }

  async approveToken(
    password: string,
    token: Token,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const userWallet = await this.loadWallet(password);
    return wallet.approveToken(token, userWallet, txOptions);
  }

  async getTokenLiquidity(
    tokenAddress: string,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<any> {
    this.hasProvider();
    return wallet.getUniswapLiquidity(tokenAddress, this.provider);
  }
  // -------------------- //
  //        Teller        //
  // -------------------- //

  async isTeller(address: string): Promise<any> {
    this.hasProvider();
    return teller.isTeller(address, this.provider, this.zoneFactoryContract);
  }

  async getTeller(address: string): Promise<any> {
    this.hasProvider();
    return teller.getTeller(address, this.provider, this.zoneFactoryContract);
  }

  async getTellerInZone(geohash6: string): Promise<any> {
    this.hasProvider();
    return teller.getTellerInZone(
      geohash6,
      this.provider,
      this.zoneFactoryContract
    );
  }

  async getTellersInZones(geohash6List: string[]): Promise<any[]> {
    this.hasProvider();
    return teller.getTellersInZones(
      geohash6List,
      this.provider,
      this.zoneFactoryContract
    );
  }

  async addTeller(
    password: string,
    tellerData: ITellerArgs,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return teller.addTeller(
      tellerData,
      wallet,
      this.zoneFactoryContract,
      txOptions
    );
  }

  async removeTeller(
    password: string,
    zoneGeohash: string,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return teller.removeTeller(
      zoneGeohash,
      wallet,
      this.zoneFactoryContract,
      txOptions
    );
  }

  async updateTeller(
    password: string,
    tellerData: ITellerArgs,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return teller.updateTeller(
      tellerData,
      wallet,
      this.zoneFactoryContract,
      txOptions
    );
  }

  async addTellerComment(
    password: string,
    zoneGeohash: string,
    ipfsHash: string,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return teller.addComment(
      zoneGeohash,
      ipfsHash,
      wallet,
      this.zoneFactoryContract,
      txOptions
    );
  }

  // -------------------- //
  //         Shop         //
  // -------------------- //

  async shopExistsByAddress(shopAddress: string): Promise<boolean> {
    this.hasProvider();
    return shop.existsByAddress(shopAddress, this.shopsContract);
  }

  async getShopByAddress(shopAddress: string): Promise<IShop> {
    this.hasProvider();
    return shop.getShopByAddress(shopAddress, this.shopsContract);
  }

  async getShopByPosition(geohash12: string): Promise<IShop> {
    this.hasProvider();
    return shop.getShopByPosition(geohash12, this.shopsContract);
  }

  async getShopsInZone(geohash6: string): Promise<IShop[]> {
    this.hasProvider();

    return shop.getShopsInZone(geohash6, this.shopsContract);
  }

  async getShopsInZones(geohash6List: string[]): Promise<IShop[][]> {
    this.hasProvider();
    console.log("detherjs", this.shopsContract);
    return shop.getShopsInZones(geohash6List, this.provider);
  }

  async getLicencePriceInZone(geohash6: string): Promise<string> {
    this.hasProvider();
    return shop.getLicencePrice(geohash6, this.shopsContract);
  }

  async addShop(
    password: string,
    shopData: IShopArgs,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return shop.addShop(
      shopData,
      this.shopsContract,
      this.dthContract,
      wallet,
      txOptions
    );
  }

  // 1 eth address can only own 1 shop
  async removeShop(
    password: string,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return shop.removeShop(this.shopsContract, wallet, txOptions);
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

  async createShopDispute(
    password: string,
    shopAddress: string,
    evidenceHash: string,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return shopDispute.createDispute(
      shopAddress,
      evidenceHash,
      wallet,
      txOptions
    );
  }

  // NOTE: disputeID is created by kleros and should be unique?!
  async appealShopDispute(
    password: string,
    shopAddress: string,
    evidenceHash: string,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return shopDispute.appealDispute(
      shopAddress,
      evidenceHash,
      wallet,
      txOptions
    );
  }

  // -------------------- //
  //         User         //
  // -------------------- //

  // -------------------- //
  //         Zone         //
  // -------------------- //

  async getZoneByGeohash(geohash6: string): Promise<IZone> {
    this.hasProvider();
    return zone.getZoneByGeohash(
      geohash6,
      this.zoneFactoryContract,
      this.provider
    );
  }

  async getZoneByAddress(address: string): Promise<IZone> {
    this.hasProvider();
    return zone.getZoneByAddress(address, this.provider);
  }

  async getZonesStatus(geohash6List: string[]): Promise<any[]> {
    this.hasProvider();
    return zone.getZonesStatus(
      geohash6List,
      this.zoneFactoryContract,
      this.provider
    );
  }

  async isBidderOnthisAuction(
    zoneAddress: string,
    ethAddress: string,
    auctionID: number
  ): Promise<number> {
    this.hasProvider();
    return zone.isBidderOnthisAuction(
      zoneAddress,
      ethAddress,
      auctionID,
      this.provider
    );
  }

  async createZone(
    password: string,
    country: string,
    geohash6: string,
    amount: number,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return zone.create(
      country,
      geohash6,
      amount,
      this.zoneFactoryContract,
      this.dthContract,
      wallet,
      txOptions
    );
  }

  async claimFreeZone(
    password: string,
    geohash6: string,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return zone.claimFree(
      geohash6,
      wallet,
      this.zoneFactoryContract,
      this.dthContract,
      txOptions
    );
  }

  async bidZone(
    password: string,
    geohash6: string,
    bidAmount: number,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return zone.bid(
      geohash6,
      bidAmount,
      this.zoneFactoryContract,
      this.dthContract,
      wallet,
      txOptions
    );
  }

  async topUpZone(
    password: string,
    geohash6: string,
    topUpAmount: string,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return zone.topUp(
      geohash6,
      topUpAmount,
      this.zoneFactoryContract,
      this.dthContract,
      wallet,
      txOptions
    );
  }

  async releaseZone(
    password: string,
    geohash6: string,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return zone.release(geohash6, this.zoneFactoryContract, wallet, txOptions);
  }

  async withdrawZoneAuctionBid(
    password: string,
    geohash6: string,
    auctionId: number,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return zone.withdrawFromAuction(
      geohash6,
      auctionId,
      this.zoneFactoryContract,
      wallet,
      txOptions
    );
  }

  async withdrawZoneAuctionsBid(
    password: string,
    geohash6: string,
    auctionIds: number[],
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return zone.withdrawFromAuctions(
      geohash6,
      auctionIds,
      this.zoneFactoryContract,
      wallet,
      txOptions
    );
  }

  async withdrawZoneOwnerDth(
    password: string,
    geohash6: string,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return zone.withdrawDth(
      geohash6,
      this.zoneFactoryContract,
      wallet,
      txOptions
    );
  }

  async withdrawZoneAuctionBidAddress(
    password: string,
    zoneAddress: string,
    auctionId: number,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return zone.withdrawFromAuctionAddress(
      zoneAddress,
      auctionId,
      wallet,
      txOptions
    );
  }

  async withdrawAuctionsRaw(
    password: string,
    zoneAddress: string,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    console.log("detherJS withdrawAuctionsRaw 1");
    const wallet = await this.loadWallet(password);
    return zone.withdrawAuctionsRaw(zoneAddress, wallet, txOptions);
  }

  async withdrawZoneAuctionsBidAddress(
    password: string,
    zoneAddress: string,
    auctionIds: number[],
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return zone.withdrawFromAuctionsAddress(
      zoneAddress,
      auctionIds,
      wallet,
      txOptions
    );
  }

  async withdrawZoneOwnerDthAddress(
    password: string,
    zoneAddress: string,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return zone.withdrawDthAddress(zoneAddress, wallet, txOptions);
  }

  async processState(
    password: string,
    zoneAddress: string,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return zone.processState(zoneAddress, wallet, txOptions);
  }

  async isZoneOpened(geohash6: string, country: string): Promise<Boolean> {
    this.hasProvider();
    return zone.isZoneOpened(geohash6, country, this.geoRegistryContract);
  }

  async isZoneOwner(address: string): Promise<any> {
    this.hasProvider();
    return zone.isZoneOwner(address, this.zoneFactoryContract, this.provider);
  }

  async getOpenBid(address: string): Promise<any> {
    this.hasProvider();
    return zone.getOpenBid(address, this.zoneFactoryContract);
  }

  // -------------------- //
  //        Certifier     //
  // -------------------- //

  async createCertifier(
    password: string,
    urlCert: string,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return certifier.createCertifier(urlCert, wallet, txOptions);
  }

  async modifyUrlCertifier(
    password: string,
    urlCert: string,
    certifierId: string,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return certifier.modifyUrlCertifier(
      urlCert,
      certifierId,
      wallet,
      txOptions
    );
  }

  async addCertificationType(
    password: string,
    certifierId: string,
    refcerts: number,
    descriptionRef: string,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return certifier.addCertificationType(
      certifierId,
      refcerts,
      descriptionRef,
      wallet,
      txOptions
    );
  }

  async addDelegate(
    password: string,
    certifierId: string,
    delegate: string,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return certifier.addDelegate(certifierId, delegate, wallet, txOptions);
  }

  async certify(
    password: string,
    certifierId: string,
    who: string,
    type: number,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return certifier.certify(certifierId, who, type, wallet, txOptions);
  }

  async removeDelegate(
    password: string,
    certifierId: string,
    delegate: string,
    txOptions: ITxOptions = constants.DEFAULT_TX_OPTIONS
  ): Promise<ethers.ContractTransaction> {
    this.hasProvider();
    this.hasWallet();
    const wallet = await this.loadWallet(password);
    return certifier.removeDelegate(certifierId, delegate, wallet, txOptions);
  }

  async isDelegate(certifierId: string, who: string): Promise<Boolean> {
    this.hasProvider();
    return certifier.isDelegate(certifierId, who, this.provider);
  }

  async getCerts(who: string): Promise<any> {
    this.hasProvider();
    return certifier.getCerts(who, this.provider);
  }

  // -------------------- //
  //        Util        //
  // -------------------- //

  async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
    this.hasProvider();
    return util.getTransactionStatus(txHash, this.provider);
  }
}
