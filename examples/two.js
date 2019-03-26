const ethers = require('ethers');
import DetherJS from '../lib/dether';
import BN from 'bignumber.js';

const USER_PASSWORD = '1234';


const USER_PRIV_KEY = '';
const address = ''
const rpcURL = 'https://kovan.infura.io';
// const rpcURL = 'https://mainnet.infura.io';
const detherJs = new DetherJS(false);

const destAddress = '0xB06c40B9c72231502949B33bC8b2543701C863Ef';
const sellToken = 'ETH'
const buyToken = 'DAI'
const value = '0.32111';

let buyAmount;

let encryptedWallet;
let user;

const approveToken = async (token) => await detherJs.approveToken(USER_PASSWORD, token)
const checkApproved = () => detherJs.hasApproval(address, buyToken, '44444444');

const sendDelayedExchangeRawTx = async buyAmount => {
  const txCount = await detherJs.provider.getTransactionCount(address)
  const nonce = txCount + 1
  const rawTx = await detherJs.execExchange_delayed(USER_PASSWORD, sellToken, buyToken, ethers.utils.parseEther(value).toString(), buyAmount, nonce)
  console.log('Raw tx: ', rawTx)
  const txResponse = await detherJs.provider.sendTransaction(rawTx)
  console.log('txResponse', txResponse)
  return txResponse.hash
}

const execExchange = buyAmount => detherJs.execExchange(USER_PASSWORD, sellToken, buyToken, ethers.utils.parseEther(value).toString(), buyAmount)


const getEstimation = async () => detherJs.getExchangeEstimation(sellToken, buyToken, ethers.utils.parseEther(value).toString())

const testUniswap = async () => {
  await detherJs.init({ rpcURL })
  const esimation = await getEstimation()
  const buyAmount = ethers.utils.parseEther(esimation).toString();
  console.log('buyAmount: ', buyAmount)
  const wallet = new ethers.Wallet(USER_PRIV_KEY, rpcURL)
  const encryptedWallet = await wallet.encrypt(USER_PASSWORD);
  await detherJs.loadUser(encryptedWallet)
  // const result = await sendDelayedExchangeRawTx(buyAmount)
  const result = await execExchange(buyAmount)
  console.log('exec exchange result: ', result)
}

testUniswap()
