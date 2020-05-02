/* eslint-disable object-curly-newline, max-len, padded-blocks, global-require, no-multi-spaces, no-restricted-syntax, no-await-in-loop, arrow-body-style, no-new, no-empty */
/* eslint-env node, mocha */
// import path from 'path';
import assert from "assert";
import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import Web3 from "web3";

import expect from "./utils/chai";
import TimeTravel from "./utils/timeTravel";
import * as convert from "./utils/convert";
// import * as evmErrors from './utils/evmErrors';
import * as ipfs from "./utils/ipfs";
// import * as values from './utils/values';
import * as transaction from "./utils/transaction";
import * as geo from "./utils/geo";

import DetherTokenJson from "../abi/dether/DetherToken.json";
import UsersJson from "../abi/dether/Users.json";
import GeoRegistryJson from "../abi/dether/GeoRegistry.json";
import ZoneFactoryJson from "../abi/dether/ZoneFactory.json";
import ZoneJson from "../abi/dether/Zone.json";
import ShopsJson from "../abi/dether/Shops.json";
import TellerJson from "../abi/dether/Teller.json";
import ShopDisputeJson from "../abi/dether/ShopDispute.json";
import AppealableArbitratorJson from "../abi/dether/AppealableArbitrator.json";
import CertifierRegistryJson from "../abi/dether/CertifierRegistry.json";
import TaxCollectorJson from "../abi/dether/TaxCollector.json";

import DetherJS from "../src/dether";

import {
  ITellerArgs,
  IShopArgs,
  DetherContract,
  ExternalContract,
  ZoneStatus,
} from "../src/types";
import { CALL_EXCEPTION } from "ethers/errors";

const contractJson: any = {
  [DetherContract.DetherToken]: DetherTokenJson,
  [DetherContract.Users]: UsersJson,
  [DetherContract.GeoRegistry]: GeoRegistryJson,
  [DetherContract.ZoneFactory]: ZoneFactoryJson,
  [DetherContract.Zone]: ZoneJson,
  [DetherContract.Shops]: ShopsJson,
  //[DetherContract.ShopDispute]: ShopDisputeJson,
  [DetherContract.Teller]: TellerJson,
  [DetherContract.CertifierRegistry]: CertifierRegistryJson,
  [DetherContract.TaxCollector]: TaxCollectorJson,
  // [ExternalContract.appealableArbitrator]: AppealableArbitratorJson,
};

assert(process.env.PRIVATE_KEY, "missing env var PRIVATE_KEY");

const web3 = new Web3("http://0.0.0.0:8545");
const timeTravel = new TimeTravel(web3);

const RPC_URL = "http://0.0.0.0:8545";
// const TEST_PASS = 'test123';

const KLEROS_ARBITRATION_PRICE = 1; // eth
const KLEROS_DISPUTE_TIMEOUT = 60; // seconds
const KLEROS_ARBITRATOR_EXTRADATA = "0x8575";
const KLEROS_SHOP_WINS = 1;
const KLEROS_CHALLENGER_WINS = 2;
const KLEROS_NO_RULING = 0;

const PASS = "secret";

const ONE_HOUR = 60 * 60;
const ONE_DAY = ONE_HOUR * 24;
const BID_PERIOD = ONE_DAY;
const COOLDOWN_PERIOD = ONE_DAY * 2;

const COUNTRY = "CG";
const ZONE_GEOHASH = "krczts";
const ZONE_GEOHASH_2 = "s246ee";
const SHOP_GEOHASH = "krcztseeeeee";
const INITIAL_ETH_BALANCE = 7;
const INITIAL_DTH_BALANCE = 1000;
const SHOP_LICENSE_PRICE = 42;
const MIN_ZONE_STAKE = 103; // for testing, because real min zone stake is 100
const TELLER_TIER = 1;

const SHOP: IShopArgs = {
  country: COUNTRY,
  position: SHOP_GEOHASH,
  staking: SHOP_LICENSE_PRICE.toString(),
  // no need to specify the optional string args
};

const TELLER: ITellerArgs = {
  position: "krcztsebcddd",
  currencyId: 1,
  messenger: "my_telegram_nick",
  isSeller: true,
  sellRate: 177, // 17.7%
  isBuyer: true,
  buyRate: 1334, // 13.44%
  referrer: "0x0000000000000000000000000000000000000000",
  refFees: 210,
  description: "BTC-XMR",
};

const TELLER_2: ITellerArgs = {
  position: "s246eeerrrrr",
  currencyId: 1,
  messenger: "my_telegram_nick",
  isSeller: false,
  sellRate: 0, // 17.7%
  isBuyer: true,
  buyRate: 7714, // 77.14%
  referrer: "0x0000000000000000000000000000000000000000",
  refFees: 210,
  description: "BTC-XMR",
};

// eslint-disable-next-line prefer-template
describe("DetherJS", () => {
  let rootState: any;
  let detherJs: any;
  const accounts: any = {};
  const deployedContracts: any = {};

  let deployerBalanceBeforeDeploy: BigNumber;
  let deployerBalanceAfterDeploy: BigNumber;
  let deployerBalanceAfterInit: BigNumber;

  const sendEth = async (
    fromWallet: ethers.Wallet,
    ethAmount: number,
    toAddress: string
  ): Promise<any> =>
    transaction.waitForTxMined(
      fromWallet.sendTransaction({
        to: toAddress,
        value: convert.ethToWeiBN(ethAmount),
      })
    );

  const sendDth = async (
    fromWallet: ethers.Wallet,
    dthAmount: number,
    toAddress: string
  ): Promise<any> =>
    // @ts-ignore
    transaction.waitForTxMined(
      deployedContracts.DetherToken.connect(fromWallet).mint(
        toAddress,
        convert.ethToWeiBN(dthAmount)
      )
    );

  const deployContract = async (
    wallet: ethers.Wallet,
    contractName: DetherContract | ExternalContract,
    ...args: any[]
  ) => {
    const contractInfo: any = contractJson[contractName];
    const factory = new ethers.ContractFactory(
      contractInfo.abi,
      contractInfo.bytecode,
      wallet
    );
    const contract = await factory.deploy(...args);
    await contract.deployed();
    deployedContracts[contractName] = contract;
  };

  const printEth = async () =>
    console.log("eth", {
      deployer: convert.weiToEth(
        (await accounts.deployer.getBalance()).toString()
      ),
      ceo: convert.weiToEth((await accounts.ceo.getBalance()).toString()),
      user1: convert.weiToEth((await accounts.user1.getBalance()).toString()),
      user2: convert.weiToEth((await accounts.user2.getBalance()).toString()),
      user3: convert.weiToEth((await accounts.user3.getBalance()).toString()),
      user4: convert.weiToEth((await accounts.user4.getBalance()).toString()),
    });

  const printDth = async () =>
    console.log("dth", {
      deployer: convert.weiToEth(
        (
          await deployedContracts.DetherToken.balanceOf(
            accounts.deployer.address
          )
        ).toString()
      ),
      ceo: convert.weiToEth(
        (
          await deployedContracts.DetherToken.balanceOf(accounts.ceo.address)
        ).toString()
      ),
      user1: convert.weiToEth(
        (
          await deployedContracts.DetherToken.balanceOf(accounts.user1.address)
        ).toString()
      ),
      user2: convert.weiToEth(
        (
          await deployedContracts.DetherToken.balanceOf(accounts.user2.address)
        ).toString()
      ),
      user3: convert.weiToEth(
        (
          await deployedContracts.DetherToken.balanceOf(accounts.user3.address)
        ).toString()
      ),
      user4: convert.weiToEth(
        (
          await deployedContracts.DetherToken.balanceOf(accounts.user4.address)
        ).toString()
      ),
    });

  // before(async () => {
  //   console.log("start test");
  //   const detherJs = new DetherJS(false); // default is use ethersjs instead of metamask, pass in true as 1st arg for metamask
  //   await detherJs.init({ rpcURL: RPC_URL });
  //   console.log("init test");
  //   rootState = await timeTravel.saveState();
  // });
  after(async () => {
    await timeTravel.revertState(rootState); // to go back to real time
  });
  beforeEach(async () => {
    detherJs = new DetherJS(false); // default is use ethersjs instead of metamask, pass in true as 1st arg for metamask
    await detherJs.initProvider({ rpcURL: RPC_URL });

    await timeTravel.revertState(rootState); // to go back to real time

    // NOTE: create everything new before each test

    //
    // reload the root account (== ganache first created account)
    //
    const ROOT_ACCOUNT = new ethers.Wallet(
      process.env.PRIVATE_KEY,
      detherJs.provider
    );

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
    await deployContract(accounts.deployer, DetherContract.GeoRegistry);
    await deployContract(accounts.deployer, DetherContract.CertifierRegistry);
    await deployContract(accounts.deployer, DetherContract.Zone);
    await deployContract(
      accounts.deployer,
      DetherContract.Users,
      deployedContracts.GeoRegistry.address,
      deployedContracts.CertifierRegistry.address
    );
    await deployContract(accounts.deployer, DetherContract.Teller);
    await deployContract(
      accounts.deployer,
      DetherContract.TaxCollector,
      deployedContracts.DetherToken.address,
      "0x0000000000000000000000000000000000000000"
    );

    await deployContract(
      // deploy ZoneFactory
      accounts.deployer,
      DetherContract.ZoneFactory,
      deployedContracts.DetherToken.address,
      deployedContracts.GeoRegistry.address,
      deployedContracts.Users.address, // User
      deployedContracts.Zone.address,
      deployedContracts.Teller.address,
      deployedContracts.TaxCollector.address
    );

    await deployContract(
      // deploy Shops
      accounts.deployer,
      DetherContract.Shops,
      deployedContracts.DetherToken.address,
      deployedContracts.GeoRegistry.address,
      deployedContracts.Users.address,
      deployedContracts.ZoneFactory.address
    );

    deployerBalanceAfterDeploy = await accounts.deployer.getBalance(); // returns wei as BigNumber
    //
    // init Dapp
    //

    await transaction.waitForTxMined(
      deployedContracts.Users.connect(
        accounts.deployer
      ).functions.setZoneFactory(deployedContracts.ZoneFactory.address)
    );

    deployerBalanceAfterInit = await accounts.deployer.getBalance(); // returns wei as BigNumber
    //
    // add country CG
    //
    await geo.addCountry(accounts.ceo, deployedContracts.GeoRegistry, COUNTRY);
    await transaction.waitForTxMined(
      deployedContracts.GeoRegistry.connect(
        accounts.deployer
      ).functions.endInit(convert.asciiToHex(COUNTRY))
    );

    //
    // give DTH to all created accounts
    //
    await sendDth(
      accounts.deployer,
      INITIAL_DTH_BALANCE,
      accounts.deployer.address
    ); // need to mint for ourselves
    await sendDth(accounts.deployer, INITIAL_DTH_BALANCE, accounts.ceo.address);
    await sendDth(
      accounts.deployer,
      INITIAL_DTH_BALANCE,
      accounts.user1.address
    );
    await sendDth(
      accounts.deployer,
      INITIAL_DTH_BALANCE,
      accounts.user2.address
    );
    await sendDth(
      accounts.deployer,
      INITIAL_DTH_BALANCE,
      accounts.user3.address
    );
    await sendDth(
      accounts.deployer,
      INITIAL_DTH_BALANCE,
      accounts.user4.address
    );
    //
    // hookup detherJs to the just deployed+inited Dapp contracts
    //
    await detherJs.setCustomContractAddresses({
      DetherToken: deployedContracts.DetherToken.address,
      GeoRegistry: deployedContracts.GeoRegistry.address,
      // Users: deployedContracts.Users.address,
      ZoneFactory: deployedContracts.ZoneFactory.address,
      Zone: deployedContracts.Zone.address,
      Shops: deployedContracts.Shops.address,
      // ShopDispute: deployedContracts.ShopDispute.address,
      // CertifierRegistry: deployedContracts.CertifierRegistry.address,
      TaxCollector: deployedContracts.TaxCollector.address,
    });
    await detherJs.init({ rpcURL: RPC_URL });
  });

  describe("zone", () => {
    describe("getters", () => {
      describe("get live zone", () => {
        it("should succeed", async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          const tx = await transaction.waitForTxMined(
            detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH, MIN_ZONE_STAKE, {
              gasLimit: 2000000,
            })
          );
          const zone = await detherJs.getZoneByGeohash(ZONE_GEOHASH);
          expect(zone).to.deep.include({
            geohash: ZONE_GEOHASH,
            status: ZoneStatus.Occupied,
            auction: undefined,
          });

          expect(zone.owner).to.deep.include({
            address: accounts.user1.address,
            staked: MIN_ZONE_STAKE,
            balance: MIN_ZONE_STAKE,
            auctionId: undefined,
          });
        });
      });
    });
    describe("setters", () => {
      describe("create zone", () => {
        it("should succeed", async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH, MIN_ZONE_STAKE, {
              gasLimit: 2000000,
            })
          );
        });
      });
      describe("claim free zone", () => {
        it("should succeed", async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH, MIN_ZONE_STAKE, {
              gasLimit: 2000000,
            })
          );
          const tx = await transaction.waitForTxMined(
            detherJs.releaseZone(PASS, ZONE_GEOHASH, { gasLimit: 2000000 })
          );
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.claimFreeZone(PASS, ZONE_GEOHASH, { gasLimit: 2000000 })
          );
        });
      });
      describe("bid on zone", () => {
        it("should succeed", async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH, MIN_ZONE_STAKE, {
              gasLimit: 2000000,
            })
          );
          await timeTravel.inSecs(COOLDOWN_PERIOD + 1);
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.bidZone(PASS, ZONE_GEOHASH, MIN_ZONE_STAKE + 10, {
              gasLimit: 2000000,
            })
          );
        });
      });
      describe("topup zone owner DTH balance", () => {
        it("should succeed", async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH, MIN_ZONE_STAKE, {
              gasLimit: 2000000,
            })
          );
          await transaction.waitForTxMined(
            detherJs.topUpZone(PASS, ZONE_GEOHASH, convert.ethToWei(50), {
              gasLimit: 2000000,
            })
          );
        });
      });
      describe("release zone ownership", () => {
        it("should succeed", async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH, MIN_ZONE_STAKE, {
              gasLimit: 2000000,
            })
          );
          await transaction.waitForTxMined(
            detherJs.releaseZone(PASS, ZONE_GEOHASH, { gasLimit: 2000000 })
          );
        });
      });
      describe("withdraw lost auction dth bid", () => {
        it("should succeed", async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH, MIN_ZONE_STAKE, {
              gasLimit: 2000000,
            })
          );

          await timeTravel.inSecs(COOLDOWN_PERIOD + 1);

          // user2 start auction
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.bidZone(PASS, ZONE_GEOHASH, MIN_ZONE_STAKE + 10, {
              gasLimit: 2000000,
            })
          );

          // user1 (current zone owner) overbids user2 bid
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.bidZone(PASS, ZONE_GEOHASH, 20, { gasLimit: 2000000 })
          );

          // auction ends
          await timeTravel.inSecs(BID_PERIOD + 1);

          const balanceDthBefore = await deployedContracts.DetherToken.balanceOf(
            accounts.user2.address
          );

          // user2 can withdraw his bid from the lost auction
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.withdrawZoneAuctionBid(PASS, ZONE_GEOHASH, "1", {
              gasLimit: 2000000,
            })
          );

          const balanceDthAfter = await deployedContracts.DetherToken.balanceOf(
            accounts.user2.address
          );

          const bid1 = MIN_ZONE_STAKE + 10;
          expect(
            balanceDthAfter.sub(balanceDthBefore).lte(convert.ethToWei(bid1))
          );
          // there is a burn fee applied to the bid, so we expect a little less
          expect(
            balanceDthAfter.sub(balanceDthBefore).gt(convert.ethToWei(bid1 - 5))
          );
        });
      });
      describe.skip("withdraw multiple lost auctions dth bid", () => {
        // it("should succeed", async () => {
        //   detherJs.loadUser(await accounts.user1.encrypt(PASS));
        //   await transaction.waitForTxMined(
        //     detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH, MIN_ZONE_STAKE, {
        //       gasLimit: 2000000,
        //     })
        //   );
        //   await timeTravel.inSecs(COOLDOWN_PERIOD + 1);
        //   // user2 start auction
        //   detherJs.loadUser(await accounts.user2.encrypt(PASS));
        //   await transaction.waitForTxMined(
        //     detherJs.bidZone(PASS, ZONE_GEOHASH, MIN_ZONE_STAKE + 10, {
        //       gasLimit: 2000000,
        //     })
        //   );
        //   // user1 (current zone owner) overbids user2 bid
        //   detherJs.loadUser(await accounts.user1.encrypt(PASS));
        //   await transaction.waitForTxMined(
        //     detherJs.bidZone(PASS, ZONE_GEOHASH, 20, { gasLimit: 2000000 })
        //   );
        //   // auction ends
        //   await timeTravel.inSecs(BID_PERIOD + 1);
        //   // new auction can start
        //   await timeTravel.inSecs(COOLDOWN_PERIOD + 1);
        //   // user2 start auction
        //   detherJs.loadUser(await accounts.user2.encrypt(PASS));
        //   await transaction.waitForTxMined(
        //     detherJs.bidZone(PASS, ZONE_GEOHASH, MIN_ZONE_STAKE + 30, {
        //       gasLimit: 2000000,
        //     })
        //   );
        //   // user1 (current zone owner) overbids user2 bid
        //   detherJs.loadUser(await accounts.user1.encrypt(PASS));
        //   await transaction.waitForTxMined(
        //     detherJs.bidZone(PASS, ZONE_GEOHASH, 40, { gasLimit: 2000000 })
        //   );
        //   // auction ends
        //   await timeTravel.inSecs(BID_PERIOD + 1);
        //   const balanceDthBefore = await deployedContracts.DetherToken.balanceOf(
        //     accounts.user2.address
        //   );
        //   // user2 can withdraw his bid from the 2 lost auctions
        //   detherJs.loadUser(await accounts.user2.encrypt(PASS));
        //   await transaction.waitForTxMined(
        //     detherJs.withdrawZoneAuctionsBid(PASS, ZONE_GEOHASH, ["1", "2"], {
        //       gasLimit: 2000000,
        //     })
        //   );
        //   console.log("test 5");
        //   const balanceDthAfter = await deployedContracts.DetherToken.balanceOf(
        //     accounts.user2.address
        //   );
        //   const bid1 = MIN_ZONE_STAKE + 10;
        //   const bid2 = MIN_ZONE_STAKE + 30;
        //   expect(
        //     balanceDthAfter
        //       .sub(balanceDthBefore)
        //       .lte(convert.ethToWei(bid1 + bid2))
        //   );
        //   // there is a burn fee applied to each bid, so we expect a little less than all the bids we placed
        //   expect(
        //     balanceDthAfter
        //       .sub(balanceDthBefore)
        //       .gt(convert.ethToWei(bid1 + bid2 - 5))
        //   );
        // });
      });
      describe("withdraw previous zoneowner withdrawable DTH (= zone.balance - taxes)", () => {
        it("should succeed", async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH, MIN_ZONE_STAKE, {
              gasLimit: 2000000,
            })
          );

          await timeTravel.inSecs(COOLDOWN_PERIOD + 1);

          // user2 start auction
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.bidZone(PASS, ZONE_GEOHASH, MIN_ZONE_STAKE + 10, {
              gasLimit: 2000000,
            })
          );

          // auction ends
          await timeTravel.inSecs(BID_PERIOD + 1);

          const balanceDthBefore = await deployedContracts.DetherToken.balanceOf(
            accounts.user1.address
          );

          // user1 can withdraw his zone owner withdrawable dth, which ishis stake minus taxes paid
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.withdrawZoneOwnerDth(PASS, ZONE_GEOHASH, {
              gasLimit: 2000000,
            })
          );

          const balanceDthAfter = await deployedContracts.DetherToken.balanceOf(
            accounts.user1.address
          );

          expect(balanceDthAfter.gt(balanceDthBefore));
        });
      });

      describe("withdraw previous zoneowner withdrawable ETH (=teller funds)", () => {
        it("should succeed", async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH, MIN_ZONE_STAKE, {
              gasLimit: 2000000,
            })
          );

          await timeTravel.inSecs(COOLDOWN_PERIOD + 1);

          // user2 start auction
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.bidZone(PASS, ZONE_GEOHASH, MIN_ZONE_STAKE + 10, {
              gasLimit: 2000000,
            })
          );

          // auction ends
          await timeTravel.inSecs(BID_PERIOD + 1);

          const balanceDthBefore = await deployedContracts.DetherToken.balanceOf(
            accounts.user1.address
          );

          // user1 can withdraw his zone owner withdrawable dth, which ishis stake minus taxes paid
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.withdrawZoneOwnerDth(PASS, ZONE_GEOHASH, {
              gasLimit: 2000000,
            })
          );

          const balanceDthAfter = await deployedContracts.DetherToken.balanceOf(
            accounts.user1.address
          );

          expect(balanceDthAfter.gt(balanceDthBefore));
        });
      });
    });
  });

  describe("tellers", () => {
    beforeEach(async () => {
      detherJs.loadUser(await accounts.user1.encrypt(PASS));
      await transaction.waitForTxMined(
        detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH, MIN_ZONE_STAKE, {
          gasLimit: 2000000,
        })
      );
    });
    describe("getters", () => {
      describe("get teller by zone geohash", () => {
        it("should succeed", async () => {
          const tx = await transaction.waitForTxMined(
            detherJs.addTeller(PASS, TELLER, { gasLimit: 2000000 })
          );
          const result = await detherJs.getTellerInZone(ZONE_GEOHASH);
          expect(result).to.deep.include({
            isSeller: TELLER.isSeller,
            isBuyer: TELLER.isBuyer,
            currencyId: TELLER.currencyId,
            tellerGeohash: TELLER.position,
            zoneGeohash: TELLER.position.slice(0, 6),
            messenger: TELLER.messenger,
            // buyRate: TELLER.buyRate,
            // sellRate: TELLER.sellRate,
            tellerAddress: accounts.user1.address,
            // TODO: .zoneAddress is not verified
          });
        });
      });
      describe("get tellers in zones", () => {
        it("should succeed", async () => {
          await transaction.waitForTxMined(
            detherJs.addTeller(PASS, TELLER, { gasLimit: 2000000 })
          );
          detherJs.loadUser(await accounts.user2.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.createZone(PASS, COUNTRY, ZONE_GEOHASH_2, MIN_ZONE_STAKE, {
              gasLimit: 2000000,
            })
          );
          await transaction.waitForTxMined(
            detherJs.addTeller(PASS, TELLER_2, { gasLimit: 2000000 })
          );
          const result = await detherJs.getTellersInZones([
            ZONE_GEOHASH,
            ZONE_GEOHASH_2,
          ]);
          expect(result[0]).to.deep.include({
            isSeller: TELLER.isSeller,
            isBuyer: TELLER.isBuyer,
            currencyId: TELLER.currencyId,
            tellerGeohash: TELLER.position,
            zoneGeohash: TELLER.position.slice(0, 6),
            messenger: TELLER.messenger,
            // buyRate: TELLER.buyRate,
            // sellRate: TELLER.sellRate,
            tellerAddress: accounts.user1.address,
            // TODO: .zoneAddress is not verified
          });
          expect(result[1]).to.deep.include({
            isSeller: TELLER_2.isSeller,
            isBuyer: TELLER_2.isBuyer,
            currencyId: TELLER_2.currencyId,
            tellerGeohash: TELLER_2.position,
            zoneGeohash: TELLER_2.position.slice(0, 6),
            messenger: TELLER_2.messenger,
            // buyRate: TELLER_2.buyRate,
            // sellRate: TELLER_2.sellRate,
            tellerAddress: accounts.user2.address,
            // TODO: .zoneAddress is not verified
          });
        });
      });
    });
    describe("setters", () => {
      describe("create teller", () => {
        it("should succeed", async () => {
          await transaction.waitForTxMined(
            detherJs.addTeller(PASS, TELLER, { gasLimit: 2000000 })
          );
        });
      });
      describe("remove teller", () => {
        it("should succeed", async () => {
          await transaction.waitForTxMined(
            detherJs.addTeller(PASS, TELLER, { gasLimit: 2000000 })
          );
          await transaction.waitForTxMined(
            detherJs.removeTeller(PASS, ZONE_GEOHASH, { gasLimit: 2000000 })
          );
        });
      });
      describe("add comment on teller", () => {
        it("should succeed", async () => {
          await transaction.waitForTxMined(
            detherJs.addTeller(PASS, TELLER, { gasLimit: 2000000 })
          );
          detherJs.loadUser(await accounts.user3.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.addTellerComment(
              PASS,
              ZONE_GEOHASH,
              ipfs.getRandomIpfsHash(),
              { gasLimit: 2000000 }
            )
          );
        });
      });
    });
  });

  // TO DO test tax
  describe("shops", () => {
    describe("getters", () => {
      describe("get shop by address", () => {
        it("should succeed", async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.addShop(PASS, SHOP, { gasLimit: 2000000 })
          );
          const result = await detherJs.getShopByAddress(
            accounts.user1.address
          );

          expect(result.address).to.equal(accounts.user1.address);
          expect(result.position).to.equal(SHOP.position);
          expect(result.zoneGeohash).to.equal(SHOP.position.slice(0, 6));
          expect(result.hasDispute).to.equal(false);
          expect(result.category).to.equal(undefined);
          expect(result.name).to.equal("--");
          expect(result.description).to.equal("--");
          expect(result.opening).to.equal("WWWWWWWWWWWWWW");
          expect(result.disputeID).to.equal(undefined);
          expect(result.lastTaxTime).to.gt(1577836800); // timestamp greater than 01/01/2020
          expect(Number(result.staked)).to.gte(0);
          expect(Number(result.zonePrice)).to.gte(42);
        });
      });
      describe("get shop by position", () => {
        it("should succeed", async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.addShop(PASS, SHOP, { gasLimit: 2000000 })
          );
          const result = await detherJs.getShopByPosition(SHOP.position);
          expect(result.position).to.equal(SHOP.position);
          expect(result.zoneGeohash).to.equal(SHOP.position.slice(0, 6));
          expect(result.hasDispute).to.equal(false);
          expect(result.category).to.equal(undefined);
          expect(result.name).to.equal("--");
          expect(result.description).to.equal("--");
          expect(result.opening).to.equal("WWWWWWWWWWWWWW");
          expect(result.disputeID).to.equal(undefined);
          expect(result.lastTaxTime).to.gt(1577836800); // timestamp greater than 01/01/2020
          expect(Number(result.staked)).to.gte(0);
        });
      });
      describe("get shops in zone", () => {
        it("should succeed", async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.addShop(PASS, SHOP, { gasLimit: 2000000 })
          );
          const result = await detherJs.getShopsInZone(
            SHOP.position.slice(0, 6)
          );
          expect(result[0].position).to.equal(SHOP.position);
          expect(result[0].zoneGeohash).to.equal(SHOP.position.slice(0, 6));
          expect(result[0].hasDispute).to.equal(false);
          expect(result[0].category).to.equal(undefined);
          expect(result[0].name).to.equal("--");
          expect(result[0].description).to.equal("--");
          expect(result[0].opening).to.equal("WWWWWWWWWWWWWW");
          expect(result[0].disputeID).to.equal(undefined);
          expect(result[0].lastTaxTime).to.gt(1577836800); // timestamp greater than 01/01/2020
          expect(Number(result[0].staked)).to.gte(0);
          expect(Number(result[0].zonePrice)).to.gte(42);
        });
      });
    });
    describe("setters", () => {
      describe("create shop", () => {
        it("should succeed", async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.addShop(PASS, SHOP, { gasLimit: 2000000 })
          );
        });
      });
      describe("remove shop", () => {
        it("should succeed", async () => {
          detherJs.loadUser(await accounts.user1.encrypt(PASS));
          await transaction.waitForTxMined(
            detherJs.addShop(PASS, SHOP, { gasLimit: 2000000 })
          );
          await timeTravel.inSecs(BID_PERIOD + 1);
          await transaction.waitForTxMined(
            detherJs.removeShop(PASS, { gasLimit: 3000000 })
          );
        });
      });
    });
  });
});
