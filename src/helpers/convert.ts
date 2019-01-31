import { ethers } from 'ethers';
import Web3 from 'web3';

const web3 = new Web3();

export const padZeroRight = (str: string, len: number) : string => (
  `${str}${'0'.repeat(len - remove0x(str).length)}`
);

export const weiToEth = (wei: string) : string => web3.utils.fromWei(wei);
export const ethToWei = (eth: number) : string => web3.utils.toWei(eth.toString(), 'ether');
export const ethToWeiBN = (eth: number) : ethers.utils.BigNumber => ethers.utils.bigNumberify(ethToWei(eth));
export const asciiToHex = (ascii: string) : string => web3.utils.asciiToHex(ascii);
export const remove0x = (txt: string) : string => txt.startsWith('0x') ? txt.slice(2) : txt;
export const add0x = (txt: string) : string => txt.startsWith('0x') ? txt : `0x${txt}`;
export const hexToAscii = (hex: string) : string => ethers.utils.parseBytes32String(add0x(padZeroRight(hex, 64)));
