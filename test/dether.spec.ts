/* eslint-disable object-curly-newline, max-len, padded-blocks, global-require, no-multi-spaces, no-restricted-syntax, no-await-in-loop, arrow-body-style, no-new, no-empty */
/* eslint-env node, mocha */
// import path from 'path';
import assert from 'assert';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';

import expect from './utils/chai';
// import * as timeTravel from './utils/timeTravel';
// import * as geo from './utils/geo';
import * as convert from './utils/convert';
// import * as evmErrors from './utils/evmErrors';
import * as ipfs from './utils/ipfs';
// import * as values from './utils/values';
import * as transaction from './utils/transaction';
import * as geo from './utils/geo';

import DetherTokenJson from '../abi/dether/DetherToken.json';
import ControlJson from '../abi/dether/Control.json';
import ExchangeRateOracleJson from '../abi/dether/FakeExchangeRateOracle.json';
import SmsCertifierJson from '../abi/dether/SmsCertifier.json';
import KycCertifierJson from '../abi/dether/KycCertifier.json';
import UsersJson from '../abi/dether/Users.json';
import GeoRegistryJson from '../abi/dether/GeoRegistry.json';
import ZoneFactoryJson from '../abi/dether/ZoneFactory.json';
import ZoneJson from '../abi/dether/Zone.json';
import ShopsJson from '../abi/dether/Shops.json';
import AppealableArbitratorJson from '../abi/dether/AppealableArbitrator.json';

import DetherJS from '../src/dether';

import {
  DetherContract, ExternalContract,
} from '../src/types';

const contractJson: any = {
  [DetherContract.DetherToken]: DetherTokenJson,
  [DetherContract.Control]: ControlJson,
  [DetherContract.ExchangeRateOracle]: ExchangeRateOracleJson,
  [DetherContract.SmsCertifier]: SmsCertifierJson,
  [DetherContract.KycCertifier]: KycCertifierJson,
  [DetherContract.Users]: UsersJson,
  [DetherContract.GeoRegistry]: GeoRegistryJson,
  [DetherContract.ZoneFactory]: ZoneFactoryJson,
  [DetherContract.Zone]: ZoneJson,
  [DetherContract.Shops]: ShopsJson,
  [ExternalContract.appealableArbitrator]: AppealableArbitratorJson,
};

assert(process.env.PRIVATE_KEY, 'missing env var PRIVATE_KEY');

const RPC_URL = 'http://localhost:8545';
// const TEST_PASS = 'test123';

const BYTES16_ZERO = '0x00000000000000000000000000000000';
const BYTES32_ZERO = '0x0000000000000000000000000000000000000000000000000000000000000000';
const KLEROS_ARBITRATION_PRICE = 1; // eth
const KLEROS_DISPUTE_TIMEOUT = 60; // seconds
const KLEROS_ARBITRATOR_EXTRADATA = '0x8575';
const PASS = 'secret';

const COUNTRY = 'CG';
const ZONE_GEOHASH = 'krcztse';
const SHOP_GEOHASH = 'krcztseeeeee';
const INITIAL_ETH_BALANCE = 7;
const INITIAL_DTH_BALANCE = 1000;
const SHOP_LICENSE_PRICE = 42;

const SHOP = {
  country: COUNTRY,
  position: SHOP_GEOHASH,
  // no need to specify the optional string args
};

// eslint-disable-next-line prefer-template
describe('DetherJS', () => {
  let detherJs: any;
  const accounts: any = {};
  const deployedContracts: any = {};

  let deployerBalanceBeforeDeploy: BigNumber;
  let deployerBalanceAfterDeploy: BigNumber;
  let deployerBalanceAfterInit: BigNumber;

  const sendEth = async (fromWallet: ethers.Wallet, ethAmount: number, toAddress: string) : Promise<any> => (
    transaction.waitForTxMined(fromWallet.sendTransaction({
      to: toAddress,
      value: convert.ethToWeiBN(ethAmount),
    }))
  );

  const sendDth = async (fromWallet: ethers.Wallet, dthAmount: number, toAddress: string) : Promise<any> => (
    // @ts-ignore
    transaction.waitForTxMined(deployedContracts.DetherToken.connect(fromWallet).mint(toAddress, convert.ethToWeiBN(dthAmount)))
  );

  const deployContract = async (wallet: ethers.Wallet, contractName: DetherContract|ExternalContract, ...args: any[]) => {
    const contractInfo: any = contractJson[contractName];
    const factory = new ethers.ContractFactory(contractInfo.abi, contractInfo.bytecode, wallet);
    const contract = await factory.deploy(...args);
    await contract.deployed();
    deployedContracts[contractName] = contract;
  };

  const printEth = async () => console.log('eth', {
    deployer: convert.weiToEth((await accounts.deployer.getBalance()).toString()),
    ceo: convert.weiToEth((await accounts.ceo.getBalance()).toString()),
    user1: convert.weiToEth((await accounts.user1.getBalance()).toString()),
    user2: convert.weiToEth((await accounts.user2.getBalance()).toString()),
    user3: convert.weiToEth((await accounts.user3.getBalance()).toString()),
    user4: convert.weiToEth((await accounts.user4.getBalance()).toString()),
  });

  const printDth = async () => console.log('dth', {
    deployer: convert.weiToEth((await deployedContracts.DetherToken.balanceOf(accounts.deployer.address)).toString()),
    ceo: convert.weiToEth((await deployedContracts.DetherToken.balanceOf(accounts.ceo.address)).toString()),
    user1: convert.weiToEth((await deployedContracts.DetherToken.balanceOf(accounts.user1.address)).toString()),
    user2: convert.weiToEth((await deployedContracts.DetherToken.balanceOf(accounts.user2.address)).toString()),
    user3: convert.weiToEth((await deployedContracts.DetherToken.balanceOf(accounts.user3.address)).toString()),
    user4: convert.weiToEth((await deployedContracts.DetherToken.balanceOf(accounts.user4.address)).toString()),
  });

  beforeEach(async () => {
    detherJs = new DetherJS(false); // default is use ethersjs instead of metamask, pass in true as 1st arg for metamask
    await detherJs.init({ rpcURL: RPC_URL });

    // NOTE: create everything new before each test

    //
    // reload the root account (== ganache first created account)
    //
    const ROOT_ACCOUNT = new ethers.Wallet(process.env.PRIVATE_KEY, detherJs.provider);

    //
    // create random accounts
    //
    accounts.deployer = ethers.Wallet.createRandom().connect(detherJs.provider);
    accounts.ceo = ethers.Wallet.createRandom().connect(detherJs.provider);
    accounts.user1 = ethers.Wallet.createRandom().connect(detherJs.provider);
    accounts.user2 = ethers.Wallet.createRandom().connect(detherJs.provider);
    accounts.user3 = ethers.Wallet.createRandom().connect(detherJs.provider);
    accounts.user4 = ethers.Wallet.createRandom().connect(detherJs.provider);

    //
    // give eth to all created test accounts
    //
    await sendEth(ROOT_ACCOUNT, INITIAL_ETH_BALANCE, accounts.deployer.address);
    await sendEth(ROOT_ACCOUNT, INITIAL_ETH_BALANCE, accounts.ceo.address);
    await sendEth(ROOT_ACCOUNT, INITIAL_ETH_BALANCE, accounts.user1.address);
    await sendEth(ROOT_ACCOUNT, INITIAL_ETH_BALANCE, accounts.user2.address);
    await sendEth(ROOT_ACCOUNT, INITIAL_ETH_BALANCE, accounts.user3.address);
    await sendEth(ROOT_ACCOUNT, INITIAL_ETH_BALANCE, accounts.user4.address);

    //
    // deploy all Dapp contracts
    //
    deployerBalanceBeforeDeploy = await accounts.deployer.getBalance(); // returns wei as BigNumber

    await deployContract(accounts.deployer, DetherContract.DetherToken);
    await deployContract(accounts.deployer, DetherContract.ExchangeRateOracle);
    await deployContract(accounts.deployer, DetherContract.Control);
    await deployContract(accounts.deployer, DetherContract.SmsCertifier, deployedContracts.Control.address);
    await deployContract(accounts.deployer, DetherContract.KycCertifier, deployedContracts.Control.address);
    await deployContract(accounts.deployer, DetherContract.GeoRegistry, deployedContracts.Control.address);
    await deployContract(accounts.deployer, DetherContract.Zone);
    await deployContract( // deploy Users
      accounts.deployer,
      DetherContract.Users,
      deployedContracts.ExchangeRateOracle.address,
      deployedContracts.GeoRegistry.address,
      deployedContracts.SmsCertifier.address,
      deployedContracts.KycCertifier.address,
      deployedContracts.Control.address,
    );
    await deployContract( // deploy ZoneFactory
      accounts.deployer,
      DetherContract.ZoneFactory,
      deployedContracts.DetherToken.address,
      deployedContracts.GeoRegistry.address,
      deployedContracts.Users.address,
      deployedContracts.Control.address,
      deployedContracts.Zone.address,
    );

    await deployContract( // deploy AppealableArbitrator
      accounts.deployer,
      ExternalContract.appealableArbitrator,
      convert.ethToWeiBN(KLEROS_ARBITRATION_PRICE),
      accounts.deployer.address,
      KLEROS_ARBITRATOR_EXTRADATA,
      KLEROS_DISPUTE_TIMEOUT,
    );
    await transaction.waitForTxMined(deployedContracts.appealableArbitrator.connect(accounts.deployer).changeArbitrator(deployedContracts.appealableArbitrator.address));

    await deployContract( // deploy Shops
      accounts.deployer,
      DetherContract.Shops,
      deployedContracts.DetherToken.address,
      deployedContracts.GeoRegistry.address,
      deployedContracts.Users.address,
      deployedContracts.Control.address,
      deployedContracts.appealableArbitrator.address,
      KLEROS_ARBITRATOR_EXTRADATA,
    );

    deployerBalanceAfterDeploy = await accounts.deployer.getBalance(); // returns wei as BigNumber

    //
    // init Dapp
    //
    await transaction.waitForTxMined(deployedContracts.Control.connect(accounts.deployer).functions.setCEO(accounts.ceo.address));
    await transaction.waitForTxMined(deployedContracts.Users.connect(accounts.ceo).functions.setZoneFactory(deployedContracts.ZoneFactory.address));
    await transaction.waitForTxMined(deployedContracts.SmsCertifier.connect(accounts.ceo).functions.addDelegate(accounts.ceo.address));
    await transaction.waitForTxMined(deployedContracts.GeoRegistry.connect(accounts.ceo).functions.setCountryTierDailyLimit(convert.asciiToHex(COUNTRY), '0', '1000'));
    await transaction.waitForTxMined(deployedContracts.GeoRegistry.connect(accounts.ceo).functions.enableCountry(convert.asciiToHex(COUNTRY)));
    await transaction.waitForTxMined(deployedContracts.Shops.connect(accounts.ceo).functions.setCountryLicensePrice(convert.asciiToHex(COUNTRY), convert.ethToWeiBN(SHOP_LICENSE_PRICE)));
    await transaction.waitForTxMined(deployedContracts.Shops.connect(accounts.ceo).addDisputeType('my first metaevidence line'));
    await transaction.waitForTxMined(deployedContracts.SmsCertifier.connect(accounts.ceo).functions.certify(accounts.user1.address));
    await transaction.waitForTxMined(deployedContracts.SmsCertifier.connect(accounts.ceo).functions.certify(accounts.user2.address));

    deployerBalanceAfterInit = await accounts.deployer.getBalance(); // returns wei as BigNumber

    //
    // add country CG
    //
    await geo.addCountry(accounts.ceo, deployedContracts.GeoRegistry, COUNTRY);

    //
    // give DTH to all created accounts
    //
    await sendDth(accounts.deployer, INITIAL_DTH_BALANCE, accounts.deployer.address); // need to mint for ourselves
    await sendDth(accounts.deployer, INITIAL_DTH_BALANCE, accounts.ceo.address);
    await sendDth(accounts.deployer, INITIAL_DTH_BALANCE, accounts.user1.address);
    await sendDth(accounts.deployer, INITIAL_DTH_BALANCE, accounts.user2.address);
    await sendDth(accounts.deployer, INITIAL_DTH_BALANCE, accounts.user3.address);
    await sendDth(accounts.deployer, INITIAL_DTH_BALANCE, accounts.user4.address);

    //
    // hookup detherJs to the just deployed+inited Dapp contracts
    //
    await detherJs.setCustomContractAddresses({
      DetherToken: deployedContracts.DetherToken.address,
      Control: deployedContracts.Control.address,
      GeoRegistry: deployedContracts.GeoRegistry.address,
      KycCertifier: deployedContracts.KycCertifier.address,
      SmsCertifier: deployedContracts.SmsCertifier.address,
      Users: deployedContracts.Users.address,
      ZoneFactory: deployedContracts.ZoneFactory.address,
      Zone: deployedContracts.Zone.address,
      Shops: deployedContracts.Shops.address,
    });
  });

  describe('wallet', () => {
    describe('getters', () => {
      describe('get all balances', () => {
        it('should succeed', async () => {
          const result = await detherJs.getAllBalance(accounts.deployer.address, ['ETH', 'DTH']);
          expect(result);
        });
      });
      describe('get exchange rate estimation', () => {
        it('should succeed', async () => {
          // can only be tested on testnets/mainnet
        });
      });
    });
    describe('setters', () => {
      describe('execute exchange trade', () => {
        it('should succeed', async () => {
          // can only be tested on testnets/mainnet
        });
      });
    });
  });

  describe('zone', () => {
    describe('getters', () => {
      describe('get zone owner', () => {
        it('should succeed', async () => {

        });
      });
      describe('get zone auction', () => {
        it('should succeed', async () => {

        });
      });
    });
    describe('setters', () => {
      describe('create zone', () => {
        it.only('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          const tx = await transaction.waitForTxMined(detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH));
          console.log(tx);
        });
      });
      describe('claim free zone', () => {
        it('should succeed', async () => {

        });
      });
      describe('bid on zone', () => {
        it('should succeed', async () => {

        });
      });
      describe('release zone ownership', () => {
        it('should succeed', async () => {

        });
      });
      describe('withdraw lost auction dth bids', () => {
        it('should succeed', async () => {

        });
      });
      describe('withdraw leftover stake after zone ownership loss', () => {
        it('should succeed', async () => {

        });
      });
    });
  });

  describe('tellers', () => {
    beforeEach(async () => {
      detherJs.loadUser(await accounts.user1.encrypt(PASS));
      // await transaction.waitForTxMined(detherJs.addShop(PASS, ZONE_GEOHASH));
    });
    describe('getters', () => {
      describe('get teller', () => {
        it('should succeed', async () => {

        });
      });
      describe('get tellers in zones', () => {
        it('should succeed', async () => {

        });
      });
    });
    describe('setters', () => {
      describe('create teller', () => {
        it('should succeed', async () => {

        });
      });
      describe('remove teller', () => {
        it('should succeed', async () => {

        });
      });
      describe('add funds to teller', () => {
        it('should succeed', async () => {

        });
      });
      describe('sell eth from teller', () => {
        it('should succeed', async () => {

        });
      });
      describe('add comment on teller', () => {
        it('should succeed', async () => {

        });
      });
      describe('add certified comment after trafed with teller', () => {
        it('should succeed', async () => {

        });
      });
    });
  });

  describe('shops', () => {
    describe('getters', () => {
      describe('shop exists', () => {
        it('should succeed', async () => {

        });
      });
      describe('get shop by address', () => {
        it('should succeed', async () => {

        });
      });
      describe('get shop by position', () => {
        it('should succeed', async () => {

        });
      });
      describe('get shops in zone', () => {
        it('should succeed', async () => {

        });
      });
      describe('get dispute by dispute id', () => {
        it('should succeed', async () => {

        });
      });
      describe('get dispute create cost', () => {
        it('should succeed', async () => {

        });
      });
      describe('get dispute appeal cost', () => {
        it('should succeed', async () => {

        });
      });
      describe('get dispute by dispute id', () => {
        it('should succeed', async () => {

        });
      });
    });
    describe('setters', () => {
      describe('create shop', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          const tx = await transaction.waitForTxMined(detherJs.addShop(PASS, SHOP));
        });
      });
      describe('remove shop', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.addShop(PASS, SHOP));
          const tx = await transaction.waitForTxMined(detherJs.removeShop(PASS));
        });
      });
      describe('create dispute', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.addShop(PASS, SHOP));
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          const tx = await transaction.waitForTxMined(detherJs.createDispute(PASS, accounts.user1.address, ipfs.getRandomIpfsHash()));
          console.log(JSON.stringify(tx.events.map((x: any) => ({ topics: x.topics, args: x.args })), null, 4));
        });
      });
      describe('appeal dispute', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.addShop(PASS, SHOP));
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.createDispute(PASS, accounts.user1.address, ipfs.getRandomIpfsHash()));
          const tx = await transaction.waitForTxMined(detherJs.appealDispute(PASS, accounts.user1.address, ipfs.getRandomIpfsHash()));
        });
      });
    });
  });
});
