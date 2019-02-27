declare global {
  interface Window {
    ethereum: any;
    web3: any;
  }
}

export interface IContractAddresses {
  controlAddress?: string;
  dthAddress?: string;
  zoneFactoryAddress?: string;
  usersAddress?: string;
  geoRegistryAddress?: string;
  exchangeRateOracleAddress?: string;
}

export interface IEthersOptions {
  // provider related
  network?: string;
  rpcURL?: string;
  rpcURL2?: string;
  infuraKey?: string;
  etherscanKey?: string;
  // contract addresses
  contracts?: IContractAddresses;
}

export interface ITeller {
  isSeller: boolean;
  isBuyer: boolean;
  currencyId: number;
  tellerGeohash: string;
  zoneGeohash: string;
  zoneAddress: string;
  funds: string;
  buyRate: number;
  sellRate: number;
  messenger?: string;
  referrer?: string;
}

export interface ITellerArgs {
  position: string;
  currencyId: number;
  messenger?: string;
  isSeller: boolean;
  isBuyer: boolean;
  sellRate?: number;
  buyRate?: number;
  referrer?: string;
}

export enum ZoneAuctionState {
  started = 'started',
  ended = 'ended',
}

export interface IZoneAuction {
  id: number;
  state: ZoneAuctionState;
  startTime: number;
  endTime: number;
  highestBidder: string;
  highestBid: string;
}

export interface IZoneOwner {
  address: string;
  startTime: number;
  staked: string;
  balance: string;
  lastTaxTime: number;
  auctionId: number;
}

export interface IZone {
  geohash: string;
  status: ZoneStatus;
  address?: string;
  owner?: IZoneOwner;
  auction?: IZoneAuction;
}

export enum ZoneStatus {
  Inexistent = 'Inexistent',
  Claimable = 'Claimable',
  Occupied = 'Occupied',
}

export enum ExternalContract {
  erc20 = 'erc20',
  weth = 'weth',
  airswapExchange = 'airswapExchange',
  kyberNetworkProxy = 'kyberNetworkProxy',
  appealableArbitrator = 'appealableArbitrator',
}

export interface IBalances {
  [key: string]: string;
  ETH?: string;
  DTH?: string;
  DAI?: string;
  BNB?: string;
  MKR?: string;
  OMG?: string;
  ZRX?: string;
  VEN?: string;
  AE?: string;
  REP?: string;
  HAV?: string;
  NUSD?: string;
  ZLA?: string;
  FLIXX?: string;
  PNK?: string;
  CAN?: string;
}

export interface ITicker {
  [key: string]: string;
  DAI?: string;
}

export interface IDate {
  day: number;
  month: number;
  year: number;
}

export enum Unit {
  eth = 'eth',
  usd = 'usd',
  wei = 'wei',
}

export enum DetherContract {
  DetherToken = 'DetherToken',
  Control = 'Control',
  Users = 'Users',
  GeoRegistry = 'GeoRegistry',
  Zone = 'Zone',
  ZoneFactory = 'ZoneFactory',
  ExchangeRateOracle = 'ExchangeRateOracle',
  Shops = 'Shops',
  SmsCertifier = 'SmsCertifier',
  KycCertifier = 'KycCertifier',
}

export enum TransactionStatus {
  pending = 'pending',
  error = 'error',
  success = 'success',
  unknown = 'unknown',
}

export enum Tier {
  sms = 'sms',
  kyc = 'kyc',
  uncertified = 'uncertified',
}

export interface IWeb3 {
  currentProvider: any;
}

export interface IEstimation {
  buyAmount: string;
  buyRate?: string; // only with Kyber, not with Airswap
}

export enum Token {
  ETH = 'ETH',
  DTH = 'DTH',
  DAI = 'DAI',
  BNB = 'BNB',
  MKR = 'MKR',
  OMG = 'OMG',
  ZRX = 'ZRX',
  VEN = 'VEN',
  AE = 'AE',
  REP = 'REP',
  HAV = 'HAV',
  NUSD = 'NUSD',
  ZLA = 'ZLA',
  FLIXX = 'FLIXX',
  PNK = 'PNK',
  CAN = 'CAN',
}

export enum Network {
  homestead = 'homestead',
  mainnet = 'mainnet',
  rinkeby = 'rinkeby',
  ropsten = 'ropsten',
  kovan = 'kovan',
}

export interface IShop {
  position: string;
  zoneGeohash: string;
  category: string;
  name: string;
  description: string;
  opening: string;
  staked: string;
  hasDispute: boolean;
  disputeID: number;
}

export enum ShopDisputeStatus {
  Waiting = 'Waiting',
  Appealable = 'Appealable',
  Solved = 'Solved',
}

export enum ShopDisputeRuling {
  NoRuling = 'NoRuling',
  ShopWins = 'ShopWins',
  ChallengerWins = 'ChallengerWins',
}

export interface IShopDispute {
  id: number;
  shop: string;
  challenger: string;
  disputeType: number;
  ruling: ShopDisputeRuling;
  status: ShopDisputeStatus;
}

export interface IShopArgs {
  country: string; // TODO: create enum
  position: string;
  category?: string;
  name?: string;
  description?: string;
  opening?: string;
}

export enum Exchange {
  kyber = 'kyber',
  uniswap = 'uniswap',
}

export interface IExchangePair {
  tokens: Token[];
  exchange: Exchange;
}

export interface IExchange {
  sellToken: Token;
  buyToken: Token;
  name: Exchange;
  estimate: Function;
  trade: Function;
}

export interface IExchangeEstimation {
  buyAmount: string;
  buyRate?: string;
}

export enum DisputeType {
  firstOne = 0,
}

export interface ITxOptions {
  gasPrice?: number;
  gasLimit?: number;
  nonce?: number;
  value?: number;
}