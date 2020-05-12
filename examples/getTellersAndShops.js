const ethers = require("ethers");
const Geohash = require("latlon-geohash");
import DetherJS from "../lib/dether";

require("dotenv").config();

const INFURA_KEY = process.env.INFURA_KEY;
const rpcURL = `https://kovan.infura.io/v3/${INFURA_KEY}`;

const geoHashes6 = [
  "xn0m7h",
  "xn0m7k",
  "xn0me1",
  "xn0m76",
  "xn0m74",
  "xn0m6f",
  "xn0m6g",
  "xn0m6u",
];

const provider = new ethers.providers.JsonRpcProvider(rpcURL);

const isZoneTeller = async () => {
  const address = "0xc4378a241C784fD8D3B3E36b3B70AC477d0bC4Cb";
  const detherJs = new DetherJS(false);
  await detherJs.init({ rpcURL });
  console.log(await detherJs.isZoneOwner(address));
  console.log(await detherJs.isTeller(address));
};

const getZones = async () => {
  const detherJs = new DetherJS(false);
  await detherJs.init({ rpcURL });
  console.log(await detherJs.getZonesStatus(geoHashes6));
};

const getWithdrawable = async () => {
  const detherJs = new DetherJS(false);
  await detherJs.init({ rpcURL });
  console.log(
    await detherJs.withdrawAvailable(
      //   "0x177e9F048201F765E658DF90Cb3cd691A40b62E8"
      "0x6F870cdCBAFA4c96f6E1cc1abff736e8f3A824be"
    )
  );
};

const getTellers = async () => {
  const detherJs = new DetherJS(false);
  await detherJs.init({ rpcURL });
  const tellers = await detherJs.getTellersInZones(geoHashes6, provider);
  console.log("Tellers", tellers);
};

const getTeller = async () => {
  const detherJs = new DetherJS(false);
  await detherJs.init({ rpcURL });
  const tellers = await detherJs.getTellerInZone("xn0me1", provider);
  console.log("Teller", tellers);
};

const getShops = async () => {
  const detherJs = new DetherJS(false);
  await detherJs.init({ rpcURL });
  const shops = await detherJs.getShopsInZones(geoHashes6, provider);
  console.log("shops", shops);
};

const getZoneByGeohash = async () => {
  const detherJs = new DetherJS(false);
  await detherJs.init({ rpcURL });
  const zone = await detherJs.getZoneByGeohash(geoHashes6[0], provider);
  console.log("Zone", zone);
};

const getArrayOfGeohash = async () => {
  const detherJs = new DetherJS(false);
  await detherJs.init({ rpcURL });
  const latLng = Geohash.decode(geoHashes6[0]);
  console.log("From my know geohash I get a lat lon to test with", latLng);
  const geoHash = Geohash.encode(latLng.lat, latLng.lon, 6);
  console.log("From my lat lon, I get my geohash back", geoHash, geoHashes6[0]);
  const neighboursGeohash = Geohash.neighbours(geoHash);
  console.log("Get all geohashes around", neighboursGeohash);
  const tellers = await detherJs.getTellersInZones(geoHashes6, provider);
  console.log("Tellers present in these 9 zones", tellers);
};
// getTellers();
// getShops();
getZoneByGeohash();
// getTeller();
// getArrayOfGeohash();
// getZones();
// isZoneTeller();
// getWithdrawable();
