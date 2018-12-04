import Web3 from 'web3';
import { ethers } from 'ethers';

import { connectMetamask, connectEthers } from './providers';
import { getContract, getErc20Contract } from './contracts';

import {
  Network, Unit, Token, TransactionStatus, Tier, DetherContract, ZoneAuctionState,
  IConnect, IContractAddresses, ITeller, IBalances, IEstimation, ITellerArgs, IZoneAuction, IZoneOwner,
} from './types';

import * as validate from './validate';
import * as util from './util';
import * as exchange from './exchange';

const EMPTY_MESSENGER_FIELD = '0x00000000000000000000000000000000';

export class DetherJS {
  usingMetamask: boolean;
  detherContracts: any;
  encryptedWallet: string;
  provider: any;
  network: any;

  constructor(useMetamask: boolean) {
    this.usingMetamask = useMetamask;
    this.detherContracts = {};
    this.encryptedWallet = null;
    this.provider = null;
    this.network = null;
  }

  async init(connectOptions?: IConnect, contractAddresses?: IContractAddresses) : Promise<void> {
    this.provider = this.usingMetamask ? await connectMetamask() : await connectEthers(connectOptions);
    this.network = await this.provider.getNetwork();
    this.loadContracts(contractAddresses);
  }

  loadUser(encryptedWallet: string) {
    // no need for init() to first have been called
    if (this.usingMetamask) throw new Error('cannot add encrypted wallet when using metamask');

    this.encryptedWallet = encryptedWallet;
  }

  async loadContracts(contracts? : IContractAddresses) : Promise<void> {
    if (!this.provider) throw new Error('detherjs not yet initialized, first call init()');

    this.detherContracts.controlInstance = await getContract(this.provider, DetherContract.Control, contracts && contracts.controlAddress);
    this.detherContracts.dthInstance = await getContract(this.provider, DetherContract.DetherToken, contracts && contracts.dthAddress);
    this.detherContracts.geoRegistryInstance = await getContract(this.provider, DetherContract.GeoRegistry, contracts && contracts.geoRegistryAddress);
    this.detherContracts.usersInstance = await getContract(this.provider, DetherContract.Users, contracts && contracts.usersAddress);
    this.detherContracts.zoneFactoryInstance = await getContract(this.provider, DetherContract.ZoneFactory, contracts && contracts.zoneFactoryAddress);
    this.detherContracts.exchangeRateOracleInstance = await getContract(this.provider, DetherContract.ExchangeRateOracle, contracts && contracts.exchangeRateOracleAddress);
  }

  async getTeller(geohash: string) : Promise<ITeller> {
    if (!this.provider) throw new Error('detherjs not yet initialized, first call init()');
    validate.geohash(geohash, 7);

    const zoneAddress = await this.detherContracts.zoneFactoryInstance.geohashToZone(util.stringToBytes(geohash.slice(0, 7), 7));
    const zoneInstance = await getContract(this.provider, DetherContract.Zone, zoneAddress);
    const teller: ITeller = util.tellerArrToObj(geohash, zoneAddress, await zoneInstance.getTeller());
    return teller;
  }

  async getTellers(geohashList: string[]) : Promise<ITeller[]> {
    if (!this.provider) throw new Error('detherjs not yet initialized, first call init()');

    const tellers: ITeller[] = [];
    for (const geohash of geohashList) {
      tellers.push(await this.getTeller(geohash));
    }
    return tellers;
  }

  async getAllBalance(address: string, tickers: Token[]) : Promise<IBalances> {
    if (!this.provider) throw new Error('detherjs not yet initialized, first call init()');
    validate.ethAddress(address);
    tickers.forEach(validate.token);

    let getEthBalance = false;

    const result: IBalances = {};

    for (const ticker of tickers) {
      if (ticker === 'ETH') {
        getEthBalance = true;
        continue;
      }
      const erc20instance = await getErc20Contract(this.provider, ticker);
      result[ticker] = ethers.utils.formatEther(await erc20instance.balanceOf(address));
    }

    if (getEthBalance) {
      result.ETH = ethers.utils.formatEther(await this.provider.getBalance(address));
    }

    return result;
  }

  async getTellerAvailableSellAmount(address: string, country: string, unit: Unit = Unit.eth) : Promise<string> {
    if (!this.provider) throw new Error('detherjs not yet initialized, first call init()');
    validate.ethAddress(address);
    validate.countryCode(country);
    validate.sellAmountUnit(unit);

    const userTier = util.tierNumToName((await this.detherContracts.usersInstance.getUserTier(address)).toNumber());
    if (userTier === Tier.uncertified) return '0'; // short-circuit, user is not sms/kyc certified, so he cannot sell anything

    const dateInfo = util.dateArrToObj(await this.detherContracts.usersInstance.getDateInfo(util.timestampNow()));
    const weiSoldToday = await this.detherContracts.usersInstance.ethSellsUserToday(util.stringToBytes(country, 2), address, dateInfo.day, dateInfo.month, dateInfo.year);
    const usdDailyLimit = await this.detherContracts.geoRegistryInstance.countryTierDailyLimit(util.stringToBytes(country, 2), userTier);
    const weiPriceOneUsd = await this.detherContracts.exchangeRateOracleInstance.getWeiPriceOneUsd();
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
  }

  async getTransactionStatus(txHash: string) : Promise<TransactionStatus> {
    validate.txHash(txHash);

    try {
      const tx = await this.provider.getTransaction(util.add0x(txHash));
      if (tx && tx.blockHash) {
        const receipt = await this.provider.getTransactionReceipt(util.add0x(txHash));
        return receipt.status === 1 ? TransactionStatus.success : TransactionStatus.error;
      }
      return tx ? TransactionStatus.pending : TransactionStatus.unknown;
    } catch (e) {
      return TransactionStatus.unknown;
    }
  }

  async getUserTier(address: string) : Promise<Tier> {
    if (!this.provider) throw new Error('detherjs not yet initialized, first call init()');
    validate.ethAddress(address);

    const userTier: number = (await this.detherContracts.usersInstance.getUserTier()).toNumber();

    return util.tierNumToName(userTier);
  }

  async getExchangeEstimation(sellToken: Token, buyToken: Token, sellAmount: number) {
    if (!this.provider) throw new Error('detherjs not yet initialized, first call init()');
    validate.token(sellToken);
    validate.token(buyToken);
    validate.exchangePair(sellToken, buyToken);
    validate.sellAmount(sellAmount);

    // const estimation: IEstimation = await exchange.getEstimation({
    //   provider: this.provider,
    //   sellToken,
    //   buyToken,
    //   sellAmount,
    // });
    //
    // return { buyAmount, buyRate };
  }

  //
  //
  //
  //
  //
  // Require user to be loaded
  //
  //
  //
  //
  //

  private async loadWallet(password?: string) : Promise<ethers.Wallet> {
    if (!this.provider) throw new Error('detherjs not yet initialized, first call init()');
    if (!this.encryptedWallet && !this.usingMetamask) throw new Error('no user loaded');
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

  private async erc223MethodCall(to: string, dthAmount: string, bytesData: string) {
    this.detherContracts.DetherToken.transfer(to, dthAmount, bytesData);
  }

  private async calcBidAmount(zoneInstance: any, walletAddress: string, bidAmount: string, zoneAuction: IZoneAuction, zoneOwner: IZoneOwner) : Promise<ethers.utils.BigNumber> {
    const bidAmountBN = ethers.utils.parseEther(bidAmount);
    const existingBidBN = await zoneInstance.bids(zoneAuction.id, walletAddress);
    if (walletAddress === zoneOwner.address) { // current zoneOwner, need to add his stake to bid
      return ethers.utils.parseUnits(zoneOwner.staked, 'wei').add(existingBidBN).add(bidAmountBN);
    }
    if (existingBidBN) { // somebody who already placed a bid is placing another bid
      return existingBidBN.add(bidAmountBN);
    }
    // first time this address wants to place bid
    return (await zoneInstance.calcEntryFee(bidAmountBN))[1];
  }

  async getZoneBidInfo(zoneAddress: any, walletAddress: string, bidAmount: string, zoneAuction: IZoneAuction, zoneOwner: IZoneOwner) : Promise<ethers.utils.BigNumber> {
    const zoneInstance = await getContract(this.provider, DetherContract.Zone, zoneAddress);

    const bidAmountBN = ethers.utils.parseEther(bidAmount);
    const existingBidBN = await zoneInstance.bids(zoneAuction.id, walletAddress);
    if (walletAddress === zoneOwner.address) { // current zoneOwner, need to add his stake to bid
      return ethers.utils.parseUnits(zoneOwner.staked, 'wei').add(existingBidBN).add(bidAmountBN);
    }
    if (existingBidBN) { // somebody who already placed a bid is placing another bid
      return existingBidBN.add(bidAmountBN);
    }
    // first time this address wants to place bid
    return (await zoneInstance.calcEntryFee(bidAmountBN))[1];
  }

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
    const zoneInstance = await getContract(this.provider, DetherContract.Zone, zoneAddress);
    const [zoneAuction, zoneOwner] = await this.getLiveZoneOwnerAndAuction(zoneInstance);
    if (!zoneOwner.address) throw new Error('zone has no owner, call claimFreeZone()');
    if (zoneAuction.state === ZoneAuctionState.started) {
      if (walletAddress === zoneAuction.highestBidder) throw new Error('already highest bidder');
      const bidAmountBN = ethers.utils.parseEther(bidAmount);
      const existingBidBN = await zoneInstance.bids(zoneAuction.id, walletAddress);
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
    const zoneInstance = await getContract(this.provider, DetherContract.Zone, zoneAddress);
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
    await validate.zoneBidAmount(bidAmount, zone);
    validate.currencyId(tellerData.currencyId);

  }
  async addTeller(zoneAddress: string, tellerData: ITellerArgs) {
    const wallet = await this.loadWallet(password);
    validate.ethAddress(zoneAddress);
    validate.geohash(tellerData.position, 10);
    validate.currencyId(tellerData.currencyId);
    validate.tellerBuyerInfo(tellerData.isBuyer, tellerData.buyRate);
    validate.tellerSellerInfo(tellerData.isSeller, tellerData.sellRate);
    if (tellerData.messenger) validate.tellerMessenger(tellerData.messenger);

    const zoneInstance = await getContract(this.provider, DetherContract.Zone, zoneAddress);

    let settings = '0x0';
    if (tellerData.isBuyer && tellerData.isSeller) settings += '3';
    else if (tellerData.isBuyer) settings += '2';
    else if (tellerData.isSeller) settings += '1';
    else settings += '0';

    const tx = await zoneInstance.addTeller(
      util.stringToBytes(tellerData.position, 10),
      tellerData.currencyId,
      tellerData.messenger ? util.stringToBytes(tellerData.messenger, 16) : EMPTY_MESSENGER_FIELD,
      tellerData.sellRate,
      tellerData.buyRate,
      settings,
    );


  }
  async removeTeller() {
    if (!this.provider) throw new Error('detherjs not yet initialized, first call init()');
    if (!this.encryptedWallet && !this.usingMetamask) throw new Error('no user loaded');
  }
}

export default DetherJS;
