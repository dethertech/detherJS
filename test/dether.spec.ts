/* eslint-disable object-curly-newline, max-len, padded-blocks, global-require, no-multi-spaces, no-restricted-syntax, no-await-in-loop, arrow-body-style, no-new, no-empty */
/* eslint-env node, mocha */
// import path from 'path';
import assert from 'assert';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import Web3 from 'web3';

import expect from './utils/chai';
import TimeTravel from './utils/timeTravel';
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
  ITellerArgs, IShopArgs,
  DetherContract, ExternalContract, ShopDisputeRuling, ShopDisputeStatus,
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

const web3 = new Web3('http://localhost:8545');
const timeTravel = new TimeTravel(web3);

const RPC_URL = 'http://localhost:8545';
// const TEST_PASS = 'test123';

const KLEROS_ARBITRATION_PRICE = 1; // eth
const KLEROS_DISPUTE_TIMEOUT = 60; // seconds
const KLEROS_ARBITRATOR_EXTRADATA = '0x8575';
const KLEROS_SHOP_WINS = 1;
const KLEROS_CHALLENGER_WINS = 2;
const KLEROS_NO_RULING = 0;

const PASS = 'secret';

const ONE_HOUR = 60 * 60;
const ONE_DAY = ONE_HOUR * 24;
const BID_PERIOD = ONE_DAY;
const COOLDOWN_PERIOD = ONE_DAY * 2;

const COUNTRY = 'CG';
const ZONE_GEOHASH = 'krcztse';
const ZONE_GEOHASH_2 = 's246eee';
const SHOP_GEOHASH = 'krcztseeeeee';
const INITIAL_ETH_BALANCE = 7;
const INITIAL_DTH_BALANCE = 1000;
const SHOP_LICENSE_PRICE = 42;
const MIN_ZONE_STAKE = 100;

const SHOP: IShopArgs = {
  country: COUNTRY,
  position: SHOP_GEOHASH,
  // no need to specify the optional string args
};

const TELLER: ITellerArgs = {
  position: 'krcztsebcddd',
  currencyId: 1,
  messenger: 'my_telegram_nick',
  isSeller: true,
  sellRate: 177, // 17.7%
  isBuyer: true,
  buyRate: 1334, // 13.44%
};

const TELLER_2: ITellerArgs = {
  position: 's246eeerrrrr',
  currencyId: 1,
  messenger: 'my_telegram_nick',
  isSeller: false,
  sellRate: 0, // 17.7%
  isBuyer: true,
  buyRate: 7714, // 77.14%
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

  before(async () => {
    const detherJs = new DetherJS(false); // default is use ethersjs instead of metamask, pass in true as 1st arg for metamask
    await detherJs.init({ rpcURL: RPC_URL });
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
    await transaction.waitForTxMined(deployedContracts.GeoRegistry.connect(accounts.ceo).functions.setCountryTierDailyLimit(convert.asciiToHex(COUNTRY), '0', '1000')); // unregistered
    await transaction.waitForTxMined(deployedContracts.GeoRegistry.connect(accounts.ceo).functions.setCountryTierDailyLimit(convert.asciiToHex(COUNTRY), '1', '1000')); // tier 1
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
      describe('get live zone', () => {
        it('should succeed', async () => {

        });
      });
    });
    describe('setters', () => {
      describe('create zone', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH));
        });
      });
      describe('claim free zone', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH));
          await transaction.waitForTxMined(detherJs.releaseZone(PASS, ZONE_GEOHASH));
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.claimFreeZone(PASS, ZONE_GEOHASH));
        });
      });
      describe('bid on zone', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH));
          await timeTravel.inSecs(COOLDOWN_PERIOD + 1);
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.bidZone(PASS, ZONE_GEOHASH, convert.ethToWei(MIN_ZONE_STAKE + 10)));
        });
      });
      describe('topup zone owner DTH balance', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH));
          await transaction.waitForTxMined(detherJs.topUpZone(PASS, ZONE_GEOHASH, convert.ethToWei(50)));
        });
      });
      describe('release zone ownership', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH));
          await transaction.waitForTxMined(detherJs.releaseZone(PASS, ZONE_GEOHASH));
        });
      });
      describe('withdraw lost auction dth bid', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH));

          await timeTravel.inSecs(COOLDOWN_PERIOD + 1);

          // user2 start auction
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.bidZone(PASS, ZONE_GEOHASH, convert.ethToWei(MIN_ZONE_STAKE + 10)));

          // user1 (current zone owner) overbids user2 bid
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.bidZone(PASS, ZONE_GEOHASH, convert.ethToWei(20)));

          // auction ends
          await timeTravel.inSecs(BID_PERIOD + 1);

          const balanceDthBefore = await deployedContracts.DetherToken.balanceOf(accounts.user2.address);

          // user2 can withdraw his bid from the lost auction
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.withdrawZoneAuctionBid(PASS, ZONE_GEOHASH, '1'));

          const balanceDthAfter = await deployedContracts.DetherToken.balanceOf(accounts.user2.address);

          const bid1 = MIN_ZONE_STAKE + 10;
          expect(balanceDthAfter.sub(balanceDthBefore).lte(convert.ethToWei(bid1)));
          // there is a burn fee applied to the bid, so we expect a little less
          expect(balanceDthAfter.sub(balanceDthBefore).gt(convert.ethToWei(bid1 - 5)));
        });
      });
      describe('withdraw multiple lost auctions dth bid', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH));

          await timeTravel.inSecs(COOLDOWN_PERIOD + 1);

          // user2 start auction
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.bidZone(PASS, ZONE_GEOHASH, convert.ethToWei(MIN_ZONE_STAKE + 10)));

          // user1 (current zone owner) overbids user2 bid
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.bidZone(PASS, ZONE_GEOHASH, convert.ethToWei(20)));

          // auction ends
          await timeTravel.inSecs(BID_PERIOD + 1);

          // new auction can start
          await timeTravel.inSecs(COOLDOWN_PERIOD + 1);

          // user2 start auction
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.bidZone(PASS, ZONE_GEOHASH, convert.ethToWei(MIN_ZONE_STAKE + 30)));

          // user1 (current zone owner) overbids user2 bid
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.bidZone(PASS, ZONE_GEOHASH, convert.ethToWei(40)));

          // auction ends
          await timeTravel.inSecs(BID_PERIOD + 1);

          const balanceDthBefore = await deployedContracts.DetherToken.balanceOf(accounts.user2.address);

          // user2 can withdraw his bid from the 2 lost auctions
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.withdrawZoneAuctionsBid(PASS, ZONE_GEOHASH, ['1', '2']));

          const balanceDthAfter = await deployedContracts.DetherToken.balanceOf(accounts.user2.address);

          const bid1 = MIN_ZONE_STAKE + 10;
          const bid2 = MIN_ZONE_STAKE + 30;
          expect(balanceDthAfter.sub(balanceDthBefore).lte(convert.ethToWei(bid1 + bid2)));
          // there is a burn fee applied to each bid, so we expect a little less than all the bids we placed
          expect(balanceDthAfter.sub(balanceDthBefore).gt(convert.ethToWei(bid1 + bid2 - 5)));
        });
      });
      describe('withdraw previous zoneowner withdrawable DTH (= zone.balance - taxes)', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH));

          await timeTravel.inSecs(COOLDOWN_PERIOD + 1);

          // user2 start auction
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.bidZone(PASS, ZONE_GEOHASH, convert.ethToWei(MIN_ZONE_STAKE + 10)));

          // auction ends
          await timeTravel.inSecs(BID_PERIOD + 1);

          const balanceDthBefore = await deployedContracts.DetherToken.balanceOf(accounts.user1.address);

          // user1 can withdraw his zone owner withdrawable dth, which ishis stake minus taxes paid
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.withdrawZoneOwnerDth(PASS, ZONE_GEOHASH));

          const balanceDthAfter = await deployedContracts.DetherToken.balanceOf(accounts.user1.address);

          expect(balanceDthAfter.gt(balanceDthBefore));
        });
      });

      describe.skip('withdraw previous zoneowner withdrawable ETH (=teller funds)', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH));

          await timeTravel.inSecs(COOLDOWN_PERIOD + 1);

          // user2 start auction
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.bidZone(PASS, ZONE_GEOHASH, convert.ethToWei(MIN_ZONE_STAKE + 10)));

          // auction ends
          await timeTravel.inSecs(BID_PERIOD + 1);

          const balanceDthBefore = await deployedContracts.DetherToken.balanceOf(accounts.user1.address);

          // user1 can withdraw his zone owner withdrawable dth, which ishis stake minus taxes paid
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.withdrawZoneOwnerDth(PASS, ZONE_GEOHASH));

          const balanceDthAfter = await deployedContracts.DetherToken.balanceOf(accounts.user1.address);

          expect(balanceDthAfter.gt(balanceDthBefore));
        });
      });
    });
  });

  describe('tellers', () => {
    beforeEach(async () => {
      detherJs.loadUser(await accounts.user1.encrypt(PASS));
      await transaction.waitForTxMined(detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH));
    });
    describe('getters', () => {
      describe('get teller by zone geohash', () => {
        it('should succeed', async () => {
          await transaction.waitForTxMined(detherJs.addTeller(PASS, TELLER));
          const result = await detherJs.getTellerInZone(ZONE_GEOHASH);
          expect(result).to.deep.include({
            isSeller: TELLER.isSeller,
            isBuyer: TELLER.isBuyer,
            currencyId: TELLER.currencyId,
            tellerGeohash: TELLER.position,
            zoneGeohash: TELLER.position.slice(0, 7),
            messenger: TELLER.messenger,
            buyRate: TELLER.buyRate,
            sellRate: TELLER.sellRate,
            funds: 0,
            referrer: undefined,
            // TODO: .zoneAddress is not verified
          });
        });
      });
      describe('get tellers in zones', () => {
        it('should succeed', async () => {
          await transaction.waitForTxMined(detherJs.addTeller(PASS, TELLER));
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH_2));
          await transaction.waitForTxMined(detherJs.addTeller(PASS, TELLER_2));
          const result = await detherJs.getTellersInZones([ZONE_GEOHASH, ZONE_GEOHASH_2]);
          expect(result[0]).to.deep.include({
            isSeller: TELLER.isSeller,
            isBuyer: TELLER.isBuyer,
            currencyId: TELLER.currencyId,
            tellerGeohash: TELLER.position,
            zoneGeohash: TELLER.position.slice(0, 7),
            messenger: TELLER.messenger,
            buyRate: TELLER.buyRate,
            sellRate: TELLER.sellRate,
            funds: 0,
            referrer: undefined,
            // TODO: .zoneAddress is not verified
          });
          expect(result[1]).to.deep.include({
            isSeller: TELLER_2.isSeller,
            isBuyer: TELLER_2.isBuyer,
            currencyId: TELLER_2.currencyId,
            tellerGeohash: TELLER_2.position,
            zoneGeohash: TELLER_2.position.slice(0, 7),
            messenger: TELLER_2.messenger,
            buyRate: TELLER_2.buyRate,
            sellRate: TELLER_2.sellRate,
            funds: 0,
            referrer: undefined,
            // TODO: .zoneAddress is not verified
          });
        });
      });
    });
    describe('setters', () => {
      describe('create teller', () => {
        it('should succeed', async () => {
          await transaction.waitForTxMined(detherJs.addTeller(PASS, TELLER));
        });
      });
      describe('remove teller', () => {
        it('should succeed', async () => {
          await transaction.waitForTxMined(detherJs.addTeller(PASS, TELLER));
          await transaction.waitForTxMined(detherJs.removeTeller(PASS, ZONE_GEOHASH));
        });
      });
      describe('add funds to teller', () => {
        it('should succeed', async () => {
          await transaction.waitForTxMined(detherJs.addTeller(PASS, TELLER));
          await transaction.waitForTxMined(detherJs.addTellerFunds(PASS, ZONE_GEOHASH, convert.ethToWei(1)));
        });
      });
      describe('sell eth from teller', () => {
        it('should succeed', async () => {
          await transaction.waitForTxMined(detherJs.addTeller(PASS, TELLER));
          await transaction.waitForTxMined(detherJs.addTellerFunds(PASS, ZONE_GEOHASH, convert.ethToWei(1)));
          await transaction.waitForTxMined(detherJs.sellTellerEth(PASS, ZONE_GEOHASH, accounts.user3.address, convert.ethToWei(1)));
        });
      });
      describe('add comment on teller', () => {
        it('should succeed', async () => {
          await transaction.waitForTxMined(detherJs.addTeller(PASS, TELLER));
          detherJs.loadUser(await accounts.user3.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.addTellerComment(PASS, ZONE_GEOHASH, ipfs.getRandomIpfsHash()));
        });
      });
      describe('add certified comment after trafed with teller', () => {
        it('should succeed', async () => {
          it('should succeed', async () => {
            await transaction.waitForTxMined(detherJs.addTeller(PASS, TELLER));
            await transaction.waitForTxMined(detherJs.addTellerFunds(PASS, ZONE_GEOHASH, convert.ethToWei(1)));
            await transaction.waitForTxMined(detherJs.sellTellerEth(PASS, ZONE_GEOHASH, accounts.user3.address, convert.ethToWei(1)));
            detherJs.loadUser(await accounts.user3.encrypt(PASS));
            await transaction.waitForTxMined(detherJs.addTellerCertifiedComment(PASS, ZONE_GEOHASH, ipfs.getRandomIpfsHash()));
          });
        });
      });
    });
  });

  describe('shops', () => {
    describe('getters', () => {
      describe('shop exists', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.addShop(PASS, SHOP));
          const result = await detherJs.shopExistsByAddress(accounts.user1.address);
          expect(result).to.be.true;
        });
      });
      describe('get shop by address', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.addShop(PASS, SHOP));
          const result = await detherJs.getShopByAddress(accounts.user1.address);
          expect(result).to.deep.equal({
            position: SHOP.position,
            zoneGeohash: SHOP.position.slice(0, 7),
            hasDispute: false,
            staked: convert.ethToWei(SHOP_LICENSE_PRICE),
            category: undefined,
            name: undefined,
            description: undefined,
            opening: undefined,
            disputeID: undefined,
          });
        });
      });
      describe('get shop by position', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.addShop(PASS, SHOP));
          const result = await detherJs.getShopByPosition(SHOP.position);
          expect(result).to.deep.equal({
            position: SHOP.position,
            zoneGeohash: SHOP.position.slice(0, 7),
            hasDispute: false,
            staked: convert.ethToWei(SHOP_LICENSE_PRICE),
            category: undefined,
            name: undefined,
            description: undefined,
            opening: undefined,
            disputeID: undefined,
          });
        });
      });
      describe('get shops in zone', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.addShop(PASS, SHOP));
          const result = await detherJs.getShopsInZone(SHOP.position.slice(0, 7));
          expect(result).to.be.an('array').with.lengthOf(1);
          expect(result[0]).to.deep.equal({
            position: SHOP.position,
            zoneGeohash: SHOP.position.slice(0, 7),
            hasDispute: false,
            staked: convert.ethToWei(SHOP_LICENSE_PRICE),
            category: undefined,
            name: undefined,
            description: undefined,
            opening: undefined,
            disputeID: undefined,
          });
        });
      });
      describe('get current shop dispute', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.addShop(PASS, SHOP));
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.createShopDispute(PASS, accounts.user1.address, ipfs.getRandomIpfsHash()));
          await deployedContracts.appealableArbitrator.connect(accounts.deployer).functions.giveRuling('0', KLEROS_CHALLENGER_WINS); // dispute 0, shop wins
          const result = await detherJs.getShopDispute(accounts.user1.address);

          expect(result).to.deep.equal({
            id: 0,
            shop: accounts.user1.address,
            challenger: accounts.user2.address,
            disputeType: 0,
            ruling: ShopDisputeRuling.ChallengerWins,
            status: ShopDisputeStatus.Appealable,
          });
        });
      });
      describe('get dispute create cost', () => {
        it('should succeed', async () => {
          const costWei = await detherJs.getShopDisputeCreateCost();
          expect(costWei).to.equal(convert.ethToWei(KLEROS_ARBITRATION_PRICE * 2));
        });
      });
      describe('get dispute appeal cost', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.addShop(PASS, SHOP));
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.createShopDispute(PASS, accounts.user1.address, ipfs.getRandomIpfsHash()));
          const costWei = await detherJs.getShopDisputeAppealCost(accounts.user1.address);
          expect(costWei).to.equal(convert.ethToWei(KLEROS_ARBITRATION_PRICE));
        });
      });
    });
    describe('setters', () => {
      describe('create shop', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.addShop(PASS, SHOP));
        });
      });
      describe('remove shop', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.addShop(PASS, SHOP));
          await transaction.waitForTxMined(detherJs.removeShop(PASS));
        });
      });
      describe('create dispute', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.addShop(PASS, SHOP));
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.createShopDispute(PASS, accounts.user1.address, ipfs.getRandomIpfsHash()));
        });
      });
      describe('appeal dispute', () => {
        it('should succeed', async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.addShop(PASS, SHOP));
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.createShopDispute(PASS, accounts.user1.address, ipfs.getRandomIpfsHash()));
          await deployedContracts.appealableArbitrator.connect(accounts.deployer).functions.giveRuling('0', KLEROS_CHALLENGER_WINS); // dispute 0, shop wins
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(detherJs.appealShopDispute(PASS, accounts.user1.address, ipfs.getRandomIpfsHash()));
        });
      });
    });
  });
});
