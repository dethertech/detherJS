// const ethers = require('ethers');
import DetherJS from '../lib/dether';
import dether from '../lib/dether';

const rpcURL = 'https://kovan.infura.io';

const detherJs = new DetherJS(false);
detherJs.init({ rpcURL })
    .then(() => {
        return detherJs.getAllBalance('0xC5F8a06ed1CfB17d0366eF03FEDF37568B0ce246', ['ETH', 'DTH'])
    }).then(res => {
        console.log('result', res)
        return detherJs.getAvailableToken(true);
    }).then(res => {
        console.log('tokens => ', res)
    });



// (async () => {
//     const detherJs = new DetherJS(false); // default is use ethersjs instead of metamask, pass in true as 1st arg for metamask
//     await detherJs.init({ rpcURL });
//     const result = await detherJs.getAllBalance('0xC5F8a06ed1CfB17d0366eF03FEDF37568B0ce246', ['ETH', 'DTH']);
//     console.log('result', result);
// })


