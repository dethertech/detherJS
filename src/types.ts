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

export interface IConnect {
  // provider related
  network?: string;
  rpcURL?: string;
  rpcURL2?: string;
  infuraKey?: string;
  etherscanKey?: string;
  // contract addresses
  contracts? : IContractAddresses;
}

export interface ITeller {
  isSeller: boolean;
  isBuyer: boolean;
  currencyId: number;
  tellerGeohash: string;
  zoneGeohash: string;
  zoneAddress: string;
  balance: string;
  messenger?: string;
  buyRate?: number;
  sellRate?: number;
}

export interface ITellerArgs {
  position: string;
  currencyId: number;
  messenger?: string;
  isSeller: boolean;
  isBuyer: boolean;
  sellRate?: number;
  buyRate?: number;
}

export enum ZoneAuctionState {
  started = 'started',
  ended = 'ended',
}

export interface IZoneAuction {
  id: string;
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
}

export enum ExternalContract {
  erc20 = 'erc20',
  weth = 'weth',
  airswapExchange = 'airswapExchange',
  kyberNetworkProxy = 'kyberNetworkProxy',
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

export enum Exchange {
  kyber = 'kyber',
  airswap = 'airswap',
}

export interface IExchangePair {
  pair: string;
  exchange: Exchange;
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
