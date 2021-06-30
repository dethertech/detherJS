import { ethers } from 'ethers';
import utf8 from 'utf8';
import bs58 from 'bs58';

export const stringToBytes = (str: string, len: number) => (
  ethers.utils.formatBytes32String(str).slice(0, 2 + (len * 2)) // 1 byte = 2 hex chars
);

export const toUtf8 = (hex: string) : string => {
  if (hex.startsWith('0x')) hex = hex.slice(2); // tslint:disable-line
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    const code = parseInt(hex.substr(i, 2), 16);
    if (code === 0) break;
    str += String.fromCharCode(code);
  }
  try {
    return utf8.decode(str);
  } catch (e) {
    return '';
  }
};

export const timestampNow = () : number => (
  Math.floor(Date.now() / 1000)
);

export const add0x = (txHash: string) : string => (
  txHash.startsWith('0x') ? txHash : `0x${txHash}`
);

export const remove0x = (val: string) : string => (
  val.replace('0x', '')
);

export const toNBytes = (str: string, n: number) : string => {
  let buffer = '';
  for (let i = 0; i < n; i += 1) {
    buffer += str[i] ? str[i].charCodeAt(0).toString(16) : '00';
  }
  return buffer;
};

// Add our default ipfs values for first 2 bytes:
// function:0x12=sha2, size:0x20=256 bits + cut off leading '0x'
export const bytes32ToIpfsHash = (bytes32Hex: string) : string => (
  bs58.encode(Buffer.from(`1220${bytes32Hex.slice(2)}`, 'hex'))
);

// storing IPFS has as bytes32 helper functions --> https://ethereum.stackexchange.com/a/39961
export const ipfsHashToBytes32 = (ipfsListing: string) : string => (
  `0x${bs58.decode(ipfsListing).slice(2).toString('hex')}`
);

/**
 * return the max uint256 value, which is 2^256 - 1
 *
 * @return {BigNumber} max uint256 value as a BigNumber
 */
export const getMaxUint256Value = () : ethers.utils.BigNumber => (
  ethers.utils.bigNumberify(2).pow(256).sub(1)
);
