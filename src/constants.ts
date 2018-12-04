export const CRYPTOCOMPARE_URL: string = 'https://min-api.cryptocompare.com/';

export const GAS_PRICE: number = 25000000000;

export const COORD_PRECISION: number = 5;

export const TICKER: any = {
  kovan: {
    DTH: '0x9027E9FC4641e2991A36Eaeb0347Bc5b35322741',
    DAI: '0xc4375b7de8af5a38a93548eb8453a498222c4ff2',
    BNB: '0x0000000000000000000000000000000000000000',
    MKR: '0x0000000000000000000000000000000000000000',
    OMG: '0x0000000000000000000000000000000000000000',
    ZRX: '0x0000000000000000000000000000000000000000',
    ETH: '0xd0A1E359811322d97991E03f863a0C30C2cF029C', // WETH
  },
  ropsten: {
    DTH: '0xdb06f28e163684de611f21f76203e42ab4ae5b55',
    DAI: '0xaD6D458402F60fD3Bd25163575031ACDce07538D',
    BNB: '0x0000000000000000000000000000000000000000',
    MKR: '0x0000000000000000000000000000000000000000',
    OMG: '0x4BFBa4a8F28755Cb2061c413459EE562c6B9c51b',
    ZRX: '0x0000000000000000000000000000000000000000',
    ETH: '0x0000000000000000000000000000000000000000', // WETH
  },
  rinkeby: {
    DTH: '0xaaa5dd9beff81bb47ccdde852504fb94fa18415c',
    DAI: '0x0000000000000000000000000000000000000000',
    BNB: '0x0000000000000000000000000000000000000000',
    MKR: '0x0000000000000000000000000000000000000000',
    OMG: '0x0000000000000000000000000000000000000000',
    ZRX: '0x0000000000000000000000000000000000000000',
    ETH: '0xc778417e063141139fce010982780140aa0cd5ab', // WETH
  },
  mainnet: {
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
    ETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
    FLIXX: '0xf04a8ac553fcedb5ba99a64799155826c136b0be',
    PNK: '0x93ed3fbe21207ec2e8f2d3c3de6e058cb73bc04d',
    CAN: '0x1d462414fe14cf489c7a21cac78509f4bf8cd7c0',
  },
};

export const EXCHANGE_PAIRS: any = [
  { pair: 'ETH-DTH', exchange: 'kyber' },
  { pair: 'ETH-DAI', exchange: 'kyber' },
  { pair: 'ETH-BNB', exchange: 'airswap' },
  { pair: 'ETH-MKR', exchange: 'airswap' },
  { pair: 'ETH-OMG', exchange: 'kyber' },
  { pair: 'ETH-ZRX', exchange: 'kyber' },
  { pair: 'ETH-VEN', exchange: 'kyber' },
  { pair: 'ETH-AE', exchange: 'kyber' },
  { pair: 'ETH-REP', exchange: 'kyber' },
];

export const KYBER_ETH_TOKEN_ADDR: string = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

export const AIRSWAP_WEBSOCKET: object = {
  rinkeby: 'wss://sandbox.airswap-api.com/websocket',
  mainnet: 'wss://connect.airswap-api.com/websocket',
};

// source: https://github.com/OasisDEX/oasis-direct/blob/master/src/settings.json
export const CONTRACT_ADDRESSES: any = {
  kovan: {
    // dether
    DetherToken: '',
    Control: '',
    GeoRegistry: '',
    KycCertifier: '',
    SmsCertifier: '',
    Users: '',
    ZoneFactory: '',
    // external
    oasisProxyCreateExecute: '0xEE419971E63734Fed782Cfe49110b1544ae8a773',
    oasisDirectProxy: '0xe635f5f52220a114fea0985abf7ec8144710507b',
    dsProxyFactory: '0x93ffc328d601c4c5e9cc3c8d257e9afdaf5b0ac0',
    makerProxyRegistry: '0x383a7fc29edde64aec7f776e2517ec8819e147f1',
    makerOtc: '0x8cf1Cab422A0b6b554077A361f8419cDf122a9F9',
  },
  ropsten: {
    // dether
    DetherToken: '',
    Control: '',
    GeoRegistry: '',
    KycCertifier: '',
    SmsCertifier: '',
    Users: '',
    ZoneFactory: '',
    // external
    // Mkr/Oasis is not on ropsten
    // AirSwap is not on ropsten
    kyberNetworkProxy: '0x818E6FECD516Ecc3849DAf6845e3EC868087B755',
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
    // external
    // Mkr/Oasis is not on rinkeby
    airswapExchange: '0x07fc7c43d8168a2730344e5cf958aaecc3b42b41',
  },
  mainnet: {
    // dether
    DetherToken: '',
    Control: '',
    GeoRegistry: '',
    KycCertifier: '',
    SmsCertifier: '',
    Users: '',
    ZoneFactory: '',
    // external
    oasisProxyCreateExecute: ' 0x793ebbe21607e4f04788f89c7a9b97320773ec59',
    oasisDirectProxy: ' 0x279594b6843014376a422ebb26a6eab7a30e36f0',
    dsProxyFactory: ' 0x1043fbd15c10a3234664cbdd944a16a204f945e6',
    makerProxyRegistry: ' 0xaa63c8683647ef91b3fdab4b4989ee9588da297b',
    makerOtc: ' 0x14fbca95be7e99c15cc2996c6c9d841e54b79425',
    airswapExchange: '0x8fd3121013a07c57f0d69646e86e7a4880b467b7',
    kyberNetworkProxy: '0x818E6FECD516Ecc3849DAf6845e3EC868087B755',
  },
};
