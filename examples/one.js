const ethers = require('ethers');
import DetherJS from '../lib/dether';
import BN from 'bignumber.js';

const USER_PASSWORD = '1234';
const USER_PRIV_KEY = '0x0123456789012345678901234567890123456789012345678901234567890321';
// // address: 0x391edA1b8D31f891d1653B131779751BdeDA24D3




const rpcURL = 'https://kovan.infura.io';
const detherJs = new DetherJS(false);

const destAddress = '0xB06c40B9c72231502949B33bC8b2543701C863Ef';
const sellToken = 'ETH'
const buyToken = 'DAI'
const value = '0.07';
let buyAmount;

let wallet;
let encryptedWallet;
let user;
detherJs.init({ rpcURL })
    .then(() => {
        //     return detherJs.getAllBalance('0xC5F8a06ed1CfB17d0366eF03FEDF37568B0ce246', ['ETH', 'DTH'])
        // }).then(res => {
        //     console.log('balance', res)
        //     return detherJs.getAvailableToken();
        // }).then(res => {
        return detherJs.getExchangeEstimation('ETH', 'DAI', ethers.utils.parseEther('1').toString());
    }).then(res => {
        console.log('res estiumation', res, typeof res)
        buyAmount = ethers.utils.parseEther(res).toString();
        const wallet = new ethers.Wallet(USER_PRIV_KEY, rpcURL);
        return wallet.encrypt(USER_PASSWORD);
    }).then(res => {
        encryptedWallet = res;
        return detherJs.loadUser(encryptedWallet);
    }).then(res => {
        console.log('params function test', sellToken, buyToken, ethers.utils.parseEther(value).toString(), buyAmount)
        return detherJs.execExchange(USER_PASSWORD, sellToken, buyToken, ethers.utils.parseEther(value).toString(), buyAmount);
    }).then(res => {
        //     console.log('1st tsx', res);
        //     return detherJs.sendCrypto(USER_PASSWORD, destAddress, 'ETH', value, { gasPrice: 22000000000 });
        // }).then(res => {
        console.log('tsx exchange => ', res);
    })

