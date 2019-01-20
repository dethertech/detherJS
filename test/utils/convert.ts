import Web3 from 'web3';

const web3 = new Web3();

export const ethToWei = (eth: number) : string => web3.utils.toWei(eth.toString(), 'ether');
export const asciiToHex = (ascii: string) : string => web3.utils.asciiToHex(ascii);
export const remove0x = (txt: string) : string => txt.startsWith('0x') ? txt.slice(2) : txt;
