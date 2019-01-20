export const BYTES1_ZERO = '0x00';
export const BYTES7_ZERO = '0x00000000000000';
export const BYTES12_ZERO = '0x000000000000000000000000';
export const BYTES16_ZERO = '0x00000000000000000000000000000000';
export const BYTES32_ZERO = '0x0000000000000000000000000000000000000000000000000000000000000000';
export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';
export const ADDRESS_BURN = '0xffffffffffffffffffffffffffffffffffffffff';

export const COUNTRY_CG = 'CG';
export const VALID_CG_ZONE_GEOHASH = 'krcztse'; // krcz is in CG
export const INVALID_CG_ZONE_GEOHASH = 'krcttse'; // krct is not in CG
export const NONEXISTING_CG_ZONE_GEOHASH = 'krcatse'; // krca, a is not a valid geohash char
export const VALID_CG_SHOP_GEOHASH = 'krcztseeeeee'; // krcz is in CG
export const VALID_CG_SHOP_GEOHASH_2 = 'krcytseeeeee'; // krcy is alo in CG
export const INVALID_CG_SHOP_GEOHASH = 'krcatseeeeee'; // krca, a is not a valid geohash char
export const NONEXISTING_CG_SHOP_GEOHASH = 'krcttseeeeee'; // krct is not in CG

export const CG_SHOP_LICENSE_PRICE = 42;
export const MIN_ZONE_DTH_STAKE = 100;

export const ONE_HOUR = 60 * 60;
export const ONE_DAY = ONE_HOUR * 24;
export const BID_PERIOD = ONE_DAY;
export const COOLDOWN_PERIOD = ONE_DAY * 2;

export const KLEROS_ARBITRATION_PRICE = 1; // eth
export const KLEROS_DISPUTE_TIMEOUT = 60; // seconds
export const KLEROS_ARBITRATOR_EXTRADATA = 0x08575;
export const KLEROS_SHOP_WINS = 1;
export const KLEROS_CHALLENGER_WINS = 2;
export const KLEROS_NO_RULING = 0;

export const ZONE_AUCTION_STATE_STARTED = 0;
export const ZONE_AUCTION_STATE_ENDED = 1;

export const TELLER_CG_POSITION = 'krcztsebcddd';
export const TELLER_CG_CURRENCY_ID = '1';
export const TELLER_CG_MESSENGER = 'my_telegram_nick';
export const TELLER_CG_SELLRATE = '177'; // 1.77%
export const TELLER_CG_BUYRATE = '1364'; // 13.64%
export const TELLER_CG_SETTINGS = '0x03'; // 0000 0011 <-- both buyer and seller bit set
