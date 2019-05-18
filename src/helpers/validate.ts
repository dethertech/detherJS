import { ethers } from 'ethers';

import {
  Unit, Token,
} from '../types';

const COUNTRY_CODES = [
  'AD', 'AU', 'BI', 'BZ', 'CO', 'DO', 'FK', 'GL', 'HM', 'IQ', 'KI', 'LI', 'ME', 'MS', 'NF', 'PE', 'PW', 'SE', 'ST', 'TL',
  'UM', 'WF', 'AE', 'WS', 'AF', 'YE', 'AG', 'ZA', 'AI', 'ZM', 'AL', 'ZW', 'AM', 'AR', 'AO', 'AS', 'AT',
  'AW', 'BJ', 'CA', 'CR', 'DZ', 'FM', 'GM', 'HN', 'IR', 'KM', 'LK', 'MF', 'MT', 'NG', 'PF', 'PY', 'SG', 'SV', 'TM', 'US',
  'AX', 'BL', 'CD', 'CU', 'EC', 'FO', 'GN', 'HR', 'IS', 'KN', 'LR', 'MG', 'MU', 'NI', 'PG', 'QA', 'SH', 'SX', 'TN', 'UY',
  'AZ', 'BM', 'CF', 'CV', 'EE', 'FR', 'GQ', 'HT', 'IT', 'KP', 'LS', 'MH', 'MV', 'NL', 'PH', 'RO', 'SI', 'SY', 'TO', 'UZ',
  'BA', 'BN', 'CG', 'CW', 'EG', 'GA', 'GR', 'HU', 'JE', 'KR', 'LT', 'MK', 'MW', 'NO', 'PK', 'RS', 'SK', 'SZ', 'TR', 'VA',
  'BB', 'BO', 'CH', 'CY', 'EH', 'GB', 'GS', 'ID', 'JM', 'KW', 'LU', 'ML', 'MX', 'NP', 'PL', 'RU', 'SL', 'TC', 'TT', 'VC',
  'BD', 'BR', 'CI', 'CZ', 'ER', 'GD', 'GT', 'IE', 'JO', 'KY', 'LV', 'MM', 'MY', 'NR', 'PM', 'RW', 'SM', 'TD', 'TV', 'VE',
  'BE', 'BS', 'CK', 'DE', 'ES', 'GE', 'GU', 'IL', 'JP', 'KZ', 'LY', 'MN', 'MZ', 'NU', 'PN', 'SA', 'SN', 'TF', 'TW', 'VG',
  'BF', 'BT', 'CL', 'DJ', 'ET', 'GG', 'GW', 'IM', 'KE', 'LA', 'MA', 'MO', 'NA', 'NZ', 'PR', 'SB', 'SO', 'TG', 'TZ', 'VI',
  'BG', 'BW', 'CM', 'DK', 'FI', 'GH', 'GY', 'IN', 'KG', 'LB', 'MC', 'MP', 'NC', 'OM', 'PS', 'SC', 'SR', 'TH', 'UA', 'VN',
  'BH', 'BY', 'CN', 'DM', 'FJ', 'GI', 'HK', 'IO', 'KH', 'LC', 'MD', 'MR', 'NE', 'PA', 'PT', 'SD', 'SS', 'TJ', 'UG', 'VU',
];

const GEOHAS_CHARS = [
  'v', 'y', 'z', 'b', 'c', 'f', 'g', 'u', 't', 'w', 'x', '8', '9', 'd', 'e', 's',
  'm', 'q', 'r', '2', '3', '6', '7', 'k', 'j', 'n', 'p', '0', '1', '4', '5', 'h',
];

export const geohash = (str: string, len: number): void => {
  if (str.length !== len) throw new Error(`expecting geohash to be at least ${len} characters`);
  for (const char of str) {
    if (!GEOHAS_CHARS.includes(char)) throw new Error(`character '${char}' is not a valid geohash char`);
  }
};

// source: https://ethereum.stackexchange.com/a/1379
export const ethAddress = (address: string): void => {
  // TODO: reove this
  // @ts-ignore
  address = address.toLowerCase();

  if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
    // check if it has the basic requirements of an address
    throw new Error(`invalid ethereum address: ${address}`);
  }

  if (/^(0x)?[0-9a-f]{40}$/.test(address) || /^(0x)?[0-9A-F]{40}$/.test(address)) {
    // If it's all small caps or all all caps, return true
    return;
  }

  // Otherwise check each case
  const addressHash = ethers.utils.keccak256(address.toLowerCase()).replace('0x', '');
  const addressNo0x = address.replace('0x', '');
  for (let i = 0; i < 40; i += 1) {
    // the nth letter should be uppercase if the nth digit of casemap is 1
    if ((parseInt(addressHash[i], 16) > 7 && addressNo0x[i].toUpperCase() !== addressNo0x[i]) ||
      (parseInt(addressHash[i], 16) <= 7 && addressNo0x[i].toLowerCase() !== addressNo0x[i])) {
      throw new Error(`invalid ethereum address: ${address}`);
    }
  }
};

export const countryCode = (country: string): void => {
  if (!COUNTRY_CODES.includes(country)) throw new Error(`invalid country code: ${country}`);
};

export const sellAmountUnit = (unit: Unit): void => {
  if (!Object.keys(Unit).includes(unit)) {
    throw new Error('invalid unit (2nd arg) specified, allowed values: eth, wei, usd');
  }
};

export const token = (token: Token) => {
  if (!Object.keys(Token).includes(token)) {
    throw new Error(`ticker ${token} is not a valid token`);
  }
};

export const txHash = (txHash: string) => {
  if (!/^0x([A-Fa-f0-9]{64})$/.test(txHash)) {
    throw new Error(`invalid transaction hash: ${txHash}`);
  }
};

export const sellAmount = (sellAmount: number) => {
  if (!sellAmount || typeof sellAmount !== 'number' || sellAmount < 0) {
    throw new Error(`invalid sell amount: ${sellAmount}`);
  }
};

export const refFees = (reffees: number) => {
  if (!reffees || typeof reffees !== 'number' || reffees < 0) {
    throw new Error(`invalid sell amount: ${reffees}`);
  }
};

export const currencyId = (currencyId: number) => {
  if (!Number.isInteger(currencyId) || currencyId < 1 || currencyId > 100) {
    throw new Error('invalid currency');
  }
};

export const tellerBuyerInfo = (isBuyer: boolean, buyRate: number) => {
  if (!isBuyer && buyRate) throw new Error('cannot set buyRate when not set as buyer');
  if (buyRate > 9999 || buyRate < -9999) throw new Error('buyRate minimum is -99.99, maximum is 99.99');
};

export const tellerSellerInfo = (isSeller: boolean, sellRate: number) => {
  if (!isSeller && sellRate) throw new Error('cannot set sellRate when not set as seller');
  if (sellRate > 9999 || sellRate < -9999) throw new Error('sellRate minimum is -99.99, maximum is 99.99');
};

// source: https://core.telegram.org/method/account.checkUsername
export const telegramUsername = (messenger: string | undefined) => {
  if (typeof messenger !== 'string') throw new Error('teller messenger should be a string');
  if (messenger.length < 5 || messenger.length > 32) throw new Error('telegram username should be between 5 and 32 characters');
  if (!/[A-Za-z0-9_]/g.test(messenger)) throw new Error('invalid characters in telegram username');
};

export const shopDisputeID = (disputeID: number) => {
  if (!Number.isInteger(disputeID) || disputeID) {
    throw new Error('invalid disputeID');
  }
};

export const tier = (tier: number) => {
  if (!Number.isInteger(tier)) {
    throw new Error('invalid tier');
  }
}

export const url = (url: string) => {
  if (!/(http[s]?:\/\/)?[^\s(["<,>]*\.[^\s[",><]*/.test(url)) {
    throw new Error(`invalid url: ${url}`);
  }
}
export const ipfsHash = (_: any) => true; // TODO
