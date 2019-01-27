import Web3 from 'web3';

const web3 = new Web3();

export const getRandomBytes32 = () : string => (
  web3.utils.randomHex(32)
);

// TODO:
export const getRandomIpfsHash = () : string => (
  'QmNSUYVKDSvPUnRLKmuxk9diJ6yS96r1TrAXzjTiBcCLAL'
);
