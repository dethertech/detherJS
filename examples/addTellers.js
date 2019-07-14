const ethers = require('ethers');
const fs = require("fs");

import DetherJS from '../lib/dether';
import forAsync from "for-async";
import ERC20 from '../abi/external/erc20.json';

export const waitForTxMined = (tsxPromise) => tsxPromise.then((tsx) => tsx.wait());


const USER_PRIV_KEY = '';

const MNEMONIC = process.env.MNEMONIC;
const PASS = '1234'

const address = ''
const rpcURL = 'https://kovan.infura.io';
// const rpcURL = 'https://mainnet.infura.io';
const detherJs = new DetherJS(false);

// const addressCertifier = '0xA085c33483c023C6a8eB24d0F94957074d27B256';
// const certifierID = '0x32BedF6609f002A591f871009C8e66D84F98d48E';
const addressDth = '0x9027E9FC4641e2991A36Eaeb0347Bc5b35322741';



const COUNTRY = 'JP';
const CITY_GEOHASH = 'xn0m'; // osaka
// const CITY_GEOHASH = 'xn77'; // tokyo

const TELLER_TIER = 1;

const TELLER_1 = {
    position: 'xngstsebcddd',
    currencyId: 1,
    messenger: 'my_telegram_nick',
    isSeller: true,
    sellRate: 177, // 1.77%
    isBuyer: true,
    buyRate: 334, // 13.44%
    referrer: '0x26F3d9f700111338092cd534126fb3832575aEA2',
    refFees: 210,
    description: 'BTC-XMR-DOGE'
};


const SHOP = {
    country: 'JP',
    position: 'krcztseeeeee',
    category: 'random',
    name: 'random',
    decription: 'random',
    opening: 'qOqOqOqOqOqOqO',
}

const SHOP_2 = {
    country: 'JP',
    position: 'krcztseeeeee',
    category: 'random',
    name: 'random',
    decription: 'random',
    opening: 'qOqOqOqOqOqOqO',
}

const geohashChar = [
    'v',
    'y',
    'z',
    'b',
    'c',
    'f',
    'g',
    'u',
    't',
    'w',
    'x',
    '8',
    '9',
    'd',
    'e',
    's',
    'm',
    'q',
    'r',
    '2',
    '3',
    '6',
    '7',
    'k',
    'j',
    'n',
    'p',
    '0',
    '1',
    '4',
    '5',
    'h',
]

// take a 4 char geohash and give an array with all 6 characters geohash present on it
const giveAllGeohash6 = (base4) => {
    const allGeohash6 = []
    geohashChar.forEach(element => {
        geohashChar.forEach(subElements => {
            allGeohash6.push(`${base4}${element}${subElements}`);
        })
    });
    return allGeohash6;
}
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}
const giveRandomGeohash = (base6) => {
    let geoHash12 = base6;
    for (let i = 0; i < 6; i++) {
        geoHash12 = geoHash12 + geohashChar[getRandomInt(0, 32)];
    }
    return geoHash12;
}
function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

const fillZoneGeohash4 = async () => {
    await detherJs.init({ rpcURL })

    /* add teller and shop in loop in Osaka */

    // ---> loop on geohash array
    // 0 . create sub geohash zones
    // on each geohash6:
    // 1. create a new wallet from mnemonic
    // 2. send a few kovan on this new address
    // 3. certify this new wallet with main wallet
    // 4. create zone & addTeller
    // 5. create 3 new wallet from mnemonic
    // 6. create 3 new shop
    // 7. write private key in a file
    // end loop

    /*
     * INIT
     */
    const mnemonicWallet = new ethers.Wallet.fromMnemonic(MNEMONIC);
    const provider = new ethers.providers.JsonRpcProvider(rpcURL);
    const mainWallet = mnemonicWallet.connect(provider);

    // const certifierContractAlone = new ethers.Contract(addressCertifier, CertifierRegistry.abi, provider);
    // const certifierContract = certifierContractAlone.connect(mainWallet);

    const dthContractAlone = new ethers.Contract(addressDth, ERC20, provider);
    const dthContract = dthContractAlone.connect(mainWallet);
    /*
     * create subgeohash zones
     */

    const allGeohashes = giveAllGeohash6(CITY_GEOHASH);
    let counter = 0;
    forAsync(allGeohashes, function (zoneGeohash6, idx) {
        return new Promise(function (resolve) {
            setTimeout(async function () {
                console.log('--> NEW ZONE <--', zoneGeohash6, idx, counter);

                if (idx >= counter) {
                    /*
                    * 1. Create new wallet from mnemonic
                    */
                    let path = `m/44'/60'/1'/${idx + 1}`;
                    let newMnemonicWallet = ethers.Wallet.fromMnemonic(MNEMONIC, path);
                    let newConnectedWallet = newMnemonicWallet.connect(provider);
                    let tx = await mainWallet.sendTransaction({ to: newConnectedWallet.address, value: ethers.utils.parseEther('0.2') })
                    await tx.wait();
                    tx = await dthContract.transfer(newConnectedWallet.address, ethers.utils.parseEther('110'))
                    await tx.wait();
                    console.log('dth transfer', tx);
                    /*
                    * 3. Certify this user
                    */
                    // tx = await certifierContract.certify(certifierID, newConnectedWallet.address, 1)
                    // console.log('tx certify', tx.hash);

                    /*
                    * 4 create zone and teller
                    */
                    // --> create zone
                    detherJs.loadUser(await newConnectedWallet.encrypt(PASS));
                    try {
                        console.log('create zone params', COUNTRY, zoneGeohash6);
                        tx = await detherJs.createZone(PASS, COUNTRY, zoneGeohash6, { gasLimit: 3000000 });
                        await tx.wait();
                        console.log('tx create zone post wait', tx)
                    } catch (e) {
                        console.log('error create zone', zoneGeohash6, idx, e);
                    }
                    // --> add teller
                    TELLER_1.position = giveRandomGeohash(zoneGeohash6);
                    TELLER_1.messenger = makeid(getRandomInt(6, 15));
                    try {
                        tx = await detherJs.addTeller(PASS, TELLER_1, { gasLimit: 3000000 });
                        console.log('tx add teller', tx.hash);
                    } catch (e) {
                        console.log('error add teller', zoneGeohash6, idx, e);
                    }
                    let toWrite = `${newConnectedWallet.address};${newConnectedWallet.privateKey};${zoneGeohash6};;\n`
                    await fs.writeFileSync('./testnetUsers.csv', toWrite, { flag: 'a' });

                    /*
                    * 5 create 2 shops
                    */
                    // --> first shop
                    path = `m/44'/60'/1'/${idx * 3 + 2}`;
                    newMnemonicWallet = ethers.Wallet.fromMnemonic(MNEMONIC, path);
                    newConnectedWallet = newMnemonicWallet.connect(provider);
                    tx = await mainWallet.sendTransaction({ to: newConnectedWallet.address, value: ethers.utils.parseEther('0.2') })
                    await tx.wait();
                    tx = await dthContract.transfer(newConnectedWallet.address, ethers.utils.parseEther('50'))
                    await tx.wait();

                    detherJs.loadUser(await newConnectedWallet.encrypt(PASS));
                    SHOP.position = giveRandomGeohash(zoneGeohash6);
                    SHOP.category = makeid(getRandomInt(6, 15));
                    SHOP.description = makeid(getRandomInt(6, 24));
                    SHOP.name = makeid(getRandomInt(6, 19));
                    try {
                        tx = await detherJs.addShop(PASS, SHOP, { gasLimit: 2000000 })
                        console.log('tx add shop 1', tx.hash);
                    } catch (e) {
                        console.log('error add shop', zoneGeohash6, idx, SHOP, e);
                    }
                    toWrite = `${newConnectedWallet.address};${newConnectedWallet.privateKey};;${SHOP.position};${SHOP.name}\n`
                    await fs.writeFileSync('./testnetUsers.csv', toWrite, { flag: 'a' });

                    // --> second shop
                    path = `m/44'/60'/1'/${idx * 3 + 3}`;
                    newMnemonicWallet = ethers.Wallet.fromMnemonic(MNEMONIC, path);
                    newConnectedWallet = newMnemonicWallet.connect(provider);
                    tx = await mainWallet.sendTransaction({ to: newConnectedWallet.address, value: ethers.utils.parseEther('0.2') })
                    await tx.wait();
                    tx = await dthContract.transfer(newConnectedWallet.address, ethers.utils.parseEther('50'))
                    await tx.wait();

                    detherJs.loadUser(await newConnectedWallet.encrypt(PASS));
                    SHOP.position = giveRandomGeohash(zoneGeohash6);
                    SHOP.category = makeid(getRandomInt(6, 15));
                    SHOP.description = makeid(getRandomInt(6, 24));
                    SHOP.name = makeid(getRandomInt(6, 19));
                    try {
                        tx = await detherJs.addShop(PASS, SHOP, { gasLimit: 2000000 })
                        console.log('tx add shop 2', tx.hash);
                    } catch (e) {
                        console.log('error add shop', zoneGeohash6, idx, SHOP, e);
                    }
                    toWrite = `${newConnectedWallet.address};${newConnectedWallet.privateKey};;${SHOP.position};${SHOP.name}\n`
                    await fs.writeFileSync('./testnetUsers.csv', toWrite, { flag: 'a' });
                }
                console.log('--> END ZONE <--');
                resolve();
            }, 500);
        })
    })
}

fillZoneGeohash4();