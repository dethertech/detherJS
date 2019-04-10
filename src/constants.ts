import {
  Token, Exchange,
  IExchangePair,
} from './types';

export const CRYPTOCOMPARE_URL: string = 'https://min-api.cryptocompare.com/';

export const GAS_PRICE: number = 25000000000;

export const COORD_PRECISION: number = 5;

export const TICKER: any = {
  kovan: {
    DTH: '0x9027E9FC4641e2991A36Eaeb0347Bc5b35322741',
    // DAI: '0xc4375b7de8af5a38a93548eb8453a498222c4ff2', // v1.0
    DAI: '0x4C38cDC08f1260F5c4b21685654393BB1e66a858', // (uniswap)
    KNC: '0xB2f3dD487708ca7794f633D9Df57Fdb9347a7afF',
    WETH: '0xd0A1E359811322d97991E03f863a0C30C2cF029C', // WETH
    MKR: '0xaC94Ea989f6955C67200DD67F0101e1865A560Ea',
  },
  ropsten: {
    DTH: '0xdb06f28e163684de611f21f76203e42ab4ae5b55',
    DAI: '0xaD6D458402F60fD3Bd25163575031ACDce07538D',
    OMG: '0x4BFBa4a8F28755Cb2061c413459EE562c6B9c51b',
    WETH: '0x0000000000000000000000000000000000000000', // WETH
  },
  rinkeby: {
    DTH: '0xaaa5dd9beff81bb47ccdde852504fb94fa18415c',
    WETH: '0xc778417e063141139fce010982780140aa0cd5ab', // WETH
  },
  homestead: {
    DTH: '0x5adc961d6ac3f7062d2ea45fefb8d8167d44b190',
    DAI: '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359',
    BNB: '0xb8c77482e45f1f44de1745f52c74426c631bdd52',
    MKR: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
    OMG: '0xd26114cd6ee289accf82350c8d8487fedb8a0c07',
    ZRX: '0xe41d2489571d322189246dafa5ebde1f4699f498',
    VEN: '0xd850942ef8811f2a866692a623011bde52a462c1',
    AE: '0x5ca9a71b1d01849c0a95490cc00559717fcf0d1d',
    REP: '0xe94327d07fc17907b4db788e5adf2ed424addff6',
    HAV: '0xc011a72400e58ecd99ee497cf89e3775d4bd732f',
    NUSD: '0x57ab1e02fee23774580c119740129eac7081e9d3',
    ZLA: '0xfd8971d5e8e1740ce2d0a84095fca4de729d0c16',
    WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
    FLIXX: '0xf04a8ac553fcedb5ba99a64799155826c136b0be',
    PNK: '0x93ed3fbe21207ec2e8f2d3c3de6e058cb73bc04d',
    CAN: '0x1d462414fe14cf489c7a21cac78509f4bf8cd7c0',
  },
  custom: {
    DTH: '',
  },
};

export const EXCHANGE_PAIRS: IExchangePair[] = [
  { tokens: [Token.ETH, Token.DTH], exchange: Exchange.kyber },
  { tokens: [Token.ETH, Token.DAI], exchange: Exchange.uniswap },
  { tokens: [Token.ETH, Token.BNB], exchange: Exchange.kyber },
  { tokens: [Token.ETH, Token.MKR], exchange: Exchange.uniswap },
  { tokens: [Token.ETH, Token.OMG], exchange: Exchange.kyber },
  { tokens: [Token.ETH, Token.ZRX], exchange: Exchange.kyber },
  { tokens: [Token.ETH, Token.VEN], exchange: Exchange.kyber },
  { tokens: [Token.ETH, Token.AE], exchange: Exchange.kyber },
  { tokens: [Token.ETH, Token.REP], exchange: Exchange.kyber },
];

// source: https://github.com/OasisDEX/oasis-direct/blob/master/src/settings.json
export const CONTRACT_ADDRESSES: any = {
  ropsten: {
    // dether
    DetherToken: '',
    Control: '',
    GeoRegistry: '',
    KycCertifier: '',
    SmsCertifier: '',
    Users: '',
    ZoneFactory: '',
    Zone: '',
    Shops: '',
    // external
    // Mkr/Oasis is not on ropsten
    // AirSwap is not on ropsten
    kyberNetworkProxy: '0x818E6FECD516Ecc3849DAf6845e3EC868087B755',
    uniswapExchange: '',
  },
  kovan: {
    // dether
    DetherToken: '0x9027e9fc4641e2991a36eaeb0347bc5b35322741',
    Control: '0x524fdFbB40413cda80f2d94489E2708422462e0D',
    GeoRegistry: '0x3a638902A3e56Fd552a952266e64C738310F2ea2',
    KycCertifier: '0xfb4571f1131890C833eb86C7d73751aD8370923C',
    SmsCertifier: '0x6CE59d066A7E86b78975252eE4A67ad03eC43984',
    Users: '0x3c9E20A97847a066Eca4780BF37F2DD191a18de2',
    ZoneFactory: '0x9ba516A391E0e683aF4C4437B708EC33Fcc993F4',
    Zone: '0xdA24C63221c5FA409D42aAd2769925C563F47B1C',
    Shops: '0xbF6391Ad72D6E0b0f6333C00EBb39E9CdF8A5684',
    // external
    // Mkr/Oasis is not on ropsten
    // AirSwap is not on ropsten
    kyberNetworkProxy: '0x7e6b8b9510D71BF8EF0f893902EbB9C865eEF4Df',
    uniswapFactory: '0xD3E51Ef092B2845f10401a0159B2B96e8B6c3D30',
    uniswapExchange: '',
  },
  rinkeby: {
    // dether
    DetherToken: '',
    Control: '',
    GeoRegistry: '',
    KycCertifier: '',
    SmsCertifier: '',
    Users: '',
    ZoneFactory: '',
    Zone: '',
    Shops: '',
    // external
    // Mkr/Oasis is not on rinkeby
    airswapExchange: '0x07fc7c43d8168a2730344e5cf958aaecc3b42b41',
    uniswapExchange: '',
  },
  homestead: {
    // dether
    DetherToken: '0x5adc961D6AC3f7062D2eA45FEFB8D8167d44b190',
    Control: '',
    GeoRegistry: '',
    KycCertifier: '',
    SmsCertifier: '',
    Users: '',
    ZoneFactory: '',
    Zone: '',
    Shops: '',
    // external
    kyberNetworkProxy: '0x818E6FECD516Ecc3849DAf6845e3EC868087B755',
    uniswapExchange: '',
  },
  custom: {
    // dether
    DetherToken: '',
    Control: '',
    GeoRegistry: '',
    KycCertifier: '',
    SmsCertifier: '',
    Users: '',
    ZoneFactory: '',
    Zone: '',
    Shops: '',
    // external
    kyberNetworkProxy: '',
    uniswapExchange: '',
  },
};

export const MIN_ZONE_STAKE = 100;

export const DEFAULT_TX_OPTIONS = {
  gasPrice: 20000000000,
  gasLimit: 7000000,
};

export const ERC223_TRANSFER_ABI = 'function transfer(address _to, uint _value, bytes _data) returns (bool)';

export const BYTES1_ZERO = '0x00';
export const BYTES7_ZERO = '0x00000000000000';
export const BYTES12_ZERO = '0x000000000000000000000000';
export const BYTES16_ZERO = '0x00000000000000000000000000000000';
export const BYTES32_ZERO = '0x0000000000000000000000000000000000000000000000000000000000000000';
export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';
export const ADDRESS_BURN = '0xffffffffffffffffffffffffffffffffffffffff';
